import { View, Text, ScrollView, TouchableOpacity, StatusBar, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorkouts } from './hooks/useWorkouts';
import { useExercises } from './hooks/useExercises';
import { useWeightUnit } from './hooks/useWeightUnit';
import { useKeyboardHeight } from './hooks/useKeyboardHeight';
import { insertWorkout, deleteWorkout } from './db/workouts';
import { insertSet, deleteSetsByExercise, getLastSetsForExercise, getSetsForWorkout } from './db/sets';
import { getAllExercises } from './db/exercises';
import { getPendingWorkout, clearPendingWorkout, restorePendingWorkout, updatePendingSlotExercise } from './lib/pendingWorkout';
import { findAlternatives } from './lib/generateWorkout';
import { compressMuscles } from './constants/splits';
import type { Exercise, NewExerciseInput } from './db/exercises';
import { type LocalSet } from './components/SetRows';
import AddExerciseModal from './components/AddExerciseModal';
import ConfirmModal from './components/ConfirmModal';
import { ExerciseCard } from './components/ExerciseCard';
import { computeProgressSuggestion, type OverloadSuggestion } from './lib/progressiveOverload';
import { getWorkoutPreferences, type WorkoutPreferences } from './storage';
import { exerciseMatchesQuery, getExerciseDisplayName, getMuscleLabels } from './lib/exerciseTranslations';

const C = {
  bg: '#0a0a0a',
  card: '#18181b',
  border: '#27272a',
  borderAlt: '#3f3f46',
  text: '#f4f4f5',
  textMuted: '#71717a',
  textDim: '#52525b',
};

type WorkoutCard = {
  cardId: string;
  slotType: string;
  exercise: Exercise;
};

function mkId() {
  return Math.random().toString(36).slice(2);
}

export default function GeneratedWorkoutScreen() {
  const { t, i18n } = useTranslation('workout');
  const locale = i18n.language;
  const router = useRouter();
  const { workoutId: resumeWorkoutId } = useLocalSearchParams<{ workoutId?: string }>();
  const { unit: weightUnit } = useWeightUnit();
  const keyboardHeight = useKeyboardHeight();
  // Android's Modal already resizes for the keyboard natively (SOFT_INPUT_ADJUST_RESIZE);
  // only iOS needs the list to pad itself to clear the keyboard.
  const pickerListBottomPadding = Platform.OS === 'ios' ? keyboardHeight + 24 : 24;
  const { exercises, createExercise } = useExercises();
  const { finishWorkout, editSet, removeSet } = useWorkouts();

  const pending = getPendingWorkout();
  const slots = pending?.slots ?? [];

  // Cards — stable cardId keys replace numeric slot indices
  const [cards, setCards] = useState<WorkoutCard[]>(() =>
    resumeWorkoutId ? [] : slots.map((s) => ({ cardId: mkId(), slotType: s.type, exercise: s.exercise })),
  );

  // Per-card state keyed by cardId (stable across add/delete)
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [cardSets, setCardSets] = useState<Record<string, LocalSet[]>>({});
  const [drafts, setDrafts] = useState<Record<string, { weight: string; reps: string }>>({});
  const [suggestions, setSuggestions] = useState<Record<string, OverloadSuggestion | null>>({});
  const [localPrefs, setLocalPrefs] = useState<WorkoutPreferences | null>(null);

  // Lazy workout creation — pre-wired for resume mode
  const workoutRef = useRef<Promise<string> | null>(
    resumeWorkoutId ? Promise.resolve(resumeWorkoutId) : null,
  );

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
  const [showFinishModal, setShowFinishModal] = useState(false);

  useEffect(() => {
    if (!pending && !resumeWorkoutId) router.back();
    getWorkoutPreferences().then(setLocalPrefs);
  }, []);

  useEffect(() => {
    if (!resumeWorkoutId) return;
    Promise.all([getSetsForWorkout(resumeWorkoutId), getAllExercises()]).then(
      async ([dbSets, allExercises]) => {
        await restorePendingWorkout(allExercises);
        // Group DB sets by exercise_id
        const grouped = new Map<string, typeof dbSets>();
        for (const s of dbSets) {
          if (s.logged_at === 'seed') continue;
          if (!grouped.has(s.exercise_id)) grouped.set(s.exercise_id, []);
          grouped.get(s.exercise_id)!.push(s);
        }

        const newCards: WorkoutCard[] = [];
        const newCardSets: Record<string, LocalSet[]> = {};
        const newExpanded: Record<string, boolean> = {};
        const handledExIds = new Set<string>();

        const toLocalSets = (exSets: typeof dbSets): LocalSet[] =>
          [...exSets]
            .filter((s) => s.logged_at !== 'pending')
            .reverse()
            .map((s) => ({
              id: s.id,
              weight: s.weight ? String(s.weight) : '',
              reps: s.reps ? String(s.reps) : '',
              unit: s.unit as 'kg' | 'lbs',
              loggedAt: new Date(s.logged_at),
            }));

        const addCard = (exercise: Exercise, slotType: string, exId: string) => {
          const cardId = mkId();
          const exSets = grouped.get(exId) ?? [];
          const localSets = toLocalSets(exSets);
          newCards.push({ cardId, slotType, exercise });
          newCardSets[cardId] = localSets;
          if (localSets.length > 0) newExpanded[cardId] = true;
          handledExIds.add(exId);
        };

        // First pass: pending slots in their original planned order (preserves generated sequence)
        for (const slot of getPendingWorkout()?.slots ?? []) {
          const exId = slot.exercise.id || slot.exercise.name;
          addCard(slot.exercise, slot.type, exId);
        }

        // Second pass: exercises that were added manually during the workout (not in pending slots)
        for (const [exId] of grouped) {
          if (handledExIds.has(exId)) continue;
          const exercise = allExercises.find((e) => e.id === exId || e.name === exId);
          if (!exercise) continue;
          addCard(exercise, exercise.exercise_type || 'accessory', exId);
        }

        setCards(newCards);
        setCardSets(newCardSets);
        setExpandedCards(newExpanded);
      },
    );
  }, [resumeWorkoutId]);

  useEffect(() => {
    if (!localPrefs) return;
    Promise.all(
      cards.map(async (card) => {
        const exerciseRef = card.exercise.id || card.exercise.name;
        const sets = await getLastSetsForExercise(exerciseRef);
        return { cardId: card.cardId, suggestion: computeProgressSuggestion(sets, card.exercise.exercise_type, localPrefs.progress_reps, weightUnit, t) };
      }),
    ).then((results) => {
      const map: Record<string, OverloadSuggestion | null> = {};
      for (const { cardId, suggestion } of results) map[cardId] = suggestion;
      setSuggestions(map);
    });
  }, [localPrefs]);

  // ─── Workout lazy creation ──────────────────────────────────────────────────

  const ensureWorkout = (): Promise<string> => {
    if (!workoutRef.current) {
      workoutRef.current = insertWorkout({ title: '', started_at: new Date().toISOString() });
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
        setSuggestions((prev) => ({ ...prev, [newCard.cardId]: computeProgressSuggestion(sets, exercise.exercise_type, localPrefs.progress_reps, weightUnit, t) }));
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
    router.replace('/(tabs)/home');
  };

  const handleDiscard = async () => {
    const workoutId = workoutRef.current ? await workoutRef.current : null;
    if (workoutId) {
      await deleteWorkout(workoutId);
    }
    clearPendingWorkout();
    router.back();
  };

  // ─── Switch exercise ──────────────────────────────────────────────────────────

  const switchingCard = cards.find((c) => c.cardId === switchingCardId) ?? null;
  const alternatives = switchingCard ? findAlternatives(switchingCard.exercise, exercises) : [];

  const q = switchSearch.trim();
  const switchCandidates = q
    ? exercises.filter((e) => exerciseMatchesQuery(e, q, locale))
    : alternatives;

  const selectAlternative = async (cardId: string, exercise: Exercise) => {
    const card = cards.find((c) => c.cardId === cardId);
    if (!card) return;
    const oldExerciseId = card.exercise.id || card.exercise.name;
    updatePendingSlotExercise(oldExerciseId, exercise);
    setCards((prev) => prev.map((c) => (c.cardId === cardId ? { ...c, exercise } : c)));
    setDrafts((prev) => { const n = { ...prev }; delete n[cardId]; return n; });
    setSuggestions((prev) => { const n = { ...prev }; delete n[cardId]; return n; });
    setSwitchingCardId(null);
    setSwitchSearch('');
    if (localPrefs) {
      const exerciseRef = exercise.id || exercise.name;
      getLastSetsForExercise(exerciseRef).then((sets) => {
        setSuggestions((prev) => ({ ...prev, [cardId]: computeProgressSuggestion(sets, exercise.exercise_type, localPrefs.progress_reps, weightUnit, t) }));
      });
    }
  };

  const closeSwitchModal = () => {
    setSwitchingCardId(null);
    setSwitchSearch('');
  };

  // ─── Picker search ───────────────────────────────────────────────────────────

  const pq = pickerSearch.trim();
  const pickerCandidates = pq
    ? exercises.filter((e) => exerciseMatchesQuery(e, pq, locale))
    : exercises;

  const muscleLabel = pending?.muscles
    ? getMuscleLabels(compressMuscles(pending.muscles), locale).join(' · ')
    : '';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#0c0c0e', borderBottomWidth: 1, borderBottomColor: C.border }}>
        <TouchableOpacity
          onPress={() => setShowFinishModal(true)}
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="chevron-down" size={26} color={C.textMuted} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: C.text, fontSize: 17, fontWeight: '700' }}>
            {resumeWorkoutId ? t('resumeWorkout') : (pending?.muscles.length ?? 0) > 0 ? t('generatedWorkout') : t('workoutFallbackTitle')}
          </Text>
          {!!muscleLabel && (
            <Text style={{ color: C.textDim, fontSize: 12, marginTop: 2 }}>{muscleLabel}</Text>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => setShowFinishModal(true)}
            style={{ backgroundColor: C.text, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 }}
          >
            <Text style={{ color: '#09090b', fontWeight: '700', fontSize: 14 }}>{t('finish')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {cards.map((card) => {
          const { cardId } = card;
          const draft = drafts[cardId] ?? { weight: '', reps: '' };
          return (
            <ExerciseCard
              key={cardId}
              slotType={card.slotType}
              exercise={card.exercise}
              isExpanded={!!expandedCards[cardId]}
              sets={cardSets[cardId] ?? []}
              draft={draft}
              suggestion={suggestions[cardId] ?? null}
              weightUnit={weightUnit}
              onToggleExpand={() => setExpandedCards((prev) => ({ ...prev, [cardId]: !expandedCards[cardId] }))}
              onSwitch={() => setSwitchingCardId(cardId)}
              onDelete={() => setDeletingCardId(cardId)}
              onDraftWeightChange={(v) => setDrafts((prev) => ({ ...prev, [cardId]: { ...draft, weight: v } }))}
              onDraftRepsChange={(v) => setDrafts((prev) => ({ ...prev, [cardId]: { ...draft, reps: v } }))}
              onConfirmDraft={() => confirmDraft(cardId)}
              onSetWeightChange={(setId, v) => updateSetField(cardId, setId, 'weight', v)}
              onSetRepsChange={(setId, v) => updateSetField(cardId, setId, 'reps', v)}
              onSetBlur={(setId) => saveSet(cardId, setId)}
              onSetDelete={(setId) => setDeletingSet({ cardId, setId })}
            />
          );
        })}

        {/* Add exercise */}
        <TouchableOpacity
          onPress={() => setShowPicker(true)}
          style={{ paddingVertical: 16, borderRadius: 12, borderWidth: 2, borderColor: C.border, borderStyle: 'dashed', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 4 }}
        >
          <Ionicons name="add" size={18} color={C.textDim} />
          <Text style={{ color: C.textDim, fontWeight: '600', fontSize: 15 }}>{t('routines:addExercise')}</Text>
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Switch modal */}
      <Modal
        visible={switchingCardId !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeSwitchModal}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <Text style={{ color: C.text, fontSize: 17, fontWeight: '700' }}>{t('switchExercise')}</Text>
            <TouchableOpacity onPress={closeSwitchModal} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={24} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', margin: 12, paddingHorizontal: 12, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border }}>
            <Ionicons name="search" size={16} color={C.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              value={switchSearch}
              onChangeText={setSwitchSearch}
              placeholder={t('routines:searchExercisesPlaceholder')}
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

          <ScrollView
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: pickerListBottomPadding }}
          >
            <TouchableOpacity
              onPress={() => setShowCreate(true)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border }}
            >
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderAlt, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="add" size={18} color={C.text} />
              </View>
              <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>{t('routines:createExercise')}</Text>
            </TouchableOpacity>

            {switchCandidates.length === 0 ? (
              <View style={{ alignItems: 'center', paddingTop: 48, paddingHorizontal: 32 }}>
                <Text style={{ color: C.textDim, fontSize: 15, textAlign: 'center' }}>
                  {q ? t('routines:noExercisesMatchSearch') : t('noSimilarExercisesFound')}
                </Text>
              </View>
            ) : (
              switchCandidates.map((candidate) => (
                <TouchableOpacity
                  key={candidate.id ?? candidate.name}
                  onPress={() => selectAlternative(switchingCardId!, candidate)}
                  style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border }}
                >
                  <Text style={{ color: C.text, fontSize: 16, fontWeight: '600' }}>{getExerciseDisplayName(candidate, locale)}</Text>
                  {candidate.primary_muscles.length > 0 && (
                    <Text style={{ color: C.textDim, fontSize: 13, marginTop: 2 }}>
                      {getMuscleLabels(candidate.primary_muscles, locale).join(', ')}
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
            <Text style={{ color: C.text, fontSize: 17, fontWeight: '700' }}>{t('routines:addExercise')}</Text>
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
              placeholder={t('routines:searchExercisesPlaceholder')}
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

          <ScrollView
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: pickerListBottomPadding }}
          >
            <TouchableOpacity
              onPress={() => setShowCreateForAdd(true)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border }}
            >
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderAlt, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="add" size={18} color={C.text} />
              </View>
              <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>{t('routines:createExercise')}</Text>
            </TouchableOpacity>

            {pickerCandidates.map((candidate) => (
              <TouchableOpacity
                key={candidate.id ?? candidate.name}
                onPress={() => addCard(candidate)}
                style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border }}
              >
                <Text style={{ color: C.text, fontSize: 16, fontWeight: '600' }}>{getExerciseDisplayName(candidate, locale)}</Text>
                {candidate.primary_muscles.length > 0 && (
                  <Text style={{ color: C.textDim, fontSize: 13, marginTop: 2 }}>
                    {getMuscleLabels(candidate.primary_muscles, locale).join(', ')}
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

      {/* Finish / Discard modal */}
      <Modal visible={showFinishModal} transparent animationType="fade" onRequestClose={() => setShowFinishModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <View style={{ width: '100%', backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
            <View style={{ padding: 24, gap: 6 }}>
              <Text style={{ color: C.text, fontSize: 17, fontWeight: '700' }}>{t('finishWorkoutTitle')}</Text>
              <Text style={{ color: C.textMuted, fontSize: 14, lineHeight: 20 }}>{t('finishWorkoutMessage')}</Text>
            </View>
            <View style={{ borderTopWidth: 1, borderTopColor: C.border }}>
              <TouchableOpacity
                onPress={() => { setShowFinishModal(false); handleFinish(); }}
                style={{ paddingVertical: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.border }}
              >
                <Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }}>{t('finish')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setShowFinishModal(false); handleDiscard(); }}
                style={{ paddingVertical: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.border }}
              >
                <Text style={{ color: '#ef4444', fontSize: 15, fontWeight: '600' }}>{t('discard')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowFinishModal(false)}
                style={{ paddingVertical: 16, alignItems: 'center' }}
              >
                <Text style={{ color: C.textMuted, fontSize: 15, fontWeight: '600' }}>{t('common:cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete set confirmation */}
      <ConfirmModal
        visible={deletingSet !== null}
        title={t('deleteSetTitle')}
        message={t('deleteSetMessage')}
        confirmLabel={t('common:delete')}
        destructive
        onCancel={() => setDeletingSet(null)}
        onConfirm={confirmDeleteSet}
      />

      {/* Delete card confirmation */}
      <ConfirmModal
        visible={deletingCardId !== null}
        title={t('removeExerciseTitle')}
        message={t('removeExerciseMessage', {
          name: (() => {
            const c = cards.find((c) => c.cardId === deletingCardId);
            return c ? getExerciseDisplayName(c.exercise, locale) : '';
          })(),
        })}
        confirmLabel={t('remove')}
        destructive
        onCancel={() => setDeletingCardId(null)}
        onConfirm={confirmDeleteCard}
      />
    </SafeAreaView>
  );
}
