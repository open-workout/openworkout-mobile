import { View, Text, FlatList, StatusBar, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback, useRef } from 'react';
import { getAllWorkouts, getFinishedWorkoutsPaginated, getWorkoutExerciseSummariesBatch, deleteWorkout, type Workout, type WorkoutExerciseSummary } from '../db/workouts';
import { WorkoutCard, type PastWorkout } from '../components/WorkoutCard';

const PAGE_SIZE = 10;

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
      router.push(`/generated-workout?workoutId=${activeWorkout.id}`);
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
