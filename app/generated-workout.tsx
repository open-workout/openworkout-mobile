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
import { insertWorkout, deleteWorkout, getWorkoutById, updateWorkoutSupersetLinks } from './db/workouts';
import { insertSet, deleteSetsByExercise, getLastSetsForExercise, getSetsForWorkout, generateId, type NewSetInput } from './db/sets';
import { getAllExercises } from './db/exercises';
import { getPendingWorkout, clearPendingWorkout, restorePendingWorkout, updatePendingSlotExercise } from './lib/pendingWorkout';
import { findAlternatives } from './lib/generateWorkout';
import { compressMuscles } from './constants/splits';
import type { Exercise, NewExerciseInput } from './db/exercises';
import { isSetFilled, defaultMeasurementType, type LocalSet, type MeasurementType } from './components/SetRows';
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

// Progressive-overload suggestions are a weight/reps heuristic — only
// meaningful for exercises whose default (highest-priority) mode is reps.
function suggestsProgress(exercise: Exercise): boolean {
  return defaultMeasurementType(exercise) === 'reps';
}

function exerciseRefOf(exercise: Exercise): string {
  return exercise.id || exercise.name;
}

// Partitions cards into contiguous groups using a flat "linked with next" edge
// set — a chain of linked cardIds (A linked, B linked, C standalone) becomes
// one group [A, B, C], letting 2+ exercises be superset together with no
// separate group-object bookkeeping.
function computeGroups(cards: WorkoutCard[], linkedWithNext: Set<string>): WorkoutCard[][] {
  const groups: WorkoutCard[][] = [];
  let current: WorkoutCard[] = [];
  for (const card of cards) {
    current.push(card);
    if (!linkedWithNext.has(card.cardId)) {
      groups.push(current);
      current = [];
    }
  }
  if (current.length) groups.push(current);
  return groups;
}

function generateInitialSets(
  exercise: Exercise,
  suggestion: OverloadSuggestion | null,
  count: number,
  weightUnit: 'kg' | 'lbs',
  measurementType: MeasurementType,
): LocalSet[] {
  const isReps = measurementType === 'reps';
  return Array.from({ length: Math.max(1, count) }, (_, i) => ({
    id: generateId(),
    weight: exercise.requires_weight && isReps && suggestion ? String(suggestion.weight) : '',
    reps: isReps && suggestion && !suggestion.isAmrap ? String(suggestion.reps) : '',
    durationSeconds: '',
    distance: '',
    unit: weightUnit,
    measurementType,
    loggedAt: null,
    isWarmup: false,
    position: i,
    dropSetNumber: 0,
  }));
}

// Blank fields are stored as a -1 sentinel (weight=0 is a legitimate bodyweight
// value, so it can't double as "blank"). A set can only ever reach a real
// (non-'pending') logged_at once its required fields are non-blank, so every
// history/suggestion/PR query already excluding 'pending' rows never observes -1.
function toDbFields(set: LocalSet) {
  return {
    reps: set.measurementType === 'reps' && set.reps.trim() ? parseFloat(set.reps) : -1,
    difficulty: 0,
    weight: set.weight.trim() ? parseFloat(set.weight) : -1,
    unit: set.unit,
    logged_at: set.loggedAt ? set.loggedAt.toISOString() : 'pending',
    duration_seconds: set.measurementType === 'time' && set.durationSeconds.trim() ? (parseInt(set.durationSeconds, 10) || 0) : null,
    distance: set.measurementType === 'distance' && set.distance.trim() ? parseFloat(set.distance) : null,
    measurement_type: set.measurementType,
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
  // Which reps/time/distance mode a *new* blank set on this card should use —
  // changing it never touches sets that already have a value entered.
  const [currentMeasurementType, setCurrentMeasurementType] = useState<Record<string, MeasurementType>>(() =>
    Object.fromEntries(cards.map((c) => [c.cardId, defaultMeasurementType(c.exercise)])),
  );
  const [suggestions, setSuggestions] = useState<Record<string, OverloadSuggestion | null>>({});
  const [localPrefs, setLocalPrefs] = useState<WorkoutPreferences | null>(null);
  const [isRestoring, setIsRestoring] = useState(() => !!resumeWorkoutId);

  // Supersets — cardIds linked with whichever card comes right after them.
  const [linkedWithNext, setLinkedWithNext] = useState<Set<string>>(new Set());
  const pendingAdvanceFromCardId = useRef<string | null>(null);

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

  // Remove-sets multi-select mode — scoped to a single card, since 2+ cards
  // can be visible at once when they're superset together.
  const [removeModeCardId, setRemoveModeCardId] = useState<string | null>(null);
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
    setRemoveModeCardId(null);
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
        const newCurrentMeasurementType: Record<string, MeasurementType> = {};
        const handledExIds = new Set<string>();
        const materializedIds: string[] = [];
        const generationTasks: Promise<void>[] = [];

        const toLocalSets = (exSets: typeof dbSets): LocalSet[] =>
          exSets.map((s) => ({
            id: s.id,
            weight: s.weight === -1 ? '' : String(s.weight),
            reps: s.reps === -1 ? '' : String(s.reps),
            durationSeconds: s.duration_seconds != null ? String(s.duration_seconds) : '',
            distance: s.distance != null ? String(s.distance) : '',
            unit: s.unit as 'kg' | 'lbs',
            measurementType: (s.measurement_type as MeasurementType) || 'reps',
            loggedAt: s.logged_at === 'pending' ? null : new Date(s.logged_at),
            isWarmup: s.is_warmup === 1,
            position: s.position,
            dropSetNumber: s.drop_set_number,
          }));

        const addCard = (exercise: Exercise, exId: string) => {
          const cardId = mkId();
          const exSets = grouped.get(exId) ?? [];
          newCards.push({ cardId, exercise });
          handledExIds.add(exId);
          const measurementType = defaultMeasurementType(exercise);
          newCurrentMeasurementType[cardId] = measurementType;

          if (exSets.length > 0) {
            newCardSets[cardId] = toLocalSets(exSets);
            materializedIds.push(cardId);
            return;
          }

          if (!suggestsProgress(exercise)) {
            newCardSets[cardId] = generateInitialSets(exercise, null, localPrefs.sets_per_exercise, weightUnit, measurementType);
            return;
          }
          generationTasks.push(
            getLastSetsForExercise(exerciseRefOf(exercise)).then((sets) => {
              const suggestion = computeProgressSuggestion(sets, localPrefs.progress_reps, weightUnit, t);
              newSuggestions[cardId] = suggestion;
              newCardSets[cardId] = generateInitialSets(exercise, suggestion, localPrefs.sets_per_exercise, weightUnit, measurementType);
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
            .filter((c) => suggestsProgress(c.exercise) && !(c.cardId in newSuggestions))
            .map(async (c) => {
              const sets = await getLastSetsForExercise(exerciseRefOf(c.exercise));
              newSuggestions[c.cardId] = computeProgressSuggestion(sets, localPrefs.progress_reps, weightUnit, t);
            }),
        );

        materializedIds.forEach((id) => materializedCardIds.current.add(id));
        setCards(newCards);
        setCardSets(newCardSets);
        setSuggestions(newSuggestions);
        setCurrentMeasurementType(newCurrentMeasurementType);
        setActiveCardId(newCards[0]?.cardId ?? null);

        const workoutRow = await getWorkoutById(resumeWorkoutId);
        if (workoutRow) {
          try {
            const links: string[] = JSON.parse(workoutRow.superset_links);
            const restoredLinked = new Set<string>();
            for (const ref of links) {
              const match = newCards.find((c) => exerciseRefOf(c.exercise) === ref);
              if (match) restoredLinked.add(match.cardId);
            }
            setLinkedWithNext(restoredLinked);
          } catch {
            // corrupt/legacy value — treat as no links
          }
        }

        setIsRestoring(false);
      },
    );
  }, [resumeWorkoutId, localPrefs, exercisesLoading]);

  // Fresh workout: generate local (not-yet-persisted) sets for the initial slots.
  useEffect(() => {
    if (!localPrefs || resumeWorkoutId) return;
    Promise.all(
      cards.map(async (card) => {
        if (!suggestsProgress(card.exercise)) return { cardId: card.cardId, suggestion: null as OverloadSuggestion | null };
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
          const measurementType = currentMeasurementType[card.cardId] ?? defaultMeasurementType(card.exercise);
          next[card.cardId] = generateInitialSets(card.exercise, suggMap[card.cardId] ?? null, localPrefs.sets_per_exercise, weightUnit, measurementType);
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

  // ─── Supersets ───────────────────────────────────────────────────────────────

  // Persists which cards are linked, translating cardIds to exercise refs
  // (cardIds are regenerated every session, so they can't be stored directly).
  const persistSupersetLinks = async (linked: Set<string>) => {
    const refs = cards.filter((c) => linked.has(c.cardId)).map((c) => exerciseRefOf(c.exercise));
    const workoutId = await ensureWorkout();
    await updateWorkoutSupersetLinks(workoutId, refs);
  };

  const toggleLinkWithNext = (cardId: string) => {
    setLinkedWithNext((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      persistSupersetLinks(next);
      return next;
    });
  };

  // ─── Set operations ─────────────────────────────────────────────────────────

  // Persists a whole card's local sets to the DB for the first time.
  const materializeCard = async (cardId: string, exerciseRef: string, sets: LocalSet[]) => {
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
        drop_set_number: s.dropSetNumber,
        ...toDbFields(s),
      };
      await insertSet(input);
    }
  };

  // Either materializes the whole card (first interaction) or updates one already-persisted set.
  const materializeOrUpdate = async (cardId: string, exerciseRef: string, allSets: LocalSet[], changedSet: LocalSet) => {
    if (!materializedCardIds.current.has(cardId)) {
      await materializeCard(cardId, exerciseRef, allSets);
    } else {
      await editSet(changedSet.id, toDbFields(changedSet));
    }
  };

  // Either materializes the whole card (including the new set) or inserts just the new set.
  const materializeOrInsert = async (cardId: string, exerciseRef: string, allSets: LocalSet[], newSet: LocalSet) => {
    if (!materializedCardIds.current.has(cardId)) {
      await materializeCard(cardId, exerciseRef, allSets);
    } else {
      const workoutId = await ensureWorkout();
      await insertSet({
        id: newSet.id,
        workout_id: workoutId,
        exercise_id: exerciseRef,
        is_warmup: newSet.isWarmup ? 1 : 0,
        position: newSet.position,
        drop_set_number: newSet.dropSetNumber,
        ...toDbFields(newSet),
      });
    }
  };

  const toggleSetChecked = (cardId: string, setId: string) => {
    const card = cards.find((c) => c.cardId === cardId);
    if (!card) return;
    const current = cardSets[cardId] ?? [];
    const target = current.find((s) => s.id === setId);
    if (!target) return;

    let nextSet: LocalSet;
    if (target.loggedAt !== null) {
      nextSet = { ...target, loggedAt: null };
    } else {
      if (!isSetFilled(target, card.exercise.requires_weight)) return;
      nextSet = { ...target, loggedAt: new Date() };
    }
    const nextSets = current.map((s) => (s.id === setId ? nextSet : s));
    setCardSets((prev) => ({ ...prev, [cardId]: nextSets }));
    materializeOrUpdate(cardId, exerciseRefOf(card.exercise), nextSets, nextSet);
  };

  const updateSetField = (cardId: string, setId: string, field: 'weight' | 'reps' | 'durationSeconds' | 'distance', value: string) => {
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
    const set = (cardSets[cardId] ?? []).find((s) => s.id === setId);
    const field = set?.measurementType === 'time' ? 'durationSeconds' : set?.measurementType === 'distance' ? 'distance' : 'reps';
    updateSetField(cardId, setId, field, value);
  };

  const onSetBlur = (cardId: string, setId: string) => {
    const card = cards.find((c) => c.cardId === cardId);
    if (!card) return;
    const sets = cardSets[cardId] ?? [];
    const set = sets.find((s) => s.id === setId);
    if (!set) return;
    materializeOrUpdate(cardId, exerciseRefOf(card.exercise), sets, set);
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
      distance: '',
      unit: weightUnit,
      measurementType: currentMeasurementType[cardId] ?? defaultMeasurementType(card.exercise),
      loggedAt: null,
      isWarmup: true,
      position: minPos - 1,
      dropSetNumber: 0,
    };
    const nextSets = [newSet, ...current];
    setCardSets((prev) => ({ ...prev, [cardId]: nextSets }));
    materializeOrInsert(cardId, exerciseRefOf(card.exercise), nextSets, newSet);
  };

  const addSet = (cardId: string) => {
    const card = cards.find((c) => c.cardId === cardId);
    if (!card) return;
    const current = cardSets[cardId] ?? [];
    const last = current[current.length - 1];
    const maxPos = current.length ? Math.max(...current.map((s) => s.position)) : -1;
    const measurementType = currentMeasurementType[cardId] ?? defaultMeasurementType(card.exercise);
    const newSet: LocalSet = {
      id: generateId(),
      weight: last?.weight ?? '',
      reps: last?.measurementType === measurementType ? last.reps : '',
      durationSeconds: last?.measurementType === measurementType ? last.durationSeconds : '',
      distance: last?.measurementType === measurementType ? last.distance : '',
      unit: weightUnit,
      measurementType,
      loggedAt: null,
      isWarmup: false,
      position: maxPos + 1,
      dropSetNumber: 0,
    };
    const nextSets = [...current, newSet];
    setCardSets((prev) => ({ ...prev, [cardId]: nextSets }));
    materializeOrInsert(cardId, exerciseRefOf(card.exercise), nextSets, newSet);
  };

  // Inserts a reduced-weight continuation set immediately after the one it's
  // dropped from — spliced into the array at the right index (not appended)
  // since on-screen order follows array order, and given a fractional
  // `position` between its neighbors so a resume reconstructs the same order.
  const addDropSet = (cardId: string, afterSetId: string) => {
    const card = cards.find((c) => c.cardId === cardId);
    if (!card || !card.exercise.requires_weight) return;
    const current = cardSets[cardId] ?? [];
    const idx = current.findIndex((s) => s.id === afterSetId);
    if (idx === -1) return;
    const parent = current[idx];
    const next = current[idx + 1];
    const newPosition = next ? (parent.position + next.position) / 2 : parent.position + 1;
    const parentWeight = parseFloat(parent.weight) || 0;
    const newWeight = parentWeight > 0 ? String(Math.round(parentWeight * 0.8 * 2) / 2) : '';
    const newSet: LocalSet = {
      id: generateId(),
      weight: newWeight,
      reps: '',
      durationSeconds: '',
      distance: '',
      unit: parent.unit,
      measurementType: parent.measurementType,
      loggedAt: null,
      isWarmup: false,
      position: newPosition,
      dropSetNumber: parent.dropSetNumber + 1,
    };
    const nextSets = [...current.slice(0, idx + 1), newSet, ...current.slice(idx + 1)];
    setCardSets((prev) => ({ ...prev, [cardId]: nextSets }));
    materializeOrInsert(cardId, exerciseRefOf(card.exercise), nextSets, newSet);
  };

  const regenerateSets = (cardId: string) => {
    const card = cards.find((c) => c.cardId === cardId);
    if (!card || !localPrefs) return;
    const suggestion = suggestions[cardId] ?? null;
    const measurementType = currentMeasurementType[cardId] ?? defaultMeasurementType(card.exercise);
    const nextSets = generateInitialSets(card.exercise, suggestion, localPrefs.sets_per_exercise, weightUnit, measurementType);
    setCardSets((prev) => ({ ...prev, [cardId]: nextSets }));
  };

  // Switches which mode a *new* blank set defaults to for this card. Sets that
  // already have a value entered for their own current mode are left alone —
  // only sets that are still blank (for their own mode) adopt the new one.
  const changeMeasurementType = (cardId: string, type: MeasurementType) => {
    setCurrentMeasurementType((prev) => ({ ...prev, [cardId]: type }));
    const current = cardSets[cardId] ?? [];
    const isMaterialized = materializedCardIds.current.has(cardId);
    const nextSets = current.map((s) => {
      const blank = s.measurementType === 'time' ? !s.durationSeconds.trim()
        : s.measurementType === 'distance' ? !s.distance.trim()
        : !s.reps.trim();
      if (!blank) return s;
      const updated: LocalSet = { ...s, measurementType: type };
      if (isMaterialized) editSet(updated.id, toDbFields(updated));
      return updated;
    });
    setCardSets((prev) => ({ ...prev, [cardId]: nextSets }));
  };

  const enterRemoveMode = (cardId: string) => {
    setRemoveModeCardId(cardId);
    setSelectedForRemoval(new Set());
  };

  const cancelRemoveMode = () => {
    setRemoveModeCardId(null);
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
    setRemoveModeCardId(null);
    setSelectedForRemoval(new Set());
  };

  // ─── Advance to next exercise / finish ──────────────────────────────────────

  // Advances past a whole superset group at once — the next card in the flat
  // `cards` array after a group's last member is guaranteed to be the next
  // group's first member, since groups partition `cards` contiguously.
  const advance = (fromGroup: WorkoutCard[]) => {
    const lastMember = fromGroup[fromGroup.length - 1];
    const lastIndex = cards.findIndex((c) => c.cardId === lastMember?.cardId);
    const nextCard = cards[lastIndex + 1];
    if (nextCard) {
      selectCard(nextCard.cardId);
    } else {
      setShowFinishModal(true);
    }
  };

  const requestAdvance = (fromCardId: string) => {
    const group = computeGroups(cards, linkedWithNext).find((g) => g.some((c) => c.cardId === fromCardId)) ?? [];
    const allChecked = group.every((member) => {
      const sets = cardSets[member.cardId] ?? [];
      return sets.length > 0 && sets.every((s) => s.loggedAt !== null);
    });
    if (allChecked) {
      advance(group);
    } else {
      pendingAdvanceFromCardId.current = fromCardId;
      setShowUnfinishedWarning(true);
    }
  };

  // ─── Add / delete cards ──────────────────────────────────────────────────────

  const addCard = (exercise: Exercise) => {
    const newCard: WorkoutCard = {
      cardId: mkId(),
      exercise,
    };
    const measurementType = defaultMeasurementType(exercise);
    setCards((prev) => [...prev, newCard]);
    setCurrentMeasurementType((prev) => ({ ...prev, [newCard.cardId]: measurementType }));
    selectCard(newCard.cardId);
    setShowPicker(false);
    setPickerSearch('');

    const setsPerExercise = localPrefs?.sets_per_exercise ?? DEFAULT_WORKOUT_PREFS.sets_per_exercise;
    if (!suggestsProgress(exercise)) {
      setCardSets((prev) => ({ ...prev, [newCard.cardId]: generateInitialSets(exercise, null, setsPerExercise, weightUnit, measurementType) }));
      return;
    }
    getLastSetsForExercise(exerciseRefOf(exercise)).then((sets) => {
      const suggestion = localPrefs ? computeProgressSuggestion(sets, localPrefs.progress_reps, weightUnit, t) : null;
      setSuggestions((prev) => ({ ...prev, [newCard.cardId]: suggestion }));
      setCardSets((prev) => ({ ...prev, [newCard.cardId]: generateInitialSets(exercise, suggestion, setsPerExercise, weightUnit, measurementType) }));
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
    const deletedIndex = cards.findIndex((c) => c.cardId === deletingCardId);
    const predecessor = cards[deletedIndex - 1];
    const remaining = cards.filter((c) => c.cardId !== deletingCardId);
    setCards(remaining);
    setCardSets((prev) => { const n = { ...prev }; delete n[deletingCardId!]; return n; });
    setSuggestions((prev) => { const n = { ...prev }; delete n[deletingCardId!]; return n; });
    setActiveCardId((prev) => (prev === deletingCardId ? (remaining[0]?.cardId ?? null) : prev));
    // Break both edges touching the deleted card — its neighbors' adjacency
    // changed, so any existing link no longer means what it used to.
    setLinkedWithNext((prev) => {
      const next = new Set(prev);
      next.delete(deletingCardId!);
      if (predecessor) next.delete(predecessor.cardId);
      persistSupersetLinks(next);
      return next;
    });
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
    const measurementType = defaultMeasurementType(exercise);
    setCurrentMeasurementType((prev) => ({ ...prev, [cardId]: measurementType }));
    setSwitchingCardId(null);
    setSwitchSearch('');
    // The persisted superset link list is keyed by exercise ref, not cardId —
    // refresh it now so it points at the newly-switched exercise.
    if (linkedWithNext.size > 0) {
      const refreshedCards = cards.map((c) => (c.cardId === cardId ? { ...c, exercise } : c));
      const refs = refreshedCards.filter((c) => linkedWithNext.has(c.cardId)).map((c) => exerciseRefOf(c.exercise));
      const workoutId = await ensureWorkout();
      await updateWorkoutSupersetLinks(workoutId, refs);
    }

    const setsPerExercise = localPrefs?.sets_per_exercise ?? DEFAULT_WORKOUT_PREFS.sets_per_exercise;
    if (!suggestsProgress(exercise)) {
      setCardSets((prev) => ({ ...prev, [cardId]: generateInitialSets(exercise, null, setsPerExercise, weightUnit, measurementType) }));
      return;
    }
    getLastSetsForExercise(exerciseRefOf(exercise)).then((sets) => {
      const suggestion = localPrefs ? computeProgressSuggestion(sets, localPrefs.progress_reps, weightUnit, t) : null;
      setSuggestions((prev) => ({ ...prev, [cardId]: suggestion }));
      setCardSets((prev) => ({ ...prev, [cardId]: generateInitialSets(exercise, suggestion, setsPerExercise, weightUnit, measurementType) }));
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

  const groups = computeGroups(cards, linkedWithNext);
  const activeGroup = groups.find((g) => g.some((c) => c.cardId === activeCardId)) ?? [];
  const activeGroupCardIds = new Set(activeGroup.map((c) => c.cardId));

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
        cards={cards.map((c) => ({
          cardId: c.cardId,
          hasSets: (cardSets[c.cardId] ?? []).some((s) => s.loggedAt !== null),
          linkedToNext: linkedWithNext.has(c.cardId),
        }))}
        activeGroupCardIds={activeGroupCardIds}
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
        {activeGroup.length > 0 ? (
          <View style={{ gap: 16 }}>
            {activeGroup.map((member) => {
              const memberIndex = cards.findIndex((c) => c.cardId === member.cardId);
              const memberIsLinked = linkedWithNext.has(member.cardId);
              return (
                <ExerciseCard
                  key={member.cardId}
                  exercise={member.exercise}
                  sets={cardSets[member.cardId] ?? []}
                  suggestion={suggestions[member.cardId] ?? null}
                  weightUnit={weightUnit}
                  removeMode={removeModeCardId === member.cardId}
                  selectedForRemoval={selectedForRemoval}
                  onSwitch={() => setSwitchingCardId(member.cardId)}
                  onDelete={() => setDeletingCardId(member.cardId)}
                  onSetWeightChange={(setId, v) => onSetWeightChange(member.cardId, setId, v)}
                  onSetSecondaryChange={(setId, v) => onSetSecondaryChange(member.cardId, setId, v)}
                  onSetBlur={(setId) => onSetBlur(member.cardId, setId)}
                  onToggleChecked={(setId) => toggleSetChecked(member.cardId, setId)}
                  onToggleSelectForRemoval={toggleSelectForRemoval}
                  onAddWarmupSet={() => addWarmupSet(member.cardId)}
                  onAddSet={() => addSet(member.cardId)}
                  onAddDropSet={(afterSetId) => addDropSet(member.cardId, afterSetId)}
                  onEnterRemoveMode={() => enterRemoveMode(member.cardId)}
                  onCancelRemoveMode={cancelRemoveMode}
                  onConfirmRemove={() => requestConfirmRemove(member.cardId)}
                  onGenerateSets={() => regenerateSets(member.cardId)}
                  isLastExercise={!memberIsLinked && memberIndex === cards.length - 1}
                  onAdvance={() => requestAdvance(member.cardId)}
                  canLinkWithNext={memberIndex < cards.length - 1}
                  isLinkedWithNext={memberIsLinked}
                  onToggleLinkWithNext={() => toggleLinkWithNext(member.cardId)}
                  showAdvanceButton={!memberIsLinked}
                  currentMeasurementType={currentMeasurementType[member.cardId] ?? defaultMeasurementType(member.exercise)}
                  onChangeMeasurementType={(type) => changeMeasurementType(member.cardId, type)}
                />
              );
            })}
          </View>
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
        onConfirm={() => {
          setShowUnfinishedWarning(false);
          const fromCardId = pendingAdvanceFromCardId.current;
          if (!fromCardId) return;
          const group = computeGroups(cards, linkedWithNext).find((g) => g.some((c) => c.cardId === fromCardId)) ?? [];
          advance(group);
        }}
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
