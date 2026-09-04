import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar } from "react-native";
import { useState } from 'react';
import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSplit } from './hooks/useSplit';
import { useExercises } from './hooks/useExercises';
import { useWorkoutPreferences } from './hooks/useWorkoutPreferences';
import { useRoutines } from './hooks/useRoutines';
import { getAllExerciseStats } from './db/exerciseStats';
import { generateWorkout, type GeneratedSlot } from './lib/generateWorkout';
import { setPendingWorkout } from './lib/pendingWorkout';
import type { Routine } from './db/routines';
import type { Exercise } from './db/exercises';
import {
  compressMuscles,
  expandMuscles,
  MUSCLE_SECTIONS_SPLIT,
  SUPER_MUSCLE_MAP,
  getSuperState,
  type SplitDay,
  type SuperState,
} from './constants/splits';
import { getMuscleLabels, getExerciseDisplayName } from './lib/exerciseTranslations';
import { getDayNameLabel } from './lib/splitTranslations';
import { C, accent } from './theme/colors';

type ScreenView = 'menu' | 'daypicker' | 'musclepicker' | 'routines';

export default function PickDayScreen() {
  const { t, i18n } = useTranslation('routines');
  const locale = i18n.language;
  const router = useRouter();
  const { split, isLoading } = useSplit();
  const { exercises } = useExercises();
  const { prefs } = useWorkoutPreferences();
  const { routines } = useRoutines();
  const [view, setView] = useState<ScreenView>('menu');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);

  const activeMuscles = selectedDay
    ? expandMuscles(split?.days.find((d) => d.name === selectedDay)?.muscles ?? [])
    : expandMuscles(selectedMuscles);
  const canGenerate = activeMuscles.length > 0 && exercises.length > 0 && prefs !== null;

  const handleManual = (muscles: string[]) => {
    setPendingWorkout([], muscles);
    router.replace('/generated-workout');
  };

  const handleRoutine = (routine: Routine) => {
    const orderedExercises = routine.exercise_ids
      .map((id) => exercises.find((e) => e.id === id))
      .filter(Boolean) as Exercise[];
    const slots: GeneratedSlot[] = orderedExercises.map((ex) => ({ exercise: ex }));
    setPendingWorkout(slots, []);
    router.replace('/generated-workout');
  };

  const handleGenerate = async () => {
    if (!canGenerate || !prefs) return;
    const stats = await getAllExerciseStats();
    const slots = generateWorkout(activeMuscles, exercises, stats, prefs);
    setPendingWorkout(slots, activeMuscles, selectedDay);
    router.replace('/generated-workout');
  };

  const toggleMuscle = (muscle: string) => {
    setSelectedMuscles((prev) =>
      prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle]
    );
  };

  const BackHeader = ({ title, onBack }: { title: string; onBack: () => void }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}>
      <TouchableOpacity
        onPress={onBack}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name="arrow-back" size={18} color={C.textMuted} />
      </TouchableOpacity>
      <Text style={{ flex: 1, textAlign: 'center', color: C.text, fontSize: 17, fontWeight: '700' }}>
        {title}
      </Text>
      <View style={{ width: 36 }} />
    </View>
  );

  // ─── Muscle picker sub-screen (reached from day-of-split view) ────────────
  if (view === 'musclepicker') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <BackHeader title={t('whatMusclesTitle')} onBack={() => setView('daypicker')} />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <MuscleGrid selected={selectedMuscles} onToggle={toggleMuscle} />
        </ScrollView>

        <View style={{ paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.card, gap: 10 }}>
          {canGenerate && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleGenerate}
              style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.borderAlt, borderRadius: 14, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
            >
              <Ionicons name="sparkles" size={16} color={C.text} />
              <Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }}>{t('generateWorkout')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => handleManual(activeMuscles)}
            style={{ backgroundColor: accent.green, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
          >
            <Text style={{ color: '#052e1c', fontSize: 16, fontWeight: '700' }}>
              {selectedMuscles.length > 0 ? t('continueManually') : t('skip')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Day-of-split picker ────────────────────────────────────────────────
  if (view === 'daypicker') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <BackHeader title={t('whatAreYouTrainingToday')} onBack={() => setView('menu')} />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <ActivityIndicator color={C.textMuted} style={{ marginTop: 48 }} />
          ) : (
            <>
              {split?.days.map((day, index) => (
                <DayCard
                  key={index}
                  day={day}
                  selected={selectedDay === day.name}
                  onPress={() => setSelectedDay(day.name)}
                />
              ))}

              {!split && (
                <Text style={{ color: C.textDim, fontSize: 14, textAlign: 'center', marginBottom: 24, marginTop: 8 }}>
                  {t('noSplitConfigured')}
                </Text>
              )}

              <CustomCard onPress={() => setView('musclepicker')} />

              <View style={{ height: 1, backgroundColor: C.card, marginVertical: 24 }} />

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleGenerate}
                disabled={!canGenerate}
                style={{ backgroundColor: canGenerate ? C.card : 'rgba(24,24,27,0.5)', borderWidth: 1, borderColor: canGenerate ? accent.green : C.border, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: canGenerate ? 'rgba(16,185,129,0.15)' : C.border, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="sparkles" size={17} color={canGenerate ? accent.green : C.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: canGenerate ? C.text : C.textMuted, fontSize: 16, fontWeight: '700' }}>{t('generateWorkout')}</Text>
                  <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 2 }}>
                    {canGenerate ? t('generateWorkoutBasedOnMuscles') : t('selectDayToEnable')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.textDim} />
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Routine picker ─────────────────────────────────────────────────────
  if (view === 'routines') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <BackHeader title={t('routinesTab')} onBack={() => setView('menu')} />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {routines.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
              <Ionicons name="list-outline" size={44} color={C.borderAlt} style={{ marginBottom: 14 }} />
              <Text style={{ color: C.text, fontSize: 17, fontWeight: '700', marginBottom: 8 }}>{t('noRoutinesYet')}</Text>
              <Text style={{ color: C.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
                {t('createRoutineHint')}
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/edit-routine')}
                style={{ backgroundColor: accent.blue, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 24 }}
              >
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{t('createRoutine')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            routines.map((routine) => {
              const routineExercises = routine.exercise_ids
                .map((id) => exercises.find((e) => e.id === id))
                .filter(Boolean) as Exercise[];
              const exerciseNames = routineExercises.map((e) => getExerciseDisplayName(e, locale));
              return (
                <RoutineCard
                  key={routine.id}
                  routine={routine}
                  exerciseNames={exerciseNames}
                  onPress={() => handleRoutine(routine)}
                />
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Top-level menu ─────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="close" size={18} color={C.textMuted} />
        </TouchableOpacity>
        <Text style={{ flex: 1, textAlign: 'center', color: C.text, fontSize: 17, fontWeight: '700' }}>
          {t('whatAreYouTrainingToday')}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <MenuOption
          icon={<Ionicons name="calendar-clear-outline" size={19} color={C.textDim} />}
          iconBg={C.border}
          title={t('menuProgramOfToday')}
          subtitle={t('comingSoon')}
          disabled
          onPress={() => {}}
        />
        <MenuOption
          icon={<Ionicons name="list" size={19} color={accent.blue} />}
          iconBg="rgba(59,130,246,0.15)"
          title={t('menuRoutine')}
          subtitle={t('menuRoutineHint')}
          onPress={() => setView('routines')}
        />
        <MenuOption
          icon={<Ionicons name="calendar" size={19} color={accent.green} />}
          iconBg="rgba(16,185,129,0.15)"
          title={t('menuDaySplit')}
          subtitle={t('menuDaySplitHint')}
          onPress={() => setView('daypicker')}
        />
        <MenuOption
          icon={<MaterialCommunityIcons name="dumbbell" size={19} color={accent.teal} />}
          iconBg="rgba(20,184,166,0.15)"
          title={t('manualMode')}
          subtitle={t('buildFromScratch')}
          onPress={() => handleManual([])}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuOption({ icon, iconBg, title, subtitle, onPress, disabled }: {
  icon: ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={disabled ? 1 : 0.8}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={{
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 16,
        paddingHorizontal: 18,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontSize: 16, fontWeight: '700' }}>{title}</Text>
        <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 2 }}>{subtitle}</Text>
      </View>
      {!disabled && <Ionicons name="chevron-forward" size={18} color={C.textDim} />}
    </TouchableOpacity>
  );
}

function MuscleGrid({ selected, onToggle }: { selected: string[]; onToggle: (m: string) => void }) {
  const { t: tExplore, i18n } = useTranslation('explore');
  const locale = i18n.language;

  function handleSuperToggle(superKey: string) {
    const children = SUPER_MUSCLE_MAP[superKey];
    const state = getSuperState(superKey, selected);
    if (state === 'all') {
      children.forEach((c) => { if (selected.includes(c)) onToggle(c); });
    } else {
      children.forEach((c) => { if (!selected.includes(c)) onToggle(c); });
    }
  }

  return (
    <View>
      {MUSCLE_SECTIONS_SPLIT.map((section) => (
        <View key={section.id} style={{ marginBottom: 12 }}>
          <Text style={{ color: C.textDim, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
            {tExplore(`addExerciseModal.muscleSections.${section.id}`)}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {section.muscles.map((muscle) => {
              if (section.isSuper) {
                const state = getSuperState(muscle, selected);
                return (
                  <MuscleChip
                    key={muscle}
                    muscle={muscle}
                    label={getMuscleLabels([muscle], locale)[0]}
                    isSelected={false}
                    isSuper
                    superState={state}
                    onPress={() => handleSuperToggle(muscle)}
                  />
                );
              }
              return (
                <MuscleChip
                  key={muscle}
                  muscle={muscle}
                  label={getMuscleLabels([muscle], locale)[0]}
                  isSelected={selected.includes(muscle)}
                  isSuper={false}
                  onPress={() => onToggle(muscle)}
                />
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

function MuscleChip({ muscle, label, isSelected, isSuper, superState, onPress }: {
  muscle: string;
  label: string;
  isSelected: boolean;
  isSuper: boolean;
  superState?: SuperState;
  onPress: () => void;
}) {
  const isSome = isSuper && superState === 'some';
  const isAll = isSuper && superState === 'all';
  const effectiveSelected = isSuper ? isAll : isSelected;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: effectiveSelected ? accent.green : isSome ? '#1c1c1f' : C.card,
        borderWidth: 1,
        borderColor: effectiveSelected ? accent.green : isSome ? C.borderAlt : isSuper ? C.borderAlt : C.border,
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      {isSuper && (
        <Ionicons name="layers-outline" size={11} color={effectiveSelected ? '#052e1c' : C.textMuted} />
      )}
      <Text style={{ fontSize: 13, fontWeight: '600', color: effectiveSelected ? '#052e1c' : C.text }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function DayCard({ day, selected, onPress }: { day: SplitDay; selected: boolean; onPress: () => void }) {
  const { t, i18n } = useTranslation('routines');
  const muscleLabel = getMuscleLabels(compressMuscles(day.muscles), i18n.language).join(' · ');

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={{
        backgroundColor: selected ? '#1c1c1f' : C.card,
        borderWidth: 1,
        borderColor: selected ? accent.green : C.border,
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 18,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontSize: 17, fontWeight: '700', marginBottom: 4 }}>{getDayNameLabel(day.name, t)}</Text>
        {muscleLabel ? (
          <Text style={{ color: C.textMuted, fontSize: 13 }}>{muscleLabel}</Text>
        ) : null}
      </View>
      {selected
        ? <Ionicons name="checkmark-circle" size={22} color={accent.green} />
        : <Ionicons name="chevron-forward" size={18} color={C.textDim} />
      }
    </TouchableOpacity>
  );
}

function RoutineCard({ routine, exerciseNames, onPress }: { routine: Routine; exerciseNames: string[]; onPress: () => void }) {
  const { t } = useTranslation('routines');
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={{
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 18,
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: exerciseNames.length > 0 ? 10 : 0 }}>
        <Text style={{ color: C.text, fontSize: 17, fontWeight: '700', flex: 1 }}>{routine.name}</Text>
        <Ionicons name="chevron-forward" size={18} color={C.textDim} />
      </View>
      {exerciseNames.length > 0 ? (
        <View style={{ flexDirection: 'row', overflow: 'hidden' }}>
          {exerciseNames.map((name, i) => (
            <View
              key={i}
              style={{
                backgroundColor: C.border,
                borderRadius: 6,
                paddingHorizontal: 8,
                paddingVertical: 4,
                marginRight: 6,
                flexShrink: 0,
              }}
            >
              <Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
                {name}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={{ color: C.textDim, fontSize: 13 }}>{t('noExercises')}</Text>
      )}
    </TouchableOpacity>
  );
}

function CustomCard({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation('routines');
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={{
        backgroundColor: C.bg,
        borderWidth: 1,
        borderColor: C.borderAlt,
        borderStyle: 'dashed',
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 18,
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#a1a1aa', fontSize: 17, fontWeight: '700' }}>{t('customWorkout')}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={C.textDim} />
    </TouchableOpacity>
  );
}
