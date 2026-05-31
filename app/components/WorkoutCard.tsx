import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { type Workout, type WorkoutExerciseSummary } from '../db/workouts';
import { getSetsForWorkout, type WorkoutSet } from '../db/sets';

export type PastWorkout = {
  workout: Workout;
  summaries: WorkoutExerciseSummary[];
};

export function formatWorkoutDate(startedAt: string): string {
  const date = new Date(startedAt);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 0) return `Today, ${time}`;
  if (diffDays === 1) return `Yesterday, ${time}`;
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatVolume(volume: number, unit: string): string {
  if (volume >= 1000) return `${(volume / 1000).toFixed(1)}k ${unit}`;
  return `${Math.round(volume)} ${unit}`;
}

export function formatDuration(startedAt: string, finishedAt: string): string {
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

export function WorkoutCard({
  item,
  expanded,
  onToggle,
  onDelete,
}: {
  item: PastWorkout;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => Promise<void>;
}) {
  const { workout, summaries } = item;
  const [expandedSets, setExpandedSets] = useState<WorkoutSet[] | null>(null);
  const [loadingSets, setLoadingSets] = useState(false);

  const totalSets = summaries.reduce((acc, s) => acc + s.set_count, 0);
  const totalVolume = summaries.reduce((acc, s) => acc + s.total_volume, 0);
  const dominantUnit = summaries[0]?.unit ?? 'kg';

  const exercisePreview = (() => {
    if (summaries.length === 0) return null;
    const shown = summaries.slice(0, 3).map((s) => s.exercise_name);
    const rest = summaries.length - shown.length;
    return rest > 0 ? `${shown.join(', ')} +${rest} more` : shown.join(', ');
  })();

  const handleToggle = async () => {
    onToggle();
    if (!expanded && expandedSets === null && !loadingSets) {
      setLoadingSets(true);
      try {
        const sets = await getSetsForWorkout(workout.id);
        setExpandedSets(sets);
      } finally {
        setLoadingSets(false);
      }
    }
  };

  const setsByExercise: Record<string, WorkoutSet[]> = {};
  if (expandedSets) {
    for (const s of expandedSets) {
      if (!setsByExercise[s.exercise_id]) setsByExercise[s.exercise_id] = [];
      setsByExercise[s.exercise_id].push(s);
    }
  }

  return (
    <View style={{
      backgroundColor: 'rgba(24,24,27,0.6)',
      borderWidth: 1,
      borderColor: 'rgba(39,39,42,0.8)',
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      marginHorizontal: 24,
    }}>
      {/* Card header row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#27272a', borderWidth: 1, borderColor: '#3f3f46', alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name="dumbbell" size={18} color="#d4d4d8" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#f4f4f5', fontWeight: '700', fontSize: 15, letterSpacing: 0.2 }} numberOfLines={1}>
            {workout.title || 'Workout'}
          </Text>
          <Text style={{ color: '#52525b', fontSize: 12, fontWeight: '500', marginTop: 2 }}>
            {formatWorkoutDate(workout.started_at)}
          </Text>
        </View>
        {/* PR badge placeholder */}
        <View style={{ backgroundColor: '#27272a', borderWidth: 1, borderColor: '#3f3f46', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
          <Text style={{ color: '#52525b', fontSize: 11, fontWeight: '700' }}>-- PRs</Text>
        </View>
        {/* Expand toggle */}
        <TouchableOpacity onPress={handleToggle} style={{ padding: 4 }}>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#52525b" />
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <View style={{ flex: 1, backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: 'rgba(39,39,42,0.5)', borderRadius: 12, padding: 12, alignItems: 'center' }}>
          <Text style={{ color: '#52525b', fontSize: 11, marginBottom: 4 }}>Sets</Text>
          <Text style={{ color: '#d4d4d8', fontSize: 13, fontWeight: '600' }}>{totalSets}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: 'rgba(39,39,42,0.5)', borderRadius: 12, padding: 12, alignItems: 'center' }}>
          <Text style={{ color: '#52525b', fontSize: 11, marginBottom: 4 }}>Volume</Text>
          <Text style={{ color: '#d4d4d8', fontSize: 13, fontWeight: '600' }}>{formatVolume(totalVolume, dominantUnit)}</Text>
        </View>
        {workout.finished_at && (
          <View style={{ flex: 1, backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: 'rgba(39,39,42,0.5)', borderRadius: 12, padding: 12, alignItems: 'center' }}>
            <Text style={{ color: '#52525b', fontSize: 11, marginBottom: 4 }}>Time</Text>
            <Text style={{ color: '#d4d4d8', fontSize: 13, fontWeight: '600' }}>{formatDuration(workout.started_at, workout.finished_at)}</Text>
          </View>
        )}
      </View>

      {/* Exercise preview */}
      {exercisePreview && (
        <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(39,39,42,0.8)', paddingTop: 12, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="flame" size={14} color="#52525b" />
          <Text style={{ color: '#71717a', fontSize: 13, flex: 1 }} numberOfLines={1}>{exercisePreview}</Text>
        </View>
      )}

      {/* Expanded set details */}
      {expanded && (
        <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(39,39,42,0.8)', marginTop: 12, paddingTop: 12 }}>
          {loadingSets ? (
            <ActivityIndicator color="#52525b" style={{ marginVertical: 8 }} />
          ) : (
            summaries.map((summary) => {
              const sets = setsByExercise[summary.exercise_id] ?? [];
              return (
                <View key={summary.exercise_id} style={{ marginBottom: 12 }}>
                  <Text style={{ color: '#a1a1aa', fontSize: 13, fontWeight: '600', marginBottom: 6 }}>
                    {summary.exercise_name}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {sets.map((s, idx) => (
                      <View
                        key={s.id}
                        style={{ backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: 'rgba(39,39,42,0.6)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}
                      >
                        <Text style={{ color: '#71717a', fontSize: 11 }}>Set {idx + 1}</Text>
                        <Text style={{ color: '#d4d4d8', fontSize: 12, fontWeight: '600', marginTop: 2 }}>
                          {s.weight} {s.unit} × {s.reps}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })
          )}
          <TouchableOpacity
            onPress={() =>
              Alert.alert('Delete Workout', 'This will permanently delete this workout and all its sets.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: onDelete },
              ])
            }
            style={{ marginTop: 4, borderTopWidth: 1, borderTopColor: 'rgba(39,39,42,0.8)', paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            <Ionicons name="trash-outline" size={15} color="#ef4444" />
            <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '600' }}>Delete Workout</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
