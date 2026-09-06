import { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useExercises } from './hooks/useExercises';
import { useExerciseHistory } from './hooks/useExerciseHistory';
import { ExercisePickerModal } from './components/stats/ExercisePickerModal';
import { ExerciseHistoryChart } from './components/stats/ExerciseHistoryChart';
import { SetHistoryList, type SetHistoryRow } from './components/stats/SetHistoryList';
import { getExerciseDisplayName } from './lib/exerciseTranslations';
import { C, accent } from './theme/colors';

type MeasurementType = 'reps' | 'time' | 'distance';
const TYPE_PRIORITY: MeasurementType[] = ['reps', 'time', 'distance'];

export default function ExerciseStatsScreen() {
  const { t, i18n } = useTranslation('stats');
  const locale = i18n.language;
  const router = useRouter();
  const { exerciseId } = useLocalSearchParams<{ exerciseId?: string }>();
  const { exercises, isLoading: exercisesLoading } = useExercises();
  const { history, isLoading: historyLoading } = useExerciseHistory(exerciseId);
  const [measurementType, setMeasurementType] = useState<MeasurementType | null>(null);

  useEffect(() => { setMeasurementType(null); }, [exerciseId]);

  const exercise = exercises.find((e) => e.id === exerciseId);

  const availableTypes = useMemo(() => {
    const present = new Set<MeasurementType>();
    for (const point of history) present.add(point.measurementType);
    return TYPE_PRIORITY.filter((type) => present.has(type));
  }, [history]);

  const activeType: MeasurementType = measurementType ?? availableTypes[0] ?? 'reps';
  const filteredHistory = useMemo(
    () => history.filter((point) => point.measurementType === activeType),
    [history, activeType],
  );

  const rows: SetHistoryRow[] = filteredHistory
    .slice()
    .reverse()
    .map((point) => ({
      id: point.setId,
      loggedAt: point.loggedAt,
      weight: point.weight,
      unit: point.unit,
      reps: point.reps,
      durationSeconds: point.durationSeconds,
      distance: point.distance,
      measurementType: point.measurementType,
      isWarmup: point.isWarmup,
      dropSetNumber: point.dropSetNumber,
    }));

  if (!exerciseId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
        <ExercisePickerModal
          visible
          onClose={() => router.back()}
          onSelect={(ex) => ex.id && router.setParams({ exerciseId: ex.id })}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="chevron-back" size={24} color={C.textMuted} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontSize: 17, fontWeight: '700', flex: 1 }} numberOfLines={1}>
          {exercise ? getExerciseDisplayName(exercise, locale) : ''}
        </Text>
      </View>

      {exercisesLoading || historyLoading ? (
        <ActivityIndicator color={accent.purple} style={{ marginTop: 40 }} />
      ) : history.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ color: C.textDim, fontSize: 15, textAlign: 'center' }}>{t('noHistoryForExercise')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32, gap: 16 }}>
          {availableTypes.length > 1 && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {availableTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setMeasurementType(type)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: activeType === type ? accent.purple : C.card,
                    borderWidth: 1,
                    borderColor: activeType === type ? accent.purple : C.border,
                  }}
                >
                  <Text style={{ color: activeType === type ? '#fff' : C.textMuted, fontSize: 13, fontWeight: '600' }}>
                    {t(`measurementType_${type}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <ExerciseHistoryChart points={filteredHistory} measurementType={activeType} />
          <SetHistoryList rows={rows} showExerciseName={false} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
