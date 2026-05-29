import { View, Text, ScrollView, TouchableOpacity, TextInput, StatusBar, Modal, Alert } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useWorkouts } from './hooks/useWorkouts';
import { useExercises } from './hooks/useExercises';
import { getSetsForWorkout } from './db/sets';
import { getAllExercises } from './db/exercises';
import { getWorkoutById } from './db/workouts';
import type { Exercise } from './db/exercises';

type LocalSet = {
  id: string;
  weight: string;
  reps: string;
  unit: 'kg' | 'lbs';
  loggedAt: Date | null;
};

type ExerciseBlock = {
  blockId: string;
  seedSetId: string | null;
  exercise: Exercise;
  sets: LocalSet[];
};


function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function WorkoutScreen() {
  const router = useRouter();
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const { finishWorkout, renameWorkout, addSet: persistSet, editSet, removeSet } = useWorkouts();
  const { exercises } = useExercises();

  const [blocks, setBlocks] = useState<ExerciseBlock[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [draft, setDraft] = useState({ weight: '', reps: '' });
  const startedAt = useRef(Date.now());

  // Reset draft whenever a new exercise takes the top spot
  const topBlockId = blocks[0]?.blockId;
  useEffect(() => { setDraft({ weight: '', reps: '' }); }, [topBlockId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Reconstruct exercise blocks from DB when resuming an existing workout
  useEffect(() => {
    if (!workoutId) return;
    Promise.all([
      getSetsForWorkout(workoutId),
      getAllExercises(),
      getWorkoutById(workoutId),
    ]).then(([dbSets, allExercises, workout]) => {
      // Restore timer to actual workout start time
      if (workout?.started_at) {
        startedAt.current = new Date(workout.started_at).getTime();
      }

      console.log('[resume] sets:', dbSets.length, '| exercises in lib:', allExercises.length);
      console.log('[resume] set exercise_ids:', dbSets.map((s) => s.exercise_id));
      console.log('[resume] exercise ids/names:', allExercises.map((e) => ({ id: e.id, name: e.name })));

      if (dbSets.length === 0) return;

      // Group sets by exercise_id, preserving insertion order
      const grouped = new Map<string, typeof dbSets>();
      for (const s of dbSets) {
        const key = s.exercise_id;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(s);
      }

      const reconstructed: ExerciseBlock[] = [];
      for (const [exId, exSets] of grouped) {
        const exercise = allExercises.find((e) => e.id === exId || e.name === exId);
        console.log('[resume] exId:', exId, '| matched exercise:', exercise?.name, '| sets:', exSets.length);
        if (!exercise) continue;
        const seedSetId = exSets.find((s) => s.logged_at === 'seed')?.id ?? null;
        const localSets: LocalSet[] = [...exSets].reverse().filter((s) => s.logged_at !== 'seed').map((s) => ({
          id: s.id,
          weight: s.weight ? String(s.weight) : '',
          reps: s.reps ? String(s.reps) : '',
          unit: s.unit as 'kg' | 'lbs',
          loggedAt: s.logged_at !== 'pending' ? new Date(s.logged_at) : null as Date | null,
        }));
        reconstructed.push({
          blockId: exId + '_' + Math.random().toString(36).slice(2),
          seedSetId,
          exercise,
          sets: localSets,
        });
      }

      reconstructed.reverse();
      console.log('[resume] reconstructed:', reconstructed.map((b) => ({ ex: b.exercise.name, sets: b.sets.length })));
      setBlocks(reconstructed);
    });
  }, [workoutId]);

  const handleFinish = async () => {
    if (workoutId) {
      await finishWorkout(workoutId, new Date().toISOString());
    }
    router.back();
  };

  const handleTitleBlur = useCallback(
    (title: string) => {
      if (workoutId) renameWorkout(workoutId, title);
    },
    [workoutId, renameWorkout],
  );

  const pickExercise = async (exercise: Exercise) => {
    // exercise.id may be null/undefined for exercises created before IDs were enforced
    const exerciseRef = exercise.id || exercise.name;
    let seedSetId: string | null = null;
    if (workoutId) {
      seedSetId = await persistSet({
        workout_id: workoutId,
        exercise_id: exerciseRef,
        reps: 0,
        difficulty: 0,
        weight: 0,
        unit: 'kg',
        logged_at: 'seed',
      });
    }
    setBlocks((prev) => [
      { blockId: Math.random().toString(36).slice(2), seedSetId, exercise, sets: [] },
      ...prev,
    ]);
    setPickerVisible(false);
    setSearch('');
  };

  const confirmDraft = async () => {
    const block = blocks[0];
    if (!block || !draft.weight.trim() || !draft.reps.trim()) return;
    const exerciseRef = block.exercise.id || block.exercise.name;
    const now = new Date();
    let newId = Math.random().toString(36).slice(2);
    if (workoutId) {
      newId = await persistSet({
        workout_id: workoutId,
        exercise_id: exerciseRef,
        reps: parseFloat(draft.reps) || 0,
        difficulty: 0,
        weight: parseFloat(draft.weight) || 0,
        unit: 'kg',
        logged_at: now.toISOString(),
      });
    }
    console.log('[set] created:', newId, 'exercise:', exerciseRef, 'weight:', draft.weight, 'reps:', draft.reps);
    const saved: LocalSet = { id: newId, weight: draft.weight, reps: draft.reps, unit: 'kg', loggedAt: now };
    setBlocks((prev) => prev.map((b, i) => (i === 0 ? { ...b, sets: [saved, ...b.sets] } : b)));
    setDraft({ weight: '', reps: '' });
  };

  const updateSetField = (blockIndex: number, setId: string, field: 'weight' | 'reps', value: string) => {
    setBlocks((prev) =>
      prev.map((b, i) =>
        i === blockIndex
          ? { ...b, sets: b.sets.map((s) => (s.id === setId ? { ...s, [field]: value } : s)) }
          : b,
      ),
    );
  };

  const saveSet = (blockIndex: number, setId: string) => {
    const set = blocks[blockIndex]?.sets.find((s) => s.id === setId);
    if (!set) return;
    editSet(setId, {
      reps: parseFloat(set.reps) || 0,
      difficulty: 0,
      weight: parseFloat(set.weight) || 0,
      unit: set.unit,
      logged_at: set.loggedAt ? set.loggedAt.toISOString() : 'pending',
    });
  };

  const handleDeleteSet = (blockIndex: number, setId: string) => {
    const block = blocks[blockIndex];
    const set = block?.sets.find((s) => s.id === setId);
    if (!set) return;
    const label = [set.weight && `${set.weight} kg`, set.reps && `${set.reps} reps`].filter(Boolean).join(' · ');
    Alert.alert('Delete Set', label || 'Delete this set?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          console.log('[set] deleted:', setId);
          await removeSet(setId);
          setBlocks((prev) =>
            prev.map((b, i) => (i === blockIndex ? { ...b, sets: b.sets.filter((s) => s.id !== setId) } : b)),
          );
        },
      },
    ]);
  };

  const handleDeleteBlock = (blockIndex: number) => {
    const block = blocks[blockIndex];
    Alert.alert(
      block.exercise.name,
      'Delete this exercise and all its sets?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (block.seedSetId) await removeSet(block.seedSetId);
            await Promise.all(block.sets.map((s) => removeSet(s.id)));
            setBlocks((prev) => prev.filter((_, i) => i !== blockIndex));
          },
        },
      ],
    );
  };

  const filtered = exercises.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#0c0c0e', borderBottomWidth: 1, borderBottomColor: '#18181b' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="chevron-down" size={26} color="#71717a" />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Text style={{ color: '#34d399', fontFamily: 'monospace', fontSize: 18, fontWeight: '600', letterSpacing: 2 }}>
            {formatElapsed(elapsed)}
          </Text>
          <TouchableOpacity onPress={handleFinish} style={{ backgroundColor: '#f4f4f5', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 7 }}>
            <Text style={{ color: '#09090b', fontWeight: '700', fontSize: 14 }}>Finish</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Workout title */}
        <View style={{ paddingHorizontal: 24, paddingVertical: 24 }}>
          <TextInput
            defaultValue=""
            placeholder="Workout name"
            placeholderTextColor="#3f3f46"
            onEndEditing={(e) => handleTitleBlur(e.nativeEvent.text)}
            style={{ color: '#fff', fontSize: 24, fontWeight: '700', backgroundColor: 'transparent' }}
          />
        </View>

        {/* Add exercise */}
        <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 }}>
          <TouchableOpacity
            onPress={() => setPickerVisible(true)}
            style={{ paddingVertical: 16, borderRadius: 12, borderWidth: 2, borderColor: '#27272a', borderStyle: 'dashed', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
          >
            <Ionicons name="add" size={18} color="#52525b" />
            <Text style={{ color: '#52525b', fontWeight: '600', fontSize: 15 }}>Add Exercise</Text>
          </TouchableOpacity>
        </View>

        {/* Empty state */}
        {blocks.length === 0 && (
          <View style={{ alignItems: 'center', paddingTop: 32, paddingBottom: 32 }}>
            <Ionicons name="barbell-outline" size={48} color="#27272a" />
            <Text style={{ color: '#52525b', fontSize: 16, fontWeight: '500', marginTop: 16 }}>No exercises yet</Text>
          </View>
        )}

        {/* Exercise blocks */}
        {blocks.map((block, blockIndex) => (
          <View key={block.blockId} style={{ paddingHorizontal: 16, marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, marginBottom: 12 }}>
              <Text style={{ color: '#34d399', fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.8, flex: 1 }}>
                {block.exercise.name}
              </Text>
              <TouchableOpacity onPress={() => handleDeleteBlock(blockIndex)}>
                <Ionicons name="trash-outline" size={18} color="#71717a" />
              </TouchableOpacity>
            </View>

            <View style={{ backgroundColor: 'rgba(24,24,27,0.6)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(39,39,42,0.8)', overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
                {['SET', 'KG', 'REPS'].map((h) => (
                  <Text key={h} style={{ flex: 1, textAlign: 'center', color: '#52525b', fontSize: 11, fontWeight: '700', letterSpacing: 0.8 }}>{h}</Text>
                ))}
                <View style={{ width: 28 }} />
              </View>

              {blockIndex === 0 && (
                <DraftSetRow
                  weight={draft.weight}
                  reps={draft.reps}
                  onWeightChange={(v) => setDraft((d) => ({ ...d, weight: v }))}
                  onRepsChange={(v) => setDraft((d) => ({ ...d, reps: v }))}
                  onConfirm={confirmDraft}
                />
              )}

              {block.sets.map((set, i) => (
                <SetRow
                  key={set.id}
                  set={set}
                  index={i}
                  onWeightChange={(v) => updateSetField(blockIndex, set.id, 'weight', v)}
                  onRepsChange={(v) => updateSetField(blockIndex, set.id, 'reps', v)}
                  onBlur={() => saveSet(blockIndex, set.id)}
                  onDelete={() => handleDeleteSet(blockIndex, set.id)}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Exercise picker modal */}
      <Modal visible={pickerVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPickerVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }} edges={['top']}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#18181b' }}>
            <Text style={{ color: '#f4f4f5', fontSize: 18, fontWeight: '700' }}>Select Exercise</Text>
            <TouchableOpacity
              onPress={() => { setPickerVisible(false); setSearch(''); }}
              style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="close" size={24} color="#71717a" />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginHorizontal: 16, marginVertical: 12 }}>
            <Ionicons name="search-outline" size={18} color="#71717a" style={{ marginRight: 8 }} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search exercises..."
              placeholderTextColor="#52525b"
              autoFocus
              style={{ flex: 1, color: '#f4f4f5', fontSize: 16 }}
            />
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            {filtered.length === 0 ? (
              <View style={{ alignItems: 'center', paddingTop: 48 }}>
                <Text style={{ color: '#52525b', fontSize: 16 }}>No exercises found</Text>
              </View>
            ) : (
              filtered.map((item) => (
                <TouchableOpacity
                  key={item.id ?? item.name}
                  onPress={() => pickExercise(item)}
                  style={{ paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#18181b' }}
                >
                  <Text style={{ color: '#f4f4f5', fontSize: 16, fontWeight: '600' }}>{item.name}</Text>
                  {item.primary_muscles?.length > 0 && (
                    <Text style={{ color: '#52525b', fontSize: 13, marginTop: 2 }}>{item.primary_muscles.join(', ')}</Text>
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function SetRow({ set, index, onWeightChange, onRepsChange, onBlur, onDelete }: {
  set: LocalSet;
  index: number;
  onWeightChange: (v: string) => void;
  onRepsChange: (v: string) => void;
  onBlur: () => void;
  onDelete: () => void;
}) {
  const logged = set.loggedAt !== null;
  const bg = logged ? 'rgba(16,185,129,0.06)' : index % 2 === 0 ? 'rgba(39,39,42,0.15)' : 'transparent';

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8, backgroundColor: bg, borderTopWidth: 1, borderTopColor: 'rgba(39,39,42,0.5)', position: 'relative' }}>
      {logged && (
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, backgroundColor: '#10b981' }} />
      )}
      <Text style={{ flex: 1, textAlign: 'center', color: '#71717a', fontSize: 14, fontWeight: '500' }}>{index + 1}</Text>
      <View style={{ flex: 1 }}>
        <TextInput
          value={set.weight}
          onChangeText={onWeightChange}
          onBlur={onBlur}
          placeholder="—"
          placeholderTextColor="#3f3f46"
          keyboardType="numeric"
          style={{ backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#3f3f46', borderRadius: 8, paddingVertical: 8, textAlign: 'center', color: '#fff', fontWeight: '500', fontSize: 14 }}
        />
      </View>
      <View style={{ flex: 1 }}>
        <TextInput
          value={set.reps}
          onChangeText={onRepsChange}
          onBlur={onBlur}
          placeholder="—"
          placeholderTextColor="#3f3f46"
          keyboardType="numeric"
          style={{ backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#3f3f46', borderRadius: 8, paddingVertical: 8, textAlign: 'center', color: '#fff', fontWeight: '500', fontSize: 14 }}
        />
      </View>
      <TouchableOpacity onPress={onDelete} style={{ width: 28, alignItems: 'center' }}>
        <Ionicons name="remove-circle-outline" size={18} color="#52525b" />
      </TouchableOpacity>
    </View>
  );
}

function DraftSetRow({ weight, reps, onWeightChange, onRepsChange, onConfirm }: {
  weight: string;
  reps: string;
  onWeightChange: (v: string) => void;
  onRepsChange: (v: string) => void;
  onConfirm: () => void;
}) {
  const canConfirm = weight.trim().length > 0 && reps.trim().length > 0;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8, borderTopWidth: 1, borderTopColor: 'rgba(39,39,42,0.5)' }}>
      <Text style={{ flex: 1, textAlign: 'center', color: '#3f3f46', fontSize: 14 }}>—</Text>
      <View style={{ flex: 1 }}>
        <TextInput
          value={weight}
          onChangeText={onWeightChange}
          placeholder="—"
          placeholderTextColor="#3f3f46"
          keyboardType="numeric"
          style={{ backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#3f3f46', borderRadius: 8, paddingVertical: 8, textAlign: 'center', color: '#fff', fontWeight: '500', fontSize: 14 }}
        />
      </View>
      <View style={{ flex: 1 }}>
        <TextInput
          value={reps}
          onChangeText={onRepsChange}
          placeholder="—"
          placeholderTextColor="#3f3f46"
          keyboardType="numeric"
          style={{ backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#3f3f46', borderRadius: 8, paddingVertical: 8, textAlign: 'center', color: '#fff', fontWeight: '500', fontSize: 14 }}
        />
      </View>
      <TouchableOpacity
        onPress={onConfirm}
        disabled={!canConfirm}
        style={{ width: 28, alignItems: 'center' }}
      >
        <Ionicons name="add-circle" size={22} color={canConfirm ? '#34d399' : '#3f3f46'} />
      </TouchableOpacity>
    </View>
  );
}
