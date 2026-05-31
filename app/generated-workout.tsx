import { View, Text, ScrollView, TouchableOpacity, StatusBar, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { useWorkouts } from './hooks/useWorkouts';
import { useExercises } from './hooks/useExercises';
import { useWeightUnit } from './hooks/useWeightUnit';
import { insertWorkout } from './db/workouts';
import { insertSet } from './db/sets';
import { getAllExercises } from './db/exercises';
import { deleteSetsByExercise } from './db/sets';
import { getPendingWorkout, clearPendingWorkout } from './lib/pendingWorkout';
import { findAlternatives } from './lib/generateWorkout';
import { compressMuscles } from './constants/splits';
import type { GeneratedSlot } from './lib/generateWorkout';
import type { Exercise } from './db/exercises';
import type { NewExerciseInput } from './db/exercises';
import { SetRow, DraftSetRow, type LocalSet } from './components/SetRows';
import AddExerciseModal from './components/AddExerciseModal';
import ConfirmModal from './components/ConfirmModal';

const C = {
  bg: '#0a0a0a',
  card: '#18181b',
  border: '#27272a',
  borderAlt: '#3f3f46',
  text: '#f4f4f5',
  textMuted: '#71717a',
  textDim: '#52525b',
};

const TYPE_LABEL: Record<string, string> = {
  compound: 'Compound',
  accessory: 'Accessory',
  isolation: 'Isolation',
};

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function GeneratedWorkoutScreen() {
  const router = useRouter();
  const { unit: weightUnit } = useWeightUnit();
  const { exercises, createExercise } = useExercises();
  const { finishWorkout, editSet, removeSet } = useWorkouts();

  const pending = getPendingWorkout();
  const slots: GeneratedSlot[] = pending?.slots ?? [];

  // Which exercise is chosen per slot
  const [chosen, setChosen] = useState<Exercise[]>(() => slots.map((s) => s.exercise));

  // Expandable cards
  const [expandedSlots, setExpandedSlots] = useState<Record<number, boolean>>({});

  // Per-slot logged sets and draft inputs
  const [slotSets, setSlotSets] = useState<Record<number, LocalSet[]>>({});
  const [drafts, setDrafts] = useState<Record<number, { weight: string; reps: string }>>({});

  // Lazy workout creation — store a Promise so concurrent first-set logs can't double-create
  const workoutRef = useRef<Promise<string> | null>(null);
  const startedAtRef = useRef<number | null>(null);

  // Timer
  const [elapsed, setElapsed] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  // Switch modal
  const [switchingSlot, setSwitchingSlot] = useState<number | null>(null);
  const [switchSearch, setSwitchSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  // Delete set confirmation
  const [deletingSet, setDeletingSet] = useState<{ slotIndex: number; setId: string } | null>(null);

  useEffect(() => {
    if (!pending) router.back();
  }, []);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current!) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  // ─── Workout lazy creation ──────────────────────────────────────────────────

  const ensureWorkout = (): Promise<string> => {
    if (!workoutRef.current) {
      workoutRef.current = insertWorkout({ title: '', started_at: new Date().toISOString() })
        .then((id) => {
          startedAtRef.current = Date.now();
          setTimerRunning(true);
          return id;
        });
    }
    return workoutRef.current;
  };

  // ─── Set operations ─────────────────────────────────────────────────────────

  const confirmDraft = async (slotIndex: number) => {
    const draft = drafts[slotIndex];
    if (!draft?.weight.trim() || !draft?.reps.trim()) return;
    const exercise = chosen[slotIndex];
    const exerciseRef = exercise.id || exercise.name;
    const now = new Date();

    const workoutId = await ensureWorkout();
    const newId = await insertSet({
      workout_id: workoutId,
      exercise_id: exerciseRef,
      reps: parseFloat(draft.reps) || 0,
      difficulty: 0,
      weight: parseFloat(draft.weight) || 0,
      unit: weightUnit,
      logged_at: now.toISOString(),
    });

    const saved: LocalSet = { id: newId, weight: draft.weight, reps: draft.reps, unit: weightUnit, loggedAt: now };
    setSlotSets((prev) => ({ ...prev, [slotIndex]: [saved, ...(prev[slotIndex] ?? [])] }));
    setDrafts((prev) => ({ ...prev, [slotIndex]: { weight: '', reps: '' } }));
  };

  const updateSetField = (slotIndex: number, setId: string, field: 'weight' | 'reps', value: string) => {
    setSlotSets((prev) => ({
      ...prev,
      [slotIndex]: (prev[slotIndex] ?? []).map((s) => (s.id === setId ? { ...s, [field]: value } : s)),
    }));
  };

  const saveSet = (slotIndex: number, setId: string) => {
    const set = (slotSets[slotIndex] ?? []).find((s) => s.id === setId);
    if (!set) return;
    editSet(setId, {
      reps: parseFloat(set.reps) || 0,
      difficulty: 0,
      weight: parseFloat(set.weight) || 0,
      unit: set.unit,
      logged_at: set.loggedAt ? set.loggedAt.toISOString() : 'pending',
    });
  };

  const confirmDeleteSet = async () => {
    if (!deletingSet) return;
    const { slotIndex, setId } = deletingSet;
    await removeSet(setId);
    setSlotSets((prev) => ({
      ...prev,
      [slotIndex]: (prev[slotIndex] ?? []).filter((s) => s.id !== setId),
    }));
    setDeletingSet(null);
  };

  // ─── Finish ─────────────────────────────────────────────────────────────────

  const handleFinish = async () => {
    const workoutId = workoutRef.current ? await workoutRef.current : null;
    if (workoutId) {
      await finishWorkout(workoutId, new Date().toISOString());
    }
    clearPendingWorkout();
    router.back();
  };

  // ─── Switch exercise ─────────────────────────────────────────────────────────

  const alternatives =
    switchingSlot !== null ? findAlternatives(chosen[switchingSlot], exercises) : [];

  const q = switchSearch.trim().toLowerCase();
  const switchCandidates = q
    ? exercises.filter((e) => {
        const haystack = [e.name, ...(e.alt_names ?? [])].join(' ').toLowerCase();
        return haystack.includes(q);
      })
    : alternatives;

  const selectAlternative = async (slotIndex: number, exercise: Exercise) => {
    if (workoutRef.current && (slotSets[slotIndex]?.length ?? 0) > 0) {
      const workoutId = await workoutRef.current;
      const oldRef = chosen[slotIndex].id || chosen[slotIndex].name;
      await deleteSetsByExercise(workoutId, oldRef);
    }
    setChosen((prev) => prev.map((e, i) => (i === slotIndex ? exercise : e)));
    setSlotSets((prev) => { const n = { ...prev }; delete n[slotIndex]; return n; });
    setDrafts((prev) => { const n = { ...prev }; delete n[slotIndex]; return n; });
    setSwitchingSlot(null);
    setSwitchSearch('');
  };

  const closeSwitchModal = () => {
    setSwitchingSlot(null);
    setSwitchSearch('');
  };

  const muscleLabel = pending?.muscles
    ? compressMuscles(pending.muscles)
        .map((m) => m.charAt(0).toUpperCase() + m.slice(1))
        .join(' · ')
    : '';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#0c0c0e', borderBottomWidth: 1, borderBottomColor: C.border }}>
        <TouchableOpacity
          onPress={handleFinish}
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="chevron-down" size={26} color={C.textMuted} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: C.text, fontSize: 17, fontWeight: '700' }}>Generated Workout</Text>
          {!!muscleLabel && (
            <Text style={{ color: C.textDim, fontSize: 12, marginTop: 2 }}>{muscleLabel}</Text>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {timerRunning && (
            <Text style={{ color: '#34d399', fontFamily: 'monospace', fontSize: 15, fontWeight: '600', letterSpacing: 1.5 }}>
              {formatElapsed(elapsed)}
            </Text>
          )}
          <TouchableOpacity
            onPress={handleFinish}
            style={{ backgroundColor: C.text, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 }}
          >
            <Text style={{ color: '#09090b', fontWeight: '700', fontSize: 14 }}>Finish</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {slots.map((slot, slotIndex) => {
          const exercise = chosen[slotIndex];
          if (!exercise) return null;
          const muscles = exercise.primary_muscles.join(', ');
          const isExpanded = !!expandedSlots[slotIndex];
          const sets = slotSets[slotIndex] ?? [];
          const draft = drafts[slotIndex] ?? { weight: '', reps: '' };

          return (
            <View
              key={slotIndex}
              style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: isExpanded ? C.borderAlt : C.border, marginBottom: 12, overflow: 'hidden' }}
            >
              {/* Card header */}
              <TouchableOpacity
                onPress={() => setExpandedSlots((prev) => ({ ...prev, [slotIndex]: !isExpanded }))}
                activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'flex-start', padding: 16, gap: 12 }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.textDim, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                    {TYPE_LABEL[slot.type] ?? slot.type}
                  </Text>
                  <Text style={{ color: C.text, fontSize: 18, fontWeight: '700', marginBottom: 4 }}>
                    {exercise.name}
                  </Text>
                  {!!muscles && (
                    <Text style={{ color: C.textMuted, fontSize: 13, textTransform: 'capitalize' }}>
                      {muscles}
                    </Text>
                  )}
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <TouchableOpacity
                    onPress={() => setSwitchingSlot(slotIndex)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#141414', borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingHorizontal: 10, paddingVertical: 7 }}
                  >
                    <Ionicons name="swap-horizontal-outline" size={15} color={C.textMuted} />
                    <Text style={{ color: C.textMuted, fontSize: 12, fontWeight: '600' }}>Switch</Text>
                  </TouchableOpacity>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={C.textMuted}
                  />
                </View>
              </TouchableOpacity>

              {/* Expanded set panel */}
              {isExpanded && (
                <View style={{ borderTopWidth: 1, borderTopColor: C.border }}>
                  {/* Column headers */}
                  <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}>
                    {[weightUnit.toUpperCase(), 'REPS'].map((h) => (
                      <Text key={h} style={{ flex: 1, textAlign: 'center', color: C.textDim, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 }}>{h}</Text>
                    ))}
                    <View style={{ width: 28 }} />
                  </View>

                  <DraftSetRow
                    weight={draft.weight}
                    reps={draft.reps}
                    onWeightChange={(v) => setDrafts((prev) => ({ ...prev, [slotIndex]: { ...draft, weight: v } }))}
                    onRepsChange={(v) => setDrafts((prev) => ({ ...prev, [slotIndex]: { ...draft, reps: v } }))}
                    onConfirm={() => confirmDraft(slotIndex)}
                  />

                  {sets.map((set) => (
                    <SetRow
                      key={set.id}
                      set={set}
                      onWeightChange={(v) => updateSetField(slotIndex, set.id, 'weight', v)}
                      onRepsChange={(v) => updateSetField(slotIndex, set.id, 'reps', v)}
                      onBlur={() => saveSet(slotIndex, set.id)}
                      onDelete={() => setDeletingSet({ slotIndex, setId: set.id })}
                    />
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {slots.length === 0 && (
          <View style={{ alignItems: 'center', paddingTop: 48 }}>
            <Ionicons name="barbell-outline" size={48} color={C.border} />
            <Text style={{ color: C.textDim, fontSize: 16, marginTop: 16 }}>No exercises found</Text>
            <Text style={{ color: C.textDim, fontSize: 13, marginTop: 6, textAlign: 'center' }}>
              Add more exercises to the library that match your target muscles
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Switch alternatives modal */}
      <Modal
        visible={switchingSlot !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeSwitchModal}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <Text style={{ color: C.text, fontSize: 17, fontWeight: '700' }}>Switch Exercise</Text>
            <TouchableOpacity
              onPress={closeSwitchModal}
              style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="close" size={24} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', margin: 12, paddingHorizontal: 12, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border }}>
            <Ionicons name="search" size={16} color={C.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              value={switchSearch}
              onChangeText={setSwitchSearch}
              placeholder="Search exercises…"
              placeholderTextColor={C.textDim}
              style={{ flex: 1, color: C.text, fontSize: 15, paddingVertical: 10 }}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {switchSearch.length > 0 && (
              <TouchableOpacity onPress={() => setSwitchSearch('')}>
                <Ionicons name="close-circle" size={16} color={C.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            {/* Create new exercise */}
            <TouchableOpacity
              onPress={() => setShowCreate(true)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border }}
            >
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderAlt, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="add" size={18} color={C.text} />
              </View>
              <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>Create Exercise</Text>
            </TouchableOpacity>

            {switchCandidates.length === 0 ? (
              <View style={{ alignItems: 'center', paddingTop: 48, paddingHorizontal: 32 }}>
                <Text style={{ color: C.textDim, fontSize: 15, textAlign: 'center' }}>
                  {q ? 'No exercises match your search' : 'No similar exercises found in your library'}
                </Text>
              </View>
            ) : (
              switchCandidates.map((candidate) => {
                const muscles = candidate.primary_muscles.join(', ');
                return (
                  <TouchableOpacity
                    key={candidate.id ?? candidate.name}
                    onPress={() => selectAlternative(switchingSlot!, candidate)}
                    style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border }}
                  >
                    <Text style={{ color: C.text, fontSize: 16, fontWeight: '600' }}>{candidate.name}</Text>
                    {!!muscles && (
                      <Text style={{ color: C.textDim, fontSize: 13, marginTop: 2, textTransform: 'capitalize' }}>{muscles}</Text>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Create exercise modal */}
      <AddExerciseModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={async (input: NewExerciseInput) => {
          await createExercise(input);
          const all = await getAllExercises();
          const fresh = all.find((e) => e.name === input.name);
          if (fresh && switchingSlot !== null) await selectAlternative(switchingSlot, fresh);
          setShowCreate(false);
        }}
      />

      {/* Delete set confirmation */}
      <ConfirmModal
        visible={deletingSet !== null}
        title="Delete Set"
        message="Remove this set?"
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeletingSet(null)}
        onConfirm={confirmDeleteSet}
      />
    </SafeAreaView>
  );
}
