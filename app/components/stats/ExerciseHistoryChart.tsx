import { useState, useMemo } from 'react';
import { View, Text } from 'react-native';
import Svg, { Polyline, Circle, Line } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import type { ExerciseHistoryPoint } from '../../db/exerciseHistory';
import { C, accent } from '../../theme/colors';

type MeasurementType = 'reps' | 'time' | 'distance';

type Session = { workoutId: string; points: ExerciseHistoryPoint[] };

function groupBySession(points: ExerciseHistoryPoint[]): Session[] {
  const byWorkout = new Map<string, ExerciseHistoryPoint[]>();
  for (const p of points) {
    const list = byWorkout.get(p.workoutId) ?? [];
    list.push(p);
    byWorkout.set(p.workoutId, list);
  }
  return Array.from(byWorkout.entries()).map(([workoutId, pts]) => ({ workoutId, points: pts }));
}

// Bodyweight-only exercises log weight=0 for every set, so falling back to
// top reps keeps the chart meaningful instead of flatlining at zero.
function sessionValue(points: ExerciseHistoryPoint[], measurementType: MeasurementType): number {
  if (measurementType === 'time') return Math.max(0, ...points.map((p) => p.durationSeconds ?? 0));
  if (measurementType === 'distance') return Math.max(0, ...points.map((p) => p.distance ?? 0));
  const anyWeighted = points.some((p) => p.weight > 0);
  if (anyWeighted) return Math.max(0, ...points.map((p) => p.weight));
  return Math.max(0, ...points.map((p) => p.reps));
}

function unitFor(measurementType: MeasurementType, points: ExerciseHistoryPoint[]): string {
  if (measurementType === 'time') return 'sec';
  if (measurementType === 'distance') return 'km';
  const anyWeighted = points.some((p) => p.weight > 0);
  return anyWeighted ? points[0]?.unit || 'kg' : 'reps';
}

const CHART_HEIGHT = 160;
const PADDING_X = 16;
const PADDING_Y = 16;

type Props = {
  points: ExerciseHistoryPoint[];
  measurementType: MeasurementType;
};

// Hand-rolled with react-native-svg rather than a charting library, matching
// the app's minimal-dependency style. Plots one value per session (top-set
// weight, or top duration/distance for time/distance exercises) — full
// per-set detail lives in the set list below this chart, not here. Fixed
// width, no internal scroll: the outer SwipeableTabPager already owns a
// full-width horizontal pan gesture on this tab.
export function ExerciseHistoryChart({ points, measurementType }: Props) {
  const { t } = useTranslation('stats');
  const [width, setWidth] = useState(0);
  const sessions = useMemo(() => groupBySession(points), [points]);

  if (sessions.length === 0) return null;

  const values = sessions.map((s) => sessionValue(s.points, measurementType));
  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;
  const unit = unitFor(measurementType, points);

  const usableWidth = Math.max(width - PADDING_X * 2, 1);
  const usableHeight = CHART_HEIGHT - PADDING_Y * 2;
  const stepX = sessions.length > 1 ? usableWidth / (sessions.length - 1) : 0;

  const coords = values.map((v, i) => ({
    x: PADDING_X + (sessions.length > 1 ? i * stepX : usableWidth / 2),
    y: PADDING_Y + usableHeight - ((v - minVal) / range) * usableHeight,
  }));
  const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(' ');

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ paddingHorizontal: 8, paddingVertical: 12 }}>
      <Text style={{ color: C.textDim, fontSize: 11, marginBottom: 4 }}>
        {t('chartMax', { value: Math.round(maxVal), unit })}
      </Text>
      {width > 0 && (
        <Svg width={width} height={CHART_HEIGHT}>
          <Line
            x1={PADDING_X}
            y1={PADDING_Y + usableHeight}
            x2={width - PADDING_X}
            y2={PADDING_Y + usableHeight}
            stroke={C.border}
            strokeWidth={1}
          />
          <Polyline
            points={polylinePoints}
            fill="none"
            stroke={accent.purple}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {coords.map((c, i) => (
            <Circle key={i} cx={c.x} cy={c.y} r={4} fill={accent.purple} />
          ))}
        </Svg>
      )}
      <Text style={{ color: C.textDim, fontSize: 11, marginTop: 4 }}>
        {t('chartMin', { value: Math.round(minVal), unit })}
      </Text>
    </View>
  );
}
