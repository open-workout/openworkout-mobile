import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMuscleDetail } from '@/hooks/useMuscleDetail';
import { PeriodSelector } from '@/components/stats/PeriodSelector';
import { TrainedDaysCalendar } from '@/components/stats/TrainedDaysCalendar';
import { SetHistoryList, type SetHistoryRow } from '@/components/stats/SetHistoryList';
import { getMuscleLabel } from '@/lib/exerciseTranslations';
import { DEFAULT_STATS_PERIODS, statsPeriodFromParams, type StatsPeriod } from '@/lib/statsPeriod';
import type { SimplifiedMuscle } from '@/lib/muscleMapping';
import { C, accent } from '@/theme/colors';

export default function MuscleStatsScreen() {
  const { t, i18n } = useTranslation('stats');
  const locale = i18n.language;
  const router = useRouter();
  const { muscle, periodKind, periodDays } = useLocalSearchParams<{
    muscle: string;
    periodKind?: string;
    periodDays?: string;
  }>();
  // Opens already scoped to whichever period the user had selected on the
  // Body screen (see BodyStatsTabPage.handleMusclePress) rather than
  // defaulting to a fresh period.
  const [period, setPeriod] = useState<StatsPeriod>(() => statsPeriodFromParams({ periodKind, periodDays }));
  const { sets, trainedDates, isLoading } = useMuscleDetail(muscle as SimplifiedMuscle | undefined, period);

  const periodOptions = [
    { label: t('periodWeek'), period: DEFAULT_STATS_PERIODS[0].period },
    { label: t('periodMonth'), period: DEFAULT_STATS_PERIODS[1].period },
    { label: t('periodAllTime'), period: DEFAULT_STATS_PERIODS[2].period },
  ];

  const rows: SetHistoryRow[] = sets.map((s) => ({
    id: s.setId,
    exerciseName: s.exerciseName,
    loggedAt: s.loggedAt,
    weight: s.weight,
    unit: s.unit,
    reps: s.reps,
    durationSeconds: s.durationSeconds,
    distance: s.distance,
    measurementType: s.measurementType,
  }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="chevron-back" size={24} color={C.textMuted} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontSize: 17, fontWeight: '700', flex: 1 }}>
          {muscle ? getMuscleLabel(muscle, locale) : ''}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32, gap: 20 }}>
        <PeriodSelector options={periodOptions} value={period} onChange={setPeriod} />

        {isLoading ? (
          <ActivityIndicator color={accent.purple} style={{ marginTop: 24 }} />
        ) : (
          <>
            <View>
              <Text style={{ color: C.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
                {t('trainedDaysTitle')}
              </Text>
              <TrainedDaysCalendar trainedDates={trainedDates} />
            </View>

            <View>
              <Text style={{ color: C.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
                {t('setHistoryTitle')}
              </Text>
              <SetHistoryList rows={rows} showExerciseName />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
