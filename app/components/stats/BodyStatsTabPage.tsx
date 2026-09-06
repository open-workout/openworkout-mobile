import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PeriodSelector } from './PeriodSelector';
import { BodyDiagram } from './BodyDiagram';
import { MuscleHeatLegend } from './MuscleHeatLegend';
import { useMuscleStats } from '../../hooks/useMuscleStats';
import { DEFAULT_STATS_PERIODS, statsPeriodToParams, type StatsPeriod } from '../../lib/statsPeriod';
import type { SimplifiedMuscle } from '../../lib/muscleMapping';
import { C, accent } from '../../theme/colors';

export default function BodyStatsTabPage() {
  const { t } = useTranslation('stats');
  const router = useRouter();
  const [period, setPeriod] = useState<StatsPeriod>(DEFAULT_STATS_PERIODS[0].period);
  const [view, setView] = useState<'front' | 'back'>('front');
  const { counts, isLoading } = useMuscleStats(period);

  const periodOptions = [
    { label: t('periodWeek'), period: DEFAULT_STATS_PERIODS[0].period },
    { label: t('periodMonth'), period: DEFAULT_STATS_PERIODS[1].period },
    { label: t('periodAllTime'), period: DEFAULT_STATS_PERIODS[2].period },
  ];

  // Carries the currently-selected period into muscle-stats rather than
  // resetting to a default — the user shouldn't lose their period choice
  // just by drilling into a muscle.
  const handleMusclePress = (muscle: SimplifiedMuscle) => {
    const params = statsPeriodToParams(period);
    const daysPart = params.periodDays ? `&periodDays=${params.periodDays}` : '';
    router.push(`/muscle-stats?muscle=${muscle}&periodKind=${params.periodKind}${daysPart}`);
  };

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32, gap: 20 }}>
      <PeriodSelector options={periodOptions} value={period} onChange={setPeriod} />

      <View style={{ flexDirection: 'row', backgroundColor: C.card, borderRadius: 10, padding: 3, alignSelf: 'center' }}>
        {(['front', 'back'] as const).map((v) => (
          <TouchableOpacity
            key={v}
            onPress={() => setView(v)}
            style={{ paddingHorizontal: 24, paddingVertical: 8, borderRadius: 8, backgroundColor: view === v ? accent.purple : 'transparent' }}
          >
            <Text style={{ color: view === v ? '#fff' : C.textMuted, fontSize: 13, fontWeight: '700' }}>
              {v === 'front' ? t('frontView') : t('backView')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={accent.purple} style={{ marginTop: 40 }} />
      ) : (
        <BodyDiagram view={view} counts={counts} onMusclePress={handleMusclePress} />
      )}

      <MuscleHeatLegend />
    </ScrollView>
  );
}
