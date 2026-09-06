import { useState } from 'react';
import { View, Text, StatusBar } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { C } from '../theme/colors';
import { StatsTabStrip, type StatsSubTab } from './stats/StatsTabStrip';
import ExerciseStatsTabPage from './stats/ExerciseStatsTabPage';
import BodyStatsTabPage from './stats/BodyStatsTabPage';

export default function StatsTabPage() {
  const { t } = useTranslation('navigation');
  const [activeSubTab, setActiveSubTab] = useState<StatsSubTab>('exercise');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16, borderBottomWidth: 0.5, borderBottomColor: C.card }}>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700', letterSpacing: -0.3, marginBottom: 16 }}>{t('stats')}</Text>
        <StatsTabStrip active={activeSubTab} onChange={setActiveSubTab} />
      </View>
      {activeSubTab === 'exercise' ? <ExerciseStatsTabPage /> : <BodyStatsTabPage />}
    </SafeAreaView>
  );
}
