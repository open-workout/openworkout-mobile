import { View, Text, FlatList, StatusBar, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getAllWorkouts, getFinishedWorkoutsPaginated, getWorkoutExerciseSummariesBatch, deleteWorkout, type Workout, type WorkoutExerciseSummary } from '../db/workouts';
import { getWorkoutPRCountsBatch } from '../db/sets';
import { WorkoutCard, type PastWorkout } from './WorkoutCard';
import { formatTodayLabel } from '../lib/dateFormat';
import { useSplit } from '../hooks/useSplit';
import { useWorkoutPreferences } from '../hooks/useWorkoutPreferences';
import { computeWeekStreak } from '../lib/streak';
import { getNextSplitDayName } from '../lib/splitRotation';
import { getDayNameLabel } from '../lib/splitTranslations';
import { C, accent } from '../theme/colors';

const PAGE_SIZE = 10;

function getCurrentWeekDates(): Date[] {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function HomeTabPage() {
  const { t, i18n } = useTranslation('home');
  const { t: tRoutines } = useTranslation('routines');
  const router = useRouter();
  const { split } = useSplit();
  const { prefs } = useWorkoutPreferences();
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [finishedWorkouts, setFinishedWorkouts] = useState<Workout[]>([]);
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
      const workoutIds = workouts.map((w) => w.id);
      const [allSummaries, prCounts] = await Promise.all([
        getWorkoutExerciseSummariesBatch(workoutIds),
        getWorkoutPRCountsBatch(workoutIds),
      ]);
      const summaryMap: Record<string, WorkoutExerciseSummary[]> = {};
      for (const s of allSummaries) {
        if (!summaryMap[s.workout_id]) summaryMap[s.workout_id] = [];
        summaryMap[s.workout_id].push(s);
      }
      const withSummaries = workouts.map((w) => ({
        workout: w,
        summaries: summaryMap[w.id] ?? [],
        prCount: prCounts[w.id] ?? 0,
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
      getAllWorkouts().then((ws) => {
        setActiveWorkout(ws.find((w) => !w.finished_at) ?? null);
        setFinishedWorkouts(ws.filter((w) => !!w.finished_at));
      }),
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

  const todayLabel = useMemo(() => {
    return formatTodayLabel(new Date(), i18n.language);
  }, [i18n.language]);

  const weekDates = useMemo(() => getCurrentWeekDates(), []);
  const today = new Date();
  const workoutDatesThisWeek = useMemo(
    () => finishedWorkouts.map((w) => new Date(w.finished_at!)),
    [finishedWorkouts],
  );

  const streak = useMemo(
    () => computeWeekStreak(finishedWorkouts, prefs?.weekly_goal ?? 3),
    [finishedWorkouts, prefs],
  );

  const nextDayName = useMemo(
    () => getNextSplitDayName(split, finishedWorkouts),
    [split, finishedWorkouts],
  );

  const ListHeader = (
    <View>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16, borderBottomWidth: 0.5, borderBottomColor: C.card }}>
        <View>
          <Text style={{ color: C.textMuted, fontSize: 14, fontWeight: '500', marginBottom: 4 }}>{todayLabel}</Text>
          <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>{t('readyToLift')}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}
        >
          <Ionicons name="settings-outline" size={19} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Weekly plan card */}
      <View style={{ marginHorizontal: 24, marginTop: 24, backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14 }}>
          {weekDates.map((date) => {
            const isToday = isSameDay(date, today);
            const hasWorkout = workoutDatesThisWeek.some((d) => isSameDay(d, date));
            return (
              <View key={date.toISOString()} style={{ alignItems: 'center', width: 32 }}>
                <Text style={{ color: C.textDim, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 }}>
                  {date.toLocaleDateString(i18n.language, { weekday: 'short' }).slice(0, 2).toUpperCase()}
                </Text>
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isToday ? accent.green : 'transparent',
                  }}
                >
                  <Text style={{ color: isToday ? '#052e1c' : C.text, fontSize: 13, fontWeight: isToday ? '800' : '600' }}>
                    {date.getDate()}
                  </Text>
                </View>
                <View
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    marginTop: 5,
                    backgroundColor: hasWorkout ? accent.green : 'transparent',
                  }}
                />
              </View>
            );
          })}
        </View>

        {/* Today / next-up row */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleStartWorkout}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: 18, paddingVertical: 14 }}
        >
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: accent.green, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={activeWorkout ? 'refresh' : 'play'} size={16} color="#052e1c" style={{ marginLeft: activeWorkout ? 0 : 2 }} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.textDim, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>
              {activeWorkout ? t('inProgress') : t('todayLabel')}
            </Text>
            <Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }}>
              {activeWorkout
                ? t('resumeWorkout')
                : nextDayName
                  ? getDayNameLabel(nextDayName, tRoutines)
                  : t('noSplitConfiguredShort')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.textDim} />
        </TouchableOpacity>
      </View>

      {/* Streak card */}
      <View style={{ marginHorizontal: 24, marginTop: 16, backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(245,158,11,0.12)', alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name="fire" size={22} color={accent.amber} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontSize: 16, fontWeight: '800' }}>
            {t('weekStreak', { count: streak.streakWeeks })}
          </Text>
          <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 2 }}>
            {t('streakSubtitle', { current: streak.thisWeekCount, goal: streak.weeklyGoal, total: streak.totalWorkouts })}
          </Text>
        </View>
      </View>

      {/* Section header */}
      <View style={{ marginTop: 32, paddingHorizontal: 24, marginBottom: 20 }}>
        <Text style={{ color: C.text, fontSize: 18, fontWeight: '600' }}>{t('recentActivity')}</Text>
      </View>
    </View>
  );

  const ListFooter = (
    <View style={{ paddingBottom: 24, alignItems: 'center', paddingTop: 8, paddingHorizontal: 24 }}>
      {isLoadingMore && pastWorkouts.length > 0 && (
        <ActivityIndicator color={C.textDim} />
      )}
      {!hasMore && pastWorkouts.length > 0 && (
        <Text style={{ color: C.borderAlt, fontSize: 13 }}>{t('noMoreWorkouts')}</Text>
      )}
      {!isLoadingMore && pastWorkouts.length === 0 && (
        <Text style={{ color: C.textDim, fontSize: 14 }}>{t('noFinishedWorkoutsYet')}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
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
