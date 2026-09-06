import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { C } from '../../theme/colors';

export type SetHistoryRow = {
  id: string;
  exerciseName?: string;
  loggedAt: string;
  weight: number;
  unit: string;
  reps: number;
  durationSeconds: number | null;
  distance: number | null;
  measurementType: 'reps' | 'time' | 'distance';
  isWarmup?: boolean;
  dropSetNumber?: number;
};

type Props = {
  rows: SetHistoryRow[];
  showExerciseName?: boolean;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatValue(row: SetHistoryRow, t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (row.measurementType === 'time') return t('valueTime', { seconds: row.durationSeconds ?? 0 });
  if (row.measurementType === 'distance') return t('valueDistance', { km: row.distance ?? 0 });
  return row.weight > 0
    ? t('valueWeightReps', { weight: row.weight, unit: row.unit, reps: row.reps })
    : t('valueRepsOnly', { reps: row.reps });
}

// Not virtualized — reused inside a plain ScrollView alongside a chart, and
// dataset sizes here (a person's logged sets for one exercise/muscle) are
// small enough that a FlatList/VirtualizedList would be unwarranted.
export function SetHistoryList({ rows, showExerciseName }: Props) {
  const { t } = useTranslation('stats');

  if (rows.length === 0) {
    return (
      <Text style={{ color: C.textDim, fontSize: 14, textAlign: 'center', marginTop: 24 }}>
        {t('noSetsLogged')}
      </Text>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      {rows.map((row) => (
        <View
          key={row.id}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(24,24,27,0.4)',
            borderWidth: 1,
            borderColor: 'rgba(39,39,42,0.5)',
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            {showExerciseName && row.exerciseName && (
              <Text style={{ color: C.text, fontSize: 14, fontWeight: '700', marginBottom: 2 }}>
                {row.exerciseName}
              </Text>
            )}
            <Text style={{ color: C.textDim, fontSize: 12 }}>{formatDate(row.loggedAt)}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {!!row.dropSetNumber && (
              <View style={{ backgroundColor: C.border, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ color: C.textMuted, fontSize: 10, fontWeight: '700' }}>D{row.dropSetNumber}</Text>
              </View>
            )}
            {row.isWarmup && (
              <View style={{ backgroundColor: C.border, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ color: C.textMuted, fontSize: 10, fontWeight: '700' }}>{t('warmupBadge')}</Text>
              </View>
            )}
            <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>{formatValue(row, t)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
