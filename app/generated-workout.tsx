import { View, Text, ScrollView, FlatList, TouchableOpacity, StatusBar, Modal, TextInput, KeyboardAvoidingView, Platform, Dimensions, ActivityIndicator } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
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
import { insertSet, deleteSetsByExercise, getLastSetsForExercise, getSetsForWorkout, generateId, type NewSetInput } from './db/sets';
import { getAllExercises } from './db/exercises';
import { getPendingWorkout, clearPendingWorkout, restorePendingWorkout, updatePendingSlotExercise } from './lib/pendingWorkout';
import { findAlternatives } from './lib/generateWorkout';
import { compressMuscles } from './constants/splits';
import type { Exercise, NewExerciseInput } from './db/exercises';
import { isSetFilled, type LocalSet } from './components/SetRows';
import AddExerciseModal from './components/AddExerciseModal';
import ConfirmModal from './components/ConfirmModal';
import { ExerciseCard } from './components/ExerciseCard';
import { ExerciseTabStrip } from './components/ExerciseTabStrip';
import { computeProgressSuggestion, type OverloadSuggestion } from './lib/progressiveOverload';
import { getWorkoutPreferences, DEFAULT_WORKOUT_PREFS, type WorkoutPreferences } from './storage';
import { exerciseMatchesQuery, getExerciseDisplayName, getMuscleLabels } from './lib/exerciseTranslations';
import { C } from './theme/colors';

type WorkoutCard = {
  cardId: string;
  exercise: Exercise;
};

function mkId() {
  return Math.random().toString(36).slice(2);
}

function isTimeBased(exercise: Exercise): boolean {
  return (exercise.logging_type ?? 'reps') === 'time';
}

function exerciseRefOf(exercise: Exercise): string {
  return exercise.id || exercise.name;
}

function generateInitialSets(
  exercise: Exercise,
  suggestion: OverloadSuggestion | null,
  count: number,
  weightUnit: 'kg' | 'lbs',
): LocalSet[] {
  const isTime = isTimeBased(exercise);
  return Array.from({ length: Math.max(1, count) }, (_, i) => ({
    id: generateId(),
    weight: !isTime && suggestion ? String(suggestion.weight) : '',
    reps: !isTime && suggestion && !suggestion.isAmrap ? String(suggestion.reps) : '',
    durationSeconds: '',
    unit: weightUnit,
    loggedAt: null,
    isWarmup: false,
    position: i,
  }));
}

// Blank fields are stored as a -1 sentinel (weight=0 is a legitimate bodyweight
// value, so it can't double as "blank"). A set can only ever reach a real
// (non-'pending') logged_at once its required fields are non-blank, so every
// history/suggestion/PR query already excluding 'pending' rows never observes -1.
function toDbFields(set: LocalSet, isTime: boolean) {
  return {
    reps: isTime ? -1 : (set.reps.trim() ? parseFloat(set.reps) : -1),
    difficulty: 0,
    weight: set.weight.trim() ? parseFloat(set.weight) : -1,
    unit: set.unit,
    logged_at: set.loggedAt ? set.loggedAt.toISOString() : 'pending',
    duration_seconds: isTime ? (set.durationSeconds.trim() ? (parseInt(set.durationSeconds, 10) || 0) : null) : null,
  };
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
  const { exercises, createExercise, isLoading: exercisesLoading } = useExercises();
  const { finishWorkout, editSet, removeSet } = useWorkouts();

  const pending = getPendingWorkout();
  const slots = pending?.slots ?? [];

  // Cards — stable cardId keys replace numeric slot indices
  const [cards, setCards] = useState<WorkoutCard[]>(() =>
    resumeWorkoutId ? [] : slots.map((s) => ({ cardId: mkId(), exercise: s.exercise })),
  );
  const [activeCardId, setActiveCardId] = useState<string | null>(() => cards[0]?.cardId ?? null);

  // Per-card state keyed by cardId (stable across add/delete)
  const [cardSets, setCardSets] = useState<Record<string, LocalSet[]>>({});
  const [suggestions, setSuggestions] = useState<Record<string, OverloadSuggestion | null>>({});
  const [localPrefs, setLocalPrefs] = useState<WorkoutPreferences | null>(null);
  const [isRestoring, setIsRestoring] = useState(() => !!resumeWorkoutId);

  // Cards are generated locally (no DB writes) until the user first interacts
  // with them — this ref tracks which cards have been materialized to the DB.
  const materializedCardIds = useRef<Set<string>>(new Set());

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

  // Remove-sets multi-select mode (scoped to the active card)
  const [removeMode, setRemoveMode] = useState(false);
  const [selectedForRemoval, setSelectedForRemoval] = useState<Set<string>>(new Set());
  const [pendingRemoval, setPendingRemoval] = useState<{ cardId: string; ids: string[] } | null>(null);

  // Delete confirmations
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const [showFinishModal, setShowFinishModal] = useState(false);

  // Warns before advancing past an exercise with unchecked sets
  const [showUnfinishedWarning, setShowUnfinishedWarning] = useState(false);

  // The stack navigator's own dismiss transition doesn't animate reliably
  // for this modal on every platform, so the slide-down on exit is driven
  // here instead: translate the panel off-screen first, then dismiss the
  // route once that's finished — by then nothing visible changes.
  const translateY = useSharedValue(0);
  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const closePanel = () => {
    const windowHeight = Dimensions.get('window').height;
    translateY.value = withTiming(windowHeight, { duration: 280 }, (finished) => {
      if (finished) runOnJS(router.dismiss)();
    });
  };

  const selectCard = (cardId: string | null) => {
    setActiveCardId(cardId);
    setRemoveMode(false);
    setSelectedForRemoval(new Set());
  };

  useEffect(() => {
    if (!pending && !resumeWorkoutId) router.back();
    getWorkoutPreferences().then(setLocalPrefs);
  }, []);

  // Resume an in-progress workout: restore already-materialized cards from the
  // DB (including unchecked 'pending' rows), and generate fresh sets locally
  // for any planned exercise that was never opened in a previous session.
  useEffect(() => {
    if (!resumeWorkoutId || !localPrefs || exercisesLoading) return;
    getSetsForWorkout(resumeWorkoutId).then(
      async (dbSets) => {
        const allExercises = exercises;
        await restorePendingWorkout(allExercises);
        const grouped = new Map<string, typeof dbSets>();
        for (const s of dbSets) {
          if (s.logged_at === 'seed') continue;
          if (!grouped.has(s.exercise_id)) grouped.set(s.exercise_id, []);
          grouped.get(s.exercise_id)!.push(s);
        }

        const newCards: WorkoutCard[] = [];
        const newCardSets: Record<string, LocalSet[]> = {};
        const newSuggestions: Record<string, OverloadSuggestion | null> = {};
        const handledExIds = new Set<string>();
        const materializedIds: string[] = [];
        const generationTasks: Promise<void>[] = [];

        const toLocalSets = (exSets: typeof dbSets): LocalSet[] =>
          exSets.map((s) => ({
            id: s.id,
            weight: s.weight === -1 ? '' : String(s.weight),
            reps: s.reps === -1 ? '' : String(s.reps),
            durationSeconds: s.duration_seconds != null ? String(s.duration_seconds) : '',
            unit: s.unit as 'kg' | 'lbs',
            loggedAt: s.logged_at === 'pending' ? null : new Date(s.logged_at),
            isWarmup: s.is_warmup === 1,
            position: s.position,
          }));

        const addCard = (exercise: Exercise, exId: string) => {
          const cardId = mkId();
          const exSets = grouped.get(exId) ?? [];
          newCards.push({ cardId, exercise });
          handledExIds.add(exId);

          if (exSets.length > 0) {
            newCardSets[cardId] = toLocalSets(exSets);
            materializedIds.push(cardId);
            return;
          }

          if (isTimeBased(exercise)) {
            newCardSets[cardId] = generateInitialSets(exercise, null, localPrefs.sets_per_exercise, weightUnit);
            return;
          }
          generationTasks.push(
            getLastSetsForExercise(exerciseRefOf(exercise)).then((sets) => {
              const suggestion = computeProgressSuggestion(sets, localPrefs.progress_reps, weightUnit, t);
              newSuggestions[cardId] = suggestion;
              newCardSets[cardId] = generateInitialSets(exercise, suggestion, localPrefs.sets_per_exercise, weightUnit);
            }),
          );
        };

        // First pass: pending slots in their original planned order (preserves generated sequence)
        for (const slot of getPendingWorkout()?.slots ?? []) {
          const exId = slot.exercise.id || slot.exercise.name;
          addCard(slot.exercise, exId);
        }

        // Second pass: exercises that were added manually during the workout (not in pending slots)
        for (const [exId] of grouped) {
          if (handledExIds.has(exId)) continue;
          const exercise = allExercises.find((e) => e.id === exId || e.name === exId);
          if (!exercise) continue;
          addCard(exercise, exId);
        }

        await Promise.all(generationTasks);

        // Suggestions for cards that already have sets too, for the overload hint banner.
        await Promise.all(
          newCards
            .filter((c) => !isTimeBased(c.exercise) && !(c.cardId in newSuggestions))
            .map(async (c) => {
              const sets = await getLastSetsForExercise(exerciseRefOf(c.exercise));
              newSuggestions[c.cardId] = computeProgressSuggestion(sets, localPrefs.progress_reps, weightUnit, t);
            }),
        );

        materializedIds.forEach((id) => materializedCardIds.current.add(id));
        setCards(newCards);
        setCardSets(newCardSets);
        setSuggestions(newSuggestions);
        setActiveCardId(newCards[0]?.cardId ?? null);
        setIsRestoring(false);
      },
    );
  }, [resumeWorkoutId, localPrefs, exercisesLoading]);

  // Fresh workout: generate local (not-yet-persisted) sets for the initial slots.
  useEffect(() => {
    if (!localPrefs || resumeWorkoutId) return;
    Promise.all(
      cards.map(async (card) => {
        if (isTimeBased(card.exercise)) return { cardId: card.cardId, suggestion: null as OverloadSuggestion | null };
        const sets = await getLastSetsForExercise(exerciseRefOf(card.exercise));
        return { cardId: card.cardId, suggestion: computeProgressSuggestion(sets, localPrefs.progress_reps, weightUnit, t) };
      }),
    ).then((results) => {
      const suggMap: Record<string, OverloadSuggestion | null> = {};
      for (const { cardId, suggestion } of results) suggMap[cardId] = suggestion;
      setSuggestions(suggMap);
      setCardSets((prev) => {
        const next = { ...prev };
        for (const card of cards) {
          if (next[card.cardId]) continue;
          next[card.cardId] = generateInitialSets(card.exercise, suggMap[card.cardId] ?? null, localPrefs.sets_per_exercise, weightUnit);
        }
        return next;
      });
    });
  }, [localPrefs]);

  // ─── Workout lazy creation ──────────────────────────────────────────────────

  const ensureWorkout = (): Promise<string> => {
    if (!workoutRef.current) {
      workoutRef.current = insertWorkout({
        title: '',
        started_at: new Date().toISOString(),
        split_day_name: getPendingWorkout()?.splitDayName ?? null,
      });
    }
    return workoutRef.current;
  };

  // ─── Set operations ─────────────────────────────────────────────────────────

  // Persists a whole card's local sets to the DB for the first time.
  const materializeCard = async (cardId: string, exerciseRef: string, isTime: boolean, sets: LocalSet[]) => {
    if (materializedCardIds.current.has(cardId)) return;
    materializedCardIds.current.add(cardId);
    const workoutId = await ensureWorkout();
    for (const s of sets) {
      const input: NewSetInput = {
        id: s.id,
        workout_id: workoutId,
        exercise_id: exerciseRef,
        is_warmup: s.isWarmup ? 1 : 0,
        position: s.position,
        ...toDbFields(s, isTime),
      };
      await insertSet(input);
    }
  };

  // Either materializes the whole card (first interaction) or updates one already-persisted set.
  const materializeOrUpdate = async (cardId: string, exerciseRef: string, isTime: boolean, allSets: LocalSet[], changedSet: LocalSet) => {
    if (!materializedCardIds.current.has(cardId)) {
      await materializeCard(cardId, exerciseRef, isTime, allSets);
    } else {
      await editSet(changedSet.id, toDbFields(changedSet, isTime));
    }
  };

  // Either materializes the whole card (including the new set) or inserts just the new set.
  const materializeOrInsert = async (cardId: string, exerciseRef: string, isTime: boolean, allSets: LocalSet[], newSet: LocalSet) => {
    if (!materializedCardIds.current.has(cardId)) {
      await materializeCard(cardId, exerciseRef, isTime, allSets);
    } else {
      const workoutId = await ensureWorkout();
      await insertSet({
        id: newSet.id,
        workout_id: workoutId,
        exercise_id: exerciseRef,
        is_warmup: newSet.isWarmup ? 1 : 0,
        position: newSet.position,
        ...toDbFields(newSet, isTime),
      });
    }
  };

  const toggleSetChecked = (cardId: string, setId: string) => {
    const card = cards.find((c) => c.cardId === cardId);
    if (!card) return;
    const isTime = isTimeBased(card.exercise);
    const current = cardSets[cardId] ?? [];
    const target = current.find((s) => s.id === setId);
    if (!target) return;

    let nextSet: LocalSet;
    if (target.loggedAt !== null) {
      nextSet = { ...target, loggedAt: null };
    } else {
      if (!isSetFilled(target, isTime ? 'time' : 'reps')) return;
      nextSet = { ...target, loggedAt: new Date() };
    }
    const nextSets = current.map((s) => (s.id === setId ? nextSet : s));
    setCardSets((prev) => ({ ...prev, [cardId]: nextSets }));
    materializeOrUpdate(cardId, exerciseRefOf(card.exercise), isTime, nextSets, nextSet);
  };

  const updateSetField = (cardId: string, setId: string, field: 'weight' | 'reps' | 'durationSeconds', value: string) => {
    const current = cardSets[cardId] ?? [];
    const nextSets = current.map((s) => {
      if (s.id !== setId) return s;
      const updated: LocalSet = { ...s, [field]: value };
      if (!value.trim() && updated.loggedAt !== null) updated.loggedAt = null;
      return updated;
    });
    setCardSets((prev) => ({ ...prev, [cardId]: nextSets }));
  };

  const onSetWeightChange = (cardId: string, setId: string, value: string) => {
    updateSetField(cardId, setId, 'weight', value);
  };

  const onSetSecondaryChange = (cardId: string, setId: string, value: string) => {
    const card = cards.find((c) => c.cardId === cardId);
    const isTime = card ? isTimeBased(card.exercise) : false;
    updateSetField(cardId, setId, isTime ? 'durationSeconds' : 'reps', value);
  };

  const onSetBlur = (cardId: string, setId: string) => {
    const card = cards.find((c) => c.cardId === cardId);
    if (!card) return;
    const isTime = isTimeBased(card.exercise);
    const sets = cardSets[cardId] ?? [];
    const set = sets.find((s) => s.id === setId);
    if (!set) return;
    materializeOrUpdate(cardId, exerciseRefOf(card.exercise), isTime, sets, set);
  };

  const addWarmupSet = (cardId: string) => {
    const card = cards.find((c) => c.cardId === cardId);
    if (!card) return;
    const current = cardSets[cardId] ?? [];
    const minPos = current.length ? Math.min(...current.map((s) => s.position)) : 0;
    const newSet: LocalSet = {
      id: generateId(),
      weight: '',
      reps: '',
      durationSeconds: '',
      unit: weightUnit,
      loggedAt: null,
      isWarmup: true,
      position: minPos - 1,
    };
    const nextSets = [newSet, ...current];
    setCardSets((prev) => ({ ...prev, [cardId]: nextSets }));
    materializeOrInsert(cardId, exerciseRefOf(card.exercise), isTimeBased(card.exercise), nextSets, newSet);
  };

  const addSet = (cardId: string) => {
    const card = cards.find((c) => c.cardId === cardId);
    if (!card) return;
    const current = cardSets[cardId] ?? [];
    const last = current[current.length - 1];
    const maxPos = current.length ? Math.max(...current.map((s) => s.position)) : -1;
    const newSet: LocalSet = {
      id: generateId(),
      weight: last?.weight ?? '',
      reps: last?.reps ?? '',
      durationSeconds: last?.durationSeconds ?? '',
      unit: weightUnit,
      loggedAt: null,
      isWarmup: false,
      position: maxPos + 1,
    };
    const nextSets = [...current, newSet];
    setCardSets((prev) => ({ ...prev, [cardId]: nextSets }));
    materializeOrInsert(cardId, exerciseRefOf(card.exercise), isTimeBased(card.exercise), nextSets, newSet);
  };

  const regenerateSets = (cardId: string) => {
    const card = cards.find((c) => c.cardId === cardId);
    if (!card || !localPrefs) return;
    const suggestion = suggestions[cardId] ?? null;
    const nextSets = generateInitialSets(card.exercise, suggestion, localPrefs.sets_per_exercise, weightUnit);
    setCardSets((prev) => ({ ...prev, [cardId]: nextSets }));
  };

  const enterRemoveMode = () => {
    setRemoveMode(true);
    setSelectedForRemoval(new Set());
  };

  const cancelRemoveMode = () => {
    setRemoveMode(false);
    setSelectedForRemoval(new Set());
  };

  const toggleSelectForRemoval = (setId: string) => {
    setSelectedForRemoval((prev) => {
      const next = new Set(prev);
      if (next.has(setId)) next.delete(setId);
      else next.add(setId);
      return next;
    });
  };

  const requestConfirmRemove = (cardId: string) => {
    if (selectedForRemoval.size === 0) return;
    setPendingRemoval({ cardId, ids: [...selectedForRemoval] });
  };

  const confirmRemoveSets = async () => {
    if (!pendingRemoval) return;
    const { cardId, ids } = pendingRemoval;
    if (materializedCardIds.current.has(cardId)) {
      await Promise.all(ids.map((id) => removeSet(id)));
    }
    const idSet = new Set(ids);
    setCardSets((prev) => {
      const remaining = (prev[cardId] ?? []).filter((s) => !idSet.has(s.id));
      if (remaining.length === 0) materializedCardIds.current.delete(cardId);
      return { ...prev, [cardId]: remaining };
    });
    setPendingRemoval(null);
    setRemoveMode(false);
    setSelectedForRemoval(new Set());
  };

  // ─── Advance to next exercise / finish ──────────────────────────────────────

  const advance = () => {
    const activeIndex = cards.findIndex((c) => c.cardId === activeCardId);
    const nextCard = cards[activeIndex + 1];
    if (nextCard) {
      selectCard(nextCard.cardId);
    } else {
      setShowFinishModal(true);
    }
  };

  const requestAdvance = () => {
    const sets = cardSets[activeCardId ?? ''] ?? [];
    const allChecked = sets.length > 0 && sets.every((s) => s.loggedAt !== null);
    if (allChecked) {
      advance();
    } else {
      setShowUnfinishedWarning(true);
    }
  };

  // ─── Add / delete cards ──────────────────────────────────────────────────────

  const addCard = (exercise: Exercise) => {
    const newCard: WorkoutCard = {
      cardId: mkId(),
      exercise,
    };
    setCards((prev) => [...prev, newCard]);
    selectCard(newCard.cardId);
    setShowPicker(false);
    setPickerSearch('');

    const setsPerExercise = localPrefs?.sets_per_exercise ?? DEFAULT_WORKOUT_PREFS.sets_per_exercise;
    if (isTimeBased(exercise)) {
      setCardSets((prev) => ({ ...prev, [newCard.cardId]: generateInitialSets(exercise, null, setsPerExercise, weightUnit) }));
      return;
    }
    getLastSetsForExercise(exerciseRefOf(exercise)).then((sets) => {
      const suggestion = localPrefs ? computeProgressSuggestion(sets, localPrefs.progress_reps, weightUnit, t) : null;
      setSuggestions((prev) => ({ ...prev, [newCard.cardId]: suggestion }));
      setCardSets((prev) => ({ ...prev, [newCard.cardId]: generateInitialSets(exercise, suggestion, setsPerExercise, weightUnit) }));
    });
  };

  const confirmDeleteCard = async () => {
    if (!deletingCardId) return;
    if (workoutRef.current) {
      const workoutId = await workoutRef.current;
      const card = cards.find((c) => c.cardId === deletingCardId);
      if (card) {
        const exerciseRef = exerciseRefOf(card.exercise);
        await deleteSetsByExercise(workoutId, exerciseRef);
      }
    }
    materializedCardIds.current.delete(deletingCardId);
    const remaining = cards.filter((c) => c.cardId !== deletingCardId);
    setCards(remaining);
    setCardSets((prev) => { const n = { ...prev }; delete n[deletingCardId!]; return n; });
    setSuggestions((prev) => { const n = { ...prev }; delete n[deletingCardId!]; return n; });
    setActiveCardId((prev) => (prev === deletingCardId ? (remaining[0]?.cardId ?? null) : prev));
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
    const oldExerciseId = exerciseRefOf(card.exercise);
    updatePendingSlotExercise(oldExerciseId, exercise);
    if (workoutRef.current) {
      const workoutId = await workoutRef.current;
      await deleteSetsByExercise(workoutId, oldExerciseId);
    }
    materializedCardIds.current.delete(cardId);
    setCards((prev) => prev.map((c) => (c.cardId === cardId ? { ...c, exercise } : c)));
    setSuggestions((prev) => { const n = { ...prev }; delete n[cardId]; return n; });
    setSwitchingCardId(null);
    setSwitchSearch('');

    const setsPerExercise = localPrefs?.sets_per_exercise ?? DEFAULT_WORKOUT_PREFS.sets_per_exercise;
    if (isTimeBased(exercise)) {
      setCardSets((prev) => ({ ...prev, [cardId]: generateInitialSets(exercise, null, setsPerExercise, weightUnit) }));
      return;
    }
    getLastSetsForExercise(exerciseRefOf(exercise)).then((sets) => {
      const suggestion = localPrefs ? computeProgressSuggestion(sets, localPrefs.progress_reps, weightUnit, t) : null;
      setSuggestions((prev) => ({ ...prev, [cardId]: suggestion }));
      setCardSets((prev) => ({ ...prev, [cardId]: generateInitialSets(exercise, suggestion, setsPerExercise, weightUnit) }));
    });
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

  const activeCard = cards.find((c) => c.cardId === activeCardId) ?? null;
  const isLastExercise = cards.findIndex((c) => c.cardId === activeCardId) === cards.length - 1;

  return (
    <Animated.View style={[{ flex: 1 }, panelStyle]}>
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#0c0c0e', borderBottomWidth: 1, borderBottomColor: C.border }}>
        <TouchableOpacity
          onPress={closePanel}
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

      {/* Exercise tab strip */}
      <ExerciseTabStrip
        cards={cards.map((c) => ({ cardId: c.cardId, hasSets: (cardSets[c.cardId] ?? []).some((s) => s.loggedAt !== null) }))}
        activeCardId={activeCardId}
        onSelect={selectCard}
        onAdd={() => { if (!isRestoring) setShowPicker(true); }}
      />

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
        {activeCard ? (
          <ExerciseCard
            key={activeCard.cardId}
            exercise={activeCard.exercise}
            sets={cardSets[activeCard.cardId] ?? []}
            suggestion={suggestions[activeCard.cardId] ?? null}
            weightUnit={weightUnit}
            removeMode={removeMode}
            selectedForRemoval={selectedForRemoval}
            onSwitch={() => setSwitchingCardId(activeCard.cardId)}
            onDelete={() => setDeletingCardId(activeCard.cardId)}
            onSetWeightChange={(setId, v) => onSetWeightChange(activeCard.cardId, setId, v)}
            onSetSecondaryChange={(setId, v) => onSetSecondaryChange(activeCard.cardId, setId, v)}
            onSetBlur={(setId) => onSetBlur(activeCard.cardId, setId)}
            onToggleChecked={(setId) => toggleSetChecked(activeCard.cardId, setId)}
            onToggleSelectForRemoval={toggleSelectForRemoval}
            onAddWarmupSet={() => addWarmupSet(activeCard.cardId)}
            onAddSet={() => addSet(activeCard.cardId)}
            onEnterRemoveMode={enterRemoveMode}
            onCancelRemoveMode={cancelRemoveMode}
            onConfirmRemove={() => requestConfirmRemove(activeCard.cardId)}
            onGenerateSets={() => regenerateSets(activeCard.cardId)}
            isLastExercise={isLastExercise}
            onAdvance={requestAdvance}
          />
        ) : isRestoring ? (
          <View style={{ paddingVertical: 64, alignItems: 'center', gap: 12 }}>
            <ActivityIndicator color={C.textMuted} />
            <Text style={{ color: C.textDim, fontSize: 14 }}>{t('loadingWorkout')}</Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setShowPicker(true)}
            style={{ paddingVertical: 32, borderRadius: 12, borderWidth: 2, borderColor: C.border, borderStyle: 'dashed', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
          >
            <Ionicons name="add" size={18} color={C.textDim} />
            <Text style={{ color: C.textDim, fontWeight: '600', fontSize: 15 }}>{t('routines:addExercise')}</Text>
          </TouchableOpacity>
        )}
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

          <FlatList
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: pickerListBottomPadding }}
            data={switchCandidates}
            keyExtractor={(candidate) => candidate.id ?? candidate.name}
            initialNumToRender={20}
            windowSize={7}
            ListHeaderComponent={
              <TouchableOpacity
                onPress={() => setShowCreate(true)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border }}
              >
                <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderAlt, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="add" size={18} color={C.text} />
                </View>
                <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>{t('routines:createExercise')}</Text>
              </TouchableOpacity>
            }
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingTop: 48, paddingHorizontal: 32 }}>
                <Text style={{ color: C.textDim, fontSize: 15, textAlign: 'center' }}>
                  {q ? t('routines:noExercisesMatchSearch') : t('noSimilarExercisesFound')}
                </Text>
              </View>
            }
            renderItem={({ item: candidate }) => (
              <TouchableOpacity
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
            )}
          />
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

          <FlatList
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: pickerListBottomPadding }}
            data={pickerCandidates}
            keyExtractor={(candidate) => candidate.id ?? candidate.name}
            initialNumToRender={20}
            windowSize={7}
            ListHeaderComponent={
              <TouchableOpacity
                onPress={() => setShowCreateForAdd(true)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border }}
              >
                <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderAlt, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="add" size={18} color={C.text} />
                </View>
                <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>{t('routines:createExercise')}</Text>
              </TouchableOpacity>
            }
            renderItem={({ item: candidate }) => (
              <TouchableOpacity
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
            )}
          />
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

      {/* Unfinished sets warning */}
      <ConfirmModal
        visible={showUnfinishedWarning}
        title={t('unfinishedSetsTitle')}
        message={t('unfinishedSetsMessage')}
        confirmLabel={t('continueAnyway')}
        onCancel={() => setShowUnfinishedWarning(false)}
        onConfirm={() => { setShowUnfinishedWarning(false); advance(); }}
      />

      {/* Remove sets confirmation */}
      <ConfirmModal
        visible={pendingRemoval !== null}
        title={t('removeSetsTitle')}
        message={t('removeSetsMessage', { count: pendingRemoval?.ids.length ?? 0 })}
        confirmLabel={t('remove')}
        destructive
        onCancel={() => setPendingRemoval(null)}
        onConfirm={confirmRemoveSets}
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
    </Animated.View>
  );
}
