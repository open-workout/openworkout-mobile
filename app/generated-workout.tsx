import { View, Text, ScrollView, TouchableOpacity, StatusBar, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { useWorkouts } from './hooks/useWorkouts';
import { useExercises } from './hooks/useExercises';
import { useWeightUnit } from './hooks/useWeightUnit';
import { insertWorkout } from './db/workouts';
import { insertSet, deleteSetsByExercise, getLastSetsForExercise } from './db/sets';
import { getAllExercises } from './db/exercises';
import { getPendingWorkout, clearPendingWorkout } from './lib/pendingWorkout';
import { findAlternatives } from './lib/generateWorkout';
import { compressMuscles } from './constants/splits';
import type { Exercise, NewExerciseInput } from './db/exercises';
import { SetRow, DraftSetRow, type LocalSet } from './components/SetRows';
import { OverloadHint } from './components/OverloadHint';
import AddExerciseModal from './components/AddExerciseModal';
import ConfirmModal from './components/ConfirmModal';
import { computeProgressSuggestion, type OverloadSuggestion } from './lib/progressiveOverload';
import { getWorkoutPreferences, type WorkoutPreferences } from './storage';

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

type WorkoutCard = {
  cardId: string;
  slotType: string;
  exercise: Exercise;
};

function mkId() {
  return Math.random().toString(36).slice(2);
}

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
  const slots = pending?.slots ?? [];

  // Cards — stable cardId keys replace numeric slot indices
  const [cards, setCards] = useState<WorkoutCard[]>(() =>
    slots.map((s) => ({ cardId: mkId(), slotType: s.type, exercise: s.exercise })),
  );

  // Per-card state keyed by cardId (stable across add/delete)
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [cardSets, setCardSets] = useState<Record<string, LocalSet[]>>({});
  const [drafts, setDrafts] = useState<Record<string, { weight: string; reps: string }>>({});
  const [suggestions, setSuggestions] = useState<Record<string, OverloadSuggestion | null>>({});
  const [localPrefs, setLocalPrefs] = useState<WorkoutPreferences | null>(null);

  // Lazy workout creation
  const workoutRef = useRef<Promise<string> | null>(null);
  const startedAtRef = useRef<number | null>(null);

  // Timer
  const [elapsed, setElapsed] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  // Switch modal
  const [switchingCardId, setSwitchingCardId] = useState<string | null>(null);
  const [switchSearch, setSwitchSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  // Add exercise picker
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [showCreateForAdd, setShowCreateForAdd] = useState(false);

  // Delete confirmations
  const [deletingSet, setDeletingSet] = useState<{ cardId: string; setId: string } | null>(null);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);

  useEffect(() => {
    if (!pending) router.back();
    getWorkoutPreferences().then(setLocalPrefs);
  }, []);

  useEffect(() => {
    if (!localPrefs) return;
    Promise.all(
      cards.map(async (card) => {
        const exerciseRef = card.exercise.id || card.exercise.name;
        const sets = await getLastSetsForExercise(exerciseRef);
        return { cardId: card.cardId, suggestion: computeProgressSuggestion(sets, card.exercise.exercise_type, localPrefs.progress_reps, weightUnit) };
      }),
    ).then((results) => {
      const map: Record<string, OverloadSuggestion | null> = {};
      for (const { cardId, suggestion } of results) map[cardId] = suggestion;
      setSuggestions(map);
    });
  }, [localPrefs]);

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

  const confirmDraft = async (cardId: string) => {
    const draft = drafts[cardId];
    if (!draft?.weight.trim() || !draft?.reps.trim()) return;
    const card = cards.find((c) => c.cardId === cardId);
    if (!card) return;
    const exerciseRef = card.exercise.id || card.exercise.name;
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
    setCardSets((prev) => ({ ...prev, [cardId]: [saved, ...(prev[cardId] ?? [])] }));
    setDrafts((prev) => ({ ...prev, [cardId]: { weight: '', reps: '' } }));
  };

  const updateSetField = (cardId: string, setId: string, field: 'weight' | 'reps', value: string) => {
    setCardSets((prev) => ({
      ...prev,
      [cardId]: (prev[cardId] ?? []).map((s) => (s.id === setId ? { ...s, [field]: value } : s)),
    }));
  };

  const saveSet = (cardId: string, setId: string) => {
    const set = (cardSets[cardId] ?? []).find((s) => s.id === setId);
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
    const { cardId, setId } = deletingSet;
    await removeSet(setId);
    setCardSets((prev) => ({ ...prev, [cardId]: (prev[cardId] ?? []).filter((s) => s.id !== setId) }));
    setDeletingSet(null);
  };

  // ─── Add / delete cards ──────────────────────────────────────────────────────

  const addCard = (exercise: Exercise) => {
    const newCard: WorkoutCard = {
      cardId: mkId(),
      slotType: exercise.exercise_type || 'accessory',
      exercise,
    };
    setCards((prev) => [...prev, newCard]);
    setShowPicker(false);
    setPickerSearch('');
    if (localPrefs) {
      const exerciseRef = exercise.id || exercise.name;
      getLastSetsForExercise(exerciseRef).then((sets) => {
        setSuggestions((prev) => ({ ...prev, [newCard.cardId]: computeProgressSuggestion(sets, exercise.exercise_type, localPrefs.progress_reps, weightUnit) }));
      });
    }
  };

  const confirmDeleteCard = async () => {
    if (!deletingCardId) return;
    if (workoutRef.current) {
      const workoutId = await workoutRef.current;
      const card = cards.find((c) => c.cardId === deletingCardId);
      if (card) {
        const exerciseRef = card.exercise.id || card.exercise.name;
        await deleteSetsByExercise(workoutId, exerciseRef);
      }
    }
    setCards((prev) => prev.filter((c) => c.cardId !== deletingCardId));
    setCardSets((prev) => { const n = { ...prev }; delete n[deletingCardId!]; return n; });
    setDrafts((prev) => { const n = { ...prev }; delete n[deletingCardId!]; return n; });
    setExpandedCards((prev) => { const n = { ...prev }; delete n[deletingCardId!]; return n; });
    setSuggestions((prev) => { const n = { ...prev }; delete n[deletingCardId!]; return n; });
    setDeletingCardId(null);
  };

  // ─── Finish ──────────────────────────────────────────────────────────────────

  const handleFinish = async () => {
    const workoutId = workoutRef.current ? await workoutRef.current : null;
    if (workoutId) {
      await finishWorkout(workoutId, new Date().toISOString());
    }
    clearPendingWorkout();
    router.back();
  };

  // ─── Switch exercise ──────────────────────────────────────────────────────────

  const switchingCard = cards.find((c) => c.cardId === switchingCardId) ?? null;
  const alternatives = switchingCard ? findAlternatives(switchingCard.exercise, exercises) : [];

  const q = switchSearch.trim().toLowerCase();
  const switchCandidates = q
    ? exercises.filter((e) => {
        const haystack = [e.name, ...(e.alt_names ?? [])].join(' ').toLowerCase();
        return haystack.includes(q);
      })
    : alternatives;

  const selectAlternative = async (cardId: string, exercise: Exercise) => {
    const card = cards.find((c) => c.cardId === cardId);
    if (workoutRef.current && card && (cardSets[cardId]?.length ?? 0) > 0) {
      const workoutId = await workoutRef.current;
      await deleteSetsByExercise(workoutId, card.exercise.id || card.exercise.name);
    }
    setCards((prev) => prev.map((c) => (c.cardId === cardId ? { ...c, exercise } : c)));
    setCardSets((prev) => { const n = { ...prev }; delete n[cardId]; return n; });
    setDrafts((prev) => { const n = { ...prev }; delete n[cardId]; return n; });
    setSuggestions((prev) => { const n = { ...prev }; delete n[cardId]; return n; });
    setSwitchingCardId(null);
    setSwitchSearch('');
    if (localPrefs) {
      const exerciseRef = exercise.id || exercise.name;
      getLastSetsForExercise(exerciseRef).then((sets) => {
        setSuggestions((prev) => ({ ...prev, [cardId]: computeProgressSuggestion(sets, exercise.exercise_type, localPrefs.progress_reps, weightUnit) }));
      });
    }
  };

  const closeSwitchModal = () => {
    setSwitchingCardId(null);
    setSwitchSearch('');
  };

  // ─── Picker search ───────────────────────────────────────────────────────────

  const pq = pickerSearch.trim().toLowerCase();
  const pickerCandidates = pq
    ? exercises.filter((e) => {
        const haystack = [e.name, ...(e.alt_names ?? [])].join(' ').toLowerCase();
        return haystack.includes(pq);
      })
    : exercises;

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
          <Text style={{ color: C.text, fontSize: 17, fontWeight: '700' }}>{(pending?.muscles.length ?? 0) > 0 ? 'Generated Workout' : 'Workout'}</Text>
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
        {cards.map((card) => {
          const { cardId, slotType, exercise } = card;
          const muscles = exercise.primary_muscles.join(', ');
          const isExpanded = !!expandedCards[cardId];
          const sets = cardSets[cardId] ?? [];
          const draft = drafts[cardId] ?? { weight: '', reps: '' };

          return (
            <View
              key={cardId}
              style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: isExpanded ? C.borderAlt : C.border, marginBottom: 12, overflow: 'hidden' }}
            >
              {/* Card header */}
              <TouchableOpacity
                onPress={() => setExpandedCards((prev) => ({ ...prev, [cardId]: !isExpanded }))}
                activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'flex-start', padding: 16, gap: 12 }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.textDim, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                    {TYPE_LABEL[slotType] ?? slotType}
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
                    onPress={() => setSwitchingCardId(cardId)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#141414', borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingHorizontal: 10, paddingVertical: 7 }}
                  >
                    <Ionicons name="swap-horizontal-outline" size={15} color={C.textMuted} />
                    <Text style={{ color: C.textMuted, fontSize: 12, fontWeight: '600' }}>Switch</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setDeletingCardId(cardId)}>
                    <Ionicons name="trash-outline" size={17} color={C.textDim} />
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
                  <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}>
                    {[weightUnit.toUpperCase(), 'REPS'].map((h) => (
                      <Text key={h} style={{ flex: 1, textAlign: 'center', color: C.textDim, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 }}>{h}</Text>
                    ))}
                    <View style={{ width: 28 }} />
                  </View>

                  {suggestions[cardId] && (
                    <OverloadHint label={suggestions[cardId]!.label} />
                  )}

                  <DraftSetRow
                    weight={draft.weight}
                    reps={draft.reps}
                    onWeightChange={(v) => setDrafts((prev) => ({ ...prev, [cardId]: { ...draft, weight: v } }))}
                    onRepsChange={(v) => setDrafts((prev) => ({ ...prev, [cardId]: { ...draft, reps: v } }))}
                    onConfirm={() => confirmDraft(cardId)}
                  />

                  {sets.map((set) => (
                    <SetRow
                      key={set.id}
                      set={set}
                      onWeightChange={(v) => updateSetField(cardId, set.id, 'weight', v)}
                      onRepsChange={(v) => updateSetField(cardId, set.id, 'reps', v)}
                      onBlur={() => saveSet(cardId, set.id)}
                      onDelete={() => setDeletingSet({ cardId, setId: set.id })}
                    />
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {/* Add exercise */}
        <TouchableOpacity
          onPress={() => setShowPicker(true)}
          style={{ paddingVertical: 16, borderRadius: 12, borderWidth: 2, borderColor: C.border, borderStyle: 'dashed', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 4 }}
        >
          <Ionicons name="add" size={18} color={C.textDim} />
          <Text style={{ color: C.textDim, fontWeight: '600', fontSize: 15 }}>Add Exercise</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Switch modal */}
      <Modal
        visible={switchingCardId !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeSwitchModal}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <Text style={{ color: C.text, fontSize: 17, fontWeight: '700' }}>Switch Exercise</Text>
            <TouchableOpacity onPress={closeSwitchModal} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={24} color={C.textMuted} />
            </TouchableOpacity>
          </View>

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
              switchCandidates.map((candidate) => (
                <TouchableOpacity
                  key={candidate.id ?? candidate.name}
                  onPress={() => selectAlternative(switchingCardId!, candidate)}
                  style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border }}
                >
                  <Text style={{ color: C.text, fontSize: 16, fontWeight: '600' }}>{candidate.name}</Text>
                  {candidate.primary_muscles.length > 0 && (
                    <Text style={{ color: C.textDim, fontSize: 13, marginTop: 2, textTransform: 'capitalize' }}>
                      {candidate.primary_muscles.join(', ')}
                    </Text>
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Add exercise picker modal */}
      <Modal
        visible={showPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setShowPicker(false); setPickerSearch(''); }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <Text style={{ color: C.text, fontSize: 17, fontWeight: '700' }}>Add Exercise</Text>
            <TouchableOpacity
              onPress={() => { setShowPicker(false); setPickerSearch(''); }}
              style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="close" size={24} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', margin: 12, paddingHorizontal: 12, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border }}>
            <Ionicons name="search" size={16} color={C.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              value={pickerSearch}
              onChangeText={setPickerSearch}
              placeholder="Search exercises…"
              placeholderTextColor={C.textDim}
              style={{ flex: 1, color: C.text, fontSize: 15, paddingVertical: 10 }}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {pickerSearch.length > 0 && (
              <TouchableOpacity onPress={() => setPickerSearch('')}>
                <Ionicons name="close-circle" size={16} color={C.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <TouchableOpacity
              onPress={() => setShowCreateForAdd(true)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border }}
            >
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderAlt, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="add" size={18} color={C.text} />
              </View>
              <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>Create Exercise</Text>
            </TouchableOpacity>

            {pickerCandidates.map((candidate) => (
              <TouchableOpacity
                key={candidate.id ?? candidate.name}
                onPress={() => addCard(candidate)}
                style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border }}
              >
                <Text style={{ color: C.text, fontSize: 16, fontWeight: '600' }}>{candidate.name}</Text>
                {candidate.primary_muscles.length > 0 && (
                  <Text style={{ color: C.textDim, fontSize: 13, marginTop: 2, textTransform: 'capitalize' }}>
                    {candidate.primary_muscles.join(', ')}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Create exercise (from switch modal) */}
      <AddExerciseModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={async (input: NewExerciseInput) => {
          await createExercise(input);
          const all = await getAllExercises();
          const fresh = all.find((e) => e.name === input.name);
          if (fresh && switchingCardId !== null) await selectAlternative(switchingCardId, fresh);
          setShowCreate(false);
        }}
      />

      {/* Create exercise (from add picker) */}
      <AddExerciseModal
        visible={showCreateForAdd}
        onClose={() => setShowCreateForAdd(false)}
        onSubmit={async (input: NewExerciseInput) => {
          await createExercise(input);
          const all = await getAllExercises();
          const fresh = all.find((e) => e.name === input.name);
          if (fresh) addCard(fresh);
          setShowCreateForAdd(false);
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

      {/* Delete card confirmation */}
      <ConfirmModal
        visible={deletingCardId !== null}
        title="Remove Exercise"
        message={`Remove "${cards.find((c) => c.cardId === deletingCardId)?.exercise.name ?? ''}" from this workout?`}
        confirmLabel="Remove"
        destructive
        onCancel={() => setDeletingCardId(null)}
        onConfirm={confirmDeleteCard}
      />
    </SafeAreaView>
  );
}
