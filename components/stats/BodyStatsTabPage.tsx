import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { PeriodSelector } from './PeriodSelector';
import { BodyDiagram } from './BodyDiagram';
import { MuscleHeatLegend } from './MuscleHeatLegend';
import { TrainedDaysCalendar } from './TrainedDaysCalendar';
import { SetHistoryList, type SetHistoryRow } from './SetHistoryList';
import { useMuscleStats } from '../../hooks/useMuscleStats';
import { useMuscleDetail } from '../../hooks/useMuscleDetail';
import { DEFAULT_STATS_PERIODS, type StatsPeriod } from '../../lib/statsPeriod';
import { getMuscleLabel } from '../../lib/exerciseTranslations';
import type { SimplifiedMuscle } from '../../lib/muscleMapping';
import { C, accent } from '../../theme/colors';

export default function BodyStatsTabPage() {
  const { t, i18n } = useTranslation('stats');
  const [period, setPeriod] = useState<StatsPeriod>(DEFAULT_STATS_PERIODS[0].period);
  const [selectedMuscle, setSelectedMuscle] = useState<SimplifiedMuscle | null>(null);
  const { counts, isLoading } = useMuscleStats(period);
  const { sets, trainedDates, isLoading: isDetailLoading } = useMuscleDetail(selectedMuscle ?? undefined, period);

  const periodOptions = [
    { label: t('periodWeek'), period: DEFAULT_STATS_PERIODS[0].period },
    { label: t('periodMonth'), period: DEFAULT_STATS_PERIODS[1].period },
    { label: t('periodAllTime'), period: DEFAULT_STATS_PERIODS[2].period },
  ];

  // Tapping the already-selected muscle again collapses the panel.
  const handleMusclePress = (muscle: SimplifiedMuscle) => {
    setSelectedMuscle((current) => (current === muscle ? null : muscle));
  };

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
    <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32, gap: 20 }}>
      <PeriodSelector options={periodOptions} value={period} onChange={setPeriod} />

      {isLoading ? (
        <ActivityIndicator color={accent.purple} style={{ marginTop: 40 }} />
      ) : (
        <BodyDiagram counts={counts} onMusclePress={handleMusclePress} />
      )}

      <MuscleHeatLegend />

      {selectedMuscle && (
        <View style={{ gap: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: C.text, fontSize: 16, fontWeight: '700' }}>
              {getMuscleLabel(selectedMuscle, i18n.language)}
            </Text>
            <TouchableOpacity
              onPress={() => setSelectedMuscle(null)}
              style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="close" size={20} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          {isDetailLoading ? (
            <ActivityIndicator color={accent.purple} style={{ marginTop: 8 }} />
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
        </View>
      )}
    </ScrollView>
  );
}
