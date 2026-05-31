import { View, Text, FlatList, StatusBar, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback, useRef } from 'react';
import { getAllWorkouts, getFinishedWorkoutsPaginated, getWorkoutExerciseSummariesBatch, deleteWorkout, type Workout, type WorkoutExerciseSummary } from '../db/workouts';
import { getSetsForWorkout, type WorkoutSet } from '../db/sets';

const PAGE_SIZE = 10;

type PastWorkout = {
  workout: Workout;
  summaries: WorkoutExerciseSummary[];
};

function formatWorkoutDate(startedAt: string): string {
  const date = new Date(startedAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 0) return `Today, ${time}`;
  if (diffDays === 1) return `Yesterday, ${time}`;
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatVolume(volume: number, unit: string): string {
  if (volume >= 1000) return `${(volume / 1000).toFixed(1)}k ${unit}`;
  return `${Math.round(volume)} ${unit}`;
}

function formatDuration(startedAt: string, finishedAt: string): string {
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [pastWorkouts, setPastWorkouts] = useState<PastWorkout[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);
  const offsetRef = useRef(0);
  const loadingRef = useRef(false);

  const loadPage = useCallback(async (offset: number, replace: boolean) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setIsLoadingMore(true);
    try {
      const workouts = await getFinishedWorkoutsPaginated(offset, PAGE_SIZE);
      const allSummaries = await getWorkoutExerciseSummariesBatch(workouts.map((w) => w.id));
      const summaryMap: Record<string, WorkoutExerciseSummary[]> = {};
      for (const s of allSummaries) {
        if (!summaryMap[s.workout_id]) summaryMap[s.workout_id] = [];
        summaryMap[s.workout_id].push(s);
      }
      const withSummaries = workouts.map((w) => ({
        workout: w,
        summaries: summaryMap[w.id] ?? [],
      }));
      if (replace) {
        setPastWorkouts(withSummaries);
      } else {
        setPastWorkouts((prev) => [...prev, ...withSummaries]);
      }
      offsetRef.current = offset + workouts.length;
      setHasMore(workouts.length === PAGE_SIZE);
    } finally {
      loadingRef.current = false;
      setIsLoadingMore(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    offsetRef.current = 0;
    loadingRef.current = false;
    setHasMore(true);
    Promise.all([
      getAllWorkouts().then((ws) => setActiveWorkout(ws.find((w) => !w.finished_at) ?? null)),
      loadPage(0, true),
    ]);
  }, [loadPage]));

  const handleLoadMore = () => {
    if (!hasMore || isLoadingMore) return;
    loadPage(offsetRef.current, false);
  };

  const handleStartWorkout = () => {
    if (activeWorkout) {
      router.push(`/workout?workoutId=${activeWorkout.id}`);
      return;
    }
    router.push('/pick-day');
  };

  const ListHeader = (
    <View>
      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16, borderBottomWidth: 0.5, borderBottomColor: '#18181b' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: '#71717a', fontSize: 14, fontWeight: '500', marginBottom: 4 }}>Thursday, Oct 15</Text>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>Ready to lift, Marcus?</Text>
          </View>
          <View style={{ position: 'relative' }}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80' }}
              style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#3f3f46' }}
              contentFit="cover"
            />
            <View style={{ position: 'absolute', right: 0, bottom: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: '#10b981', borderWidth: 2, borderColor: '#0a0a0a' }} />
          </View>
        </View>
      </View>

      {/* Search */}
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, marginHorizontal: 24, marginTop: 24, marginBottom: 4 }}>
        <Ionicons name="search-outline" size={20} color="#71717a" style={{ marginRight: 10 }} />
        <Text style={{ color: '#52525b', fontSize: 16 }}>Search exercises...</Text>
      </View>

      {/* Start Workout CTA */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleStartWorkout}
        style={{ marginHorizontal: 24, marginTop: 24, marginBottom: 8 }}
      >
        <LinearGradient
          colors={['#f4f4f5', '#a1a1aa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 20, padding: 2 }}
        >
          <View style={{ backgroundColor: '#0c0c0e', borderRadius: 18, paddingHorizontal: 24, paddingVertical: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <LinearGradient
                colors={['#f4f4f5', '#a1a1aa']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name={activeWorkout ? 'refresh' : 'play'} size={22} color="#09090b" style={{ marginLeft: activeWorkout ? 0 : 2 }} />
              </LinearGradient>
              <View>
                <Text style={{ color: '#f4f4f5', fontSize: 17, fontWeight: '700', marginBottom: 2 }}>
                  {activeWorkout ? 'Resume Workout' : 'Start Workout'}
                </Text>
                <Text style={{ color: '#71717a', fontSize: 14 }}>
                  {activeWorkout ? 'Continue your session' : 'Track a new session'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#52525b" />
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Section header */}
      <View style={{ marginTop: 32, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <Text style={{ color: '#f4f4f5', fontSize: 18, fontWeight: '600' }}>Recent Activity</Text>
        <TouchableOpacity>
          <Text style={{ color: '#71717a', fontSize: 14, fontWeight: '500' }}>View History</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const ListFooter = (
    <View style={{ paddingBottom: 24, alignItems: 'center', paddingTop: 8, paddingHorizontal: 24 }}>
      {isLoadingMore && pastWorkouts.length > 0 && (
        <ActivityIndicator color="#52525b" />
      )}
      {!hasMore && pastWorkouts.length > 0 && (
        <Text style={{ color: '#3f3f46', fontSize: 13 }}>No more workouts</Text>
      )}
      {!isLoadingMore && pastWorkouts.length === 0 && (
        <Text style={{ color: '#52525b', fontSize: 14 }}>No finished workouts yet</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <FlatList
        data={pastWorkouts}
        keyExtractor={(item) => item.workout.id}
        renderItem={({ item }) => (
          <WorkoutCard
            item={item}
            expanded={expandedWorkoutId === item.workout.id}
            onToggle={() => setExpandedWorkoutId(
              expandedWorkoutId === item.workout.id ? null : item.workout.id
            )}
            onDelete={async () => {
              await deleteWorkout(item.workout.id);
              setExpandedWorkoutId(null);
              setPastWorkouts((prev) => prev.filter((w) => w.workout.id !== item.workout.id));
            }}
          />
        )}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 0 }}
      />
    </SafeAreaView>
  );
}

function WorkoutCard({
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
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color="#52525b"
          />
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
                        <Text style={{ color: '#71717a', fontSize: 11 }}>
                          Set {idx + 1}
                        </Text>
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
