import { View, Text, ScrollView, TouchableOpacity, StatusBar } from "react-native";
import { useState } from 'react';
import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useExercises } from '@/hooks/useExercises';
import { useRoutines } from '@/hooks/useRoutines';
import { setPendingWorkout } from '@/lib/pendingWorkout';
import type { GeneratedSlot } from '@/lib/generateWorkout';
import type { Routine } from '@/db/routines';
import type { Exercise } from '@/db/exercises';
import { getExerciseDisplayName } from '@/lib/exerciseTranslations';
import { C, accent } from '@/theme/colors';

type ScreenView = 'menu' | 'routines';

export default function PickDayScreen() {
  const { t, i18n } = useTranslation('routines');
  const locale = i18n.language;
  const router = useRouter();
  const { exercises } = useExercises();
  const { routines } = useRoutines();
  const [view, setView] = useState<ScreenView>('menu');

  const handleManual = () => {
    setPendingWorkout([], []);
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
          icon={<MaterialCommunityIcons name="dumbbell" size={19} color={accent.teal} />}
          iconBg="rgba(20,184,166,0.15)"
          title={t('manualMode')}
          subtitle={t('buildFromScratch')}
          onPress={handleManual}
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
