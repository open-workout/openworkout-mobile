import { View, Text, ScrollView, TouchableOpacity, TextInput, StatusBar, Modal } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useWorkouts } from './hooks/useWorkouts';
import { useExercises } from './hooks/useExercises';
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
  exercise: Exercise;
  sets: LocalSet[];
};

function emptySet(): LocalSet {
  return { id: Math.random().toString(36).slice(2), weight: '', reps: '', unit: 'kg', loggedAt: null };
}

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
  const { finishWorkout, renameWorkout } = useWorkouts();
  const { exercises } = useExercises();

  const [blocks, setBlocks] = useState<ExerciseBlock[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleFinish = async () => {
    if (workoutId) {
      await finishWorkout(workoutId, new Date().toISOString());
    }
    router.back();
  };

  const handleTitleBlur = useCallback((title: string) => {
    if (workoutId) renameWorkout(workoutId, title);
  }, [workoutId, renameWorkout]);

  const pickExercise = (exercise: Exercise) => {
    setBlocks((prev) => [...prev, { blockId: Math.random().toString(36).slice(2), exercise, sets: [emptySet()] }]);
    setPickerVisible(false);
    setSearch('');
  };

  const addSet = (blockIndex: number) => {
    setBlocks((prev) => prev.map((b, i) => i === blockIndex ? { ...b, sets: [...b.sets, emptySet()] } : b));
  };

  const toggleSet = (blockIndex: number, setId: string) => {
    setBlocks((prev) => prev.map((b, i) =>
      i === blockIndex
        ? { ...b, sets: b.sets.map((s) => s.id === setId ? { ...s, loggedAt: s.loggedAt ? null : new Date() } : s) }
        : b
    ));
  };

  const filtered = exercises.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()));

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
            onBlur={(e) => handleTitleBlur(e.nativeEvent.text)}
            style={{ color: '#fff', fontSize: 24, fontWeight: '700', backgroundColor: 'transparent' }}
          />
        </View>

        {/* Empty state */}
        {blocks.length === 0 && (
          <View style={{ alignItems: 'center', paddingTop: 48, paddingBottom: 32 }}>
            <Ionicons name="barbell-outline" size={48} color="#27272a" />
            <Text style={{ color: '#52525b', fontSize: 16, fontWeight: '500', marginTop: 16 }}>No exercises yet</Text>
            <Text style={{ color: '#3f3f46', fontSize: 14, marginTop: 4 }}>Tap "Add Exercise" to get started</Text>
          </View>
        )}

        {/* Exercise blocks */}
        {blocks.map((block, blockIndex) => (
          <View key={block.blockId} style={{ paddingHorizontal: 16, marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, marginBottom: 12 }}>
              <Text style={{ color: '#34d399', fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.8, flex: 1 }}>
                {blockIndex + 1}. {block.exercise.name}
              </Text>
              <TouchableOpacity>
                <Ionicons name="ellipsis-horizontal" size={20} color="#71717a" />
              </TouchableOpacity>
            </View>

            <View style={{ backgroundColor: 'rgba(24,24,27,0.6)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(39,39,42,0.8)', overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
                {['SET', 'KG', 'REPS', '✓'].map((h) => (
                  <Text key={h} style={{ flex: 1, textAlign: 'center', color: '#52525b', fontSize: 11, fontWeight: '700', letterSpacing: 0.8 }}>{h}</Text>
                ))}
              </View>

              {block.sets.map((set, i) => (
                <SetRow key={set.id} set={set} index={i} onToggle={() => toggleSet(blockIndex, set.id)} />
              ))}

              <TouchableOpacity
                onPress={() => addSet(blockIndex)}
                style={{ paddingVertical: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(39,39,42,0.5)', backgroundColor: 'rgba(24,24,27,0.3)' }}
              >
                <Text style={{ color: '#71717a', fontSize: 14, fontWeight: '600' }}>+ Add Set</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Add exercise */}
        <View style={{ paddingHorizontal: 24, marginTop: 8 }}>
          <TouchableOpacity
            onPress={() => setPickerVisible(true)}
            style={{ paddingVertical: 16, borderRadius: 12, borderWidth: 2, borderColor: '#27272a', borderStyle: 'dashed', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
          >
            <Ionicons name="add" size={18} color="#52525b" />
            <Text style={{ color: '#52525b', fontWeight: '600', fontSize: 15 }}>Add Exercise</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Exercise picker modal */}
      <Modal visible={pickerVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPickerVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }} edges={['top']}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#18181b' }}>
            <Text style={{ color: '#f4f4f5', fontSize: 18, fontWeight: '700' }}>Select Exercise</Text>
            <TouchableOpacity onPress={() => { setPickerVisible(false); setSearch(''); }} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
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
                  key={item.id}
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

function SetRow({ set, index, onToggle }: { set: LocalSet; index: number; onToggle: () => void }) {
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
          defaultValue={set.weight}
          placeholder="—"
          placeholderTextColor="#3f3f46"
          keyboardType="numeric"
          style={{ backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#3f3f46', borderRadius: 8, paddingVertical: 8, textAlign: 'center', color: '#fff', fontWeight: '500', fontSize: 14 }}
        />
      </View>
      <View style={{ flex: 1 }}>
        <TextInput
          defaultValue={set.reps}
          placeholder="—"
          placeholderTextColor="#3f3f46"
          keyboardType="numeric"
          style={{ backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#3f3f46', borderRadius: 8, paddingVertical: 8, textAlign: 'center', color: '#fff', fontWeight: '500', fontSize: 14 }}
        />
      </View>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <TouchableOpacity
          onPress={onToggle}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: logged ? '#10b981' : '#27272a',
            borderWidth: 1,
            borderColor: logged ? '#34d399' : '#3f3f46',
            shadowColor: logged ? '#10b981' : 'transparent',
            shadowOpacity: logged ? 0.3 : 0,
            shadowRadius: 8,
          }}
        >
          <Ionicons name="checkmark" size={16} color={logged ? '#0a0a0a' : '#52525b'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
