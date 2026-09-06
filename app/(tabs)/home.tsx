import { View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { getAllWorkouts } from '@/db/workouts';
import { SwipeableTabPager } from '@/components/SwipeableTabPager';
import { TabBar } from '@/components/TabBar';
import HomeTabPage from '@/components/HomeTabPage';
import PlanTabPage from '@/components/PlanTabPage';
import StatsTabPage from '@/components/StatsTabPage';
import ExercisesTabPage from '@/components/ExercisesTabPage';
import { C } from '@/theme/colors';

// The single route backing the whole tab experience: a swipeable pager over
// the 4 content pages, plus a hand-built tab bar (React Navigation's bottom
// tabs don't support an interactive, both-pages-visible swipe transition,
// so that's driven directly by SwipeableTabPager instead). "Start" isn't a
// page — it's an action button that routes into the start-workout flow.
export default function HomeRoute() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasActiveWorkout, setHasActiveWorkout] = useState(false);

  const refreshActiveWorkout = useCallback(() => {
    getAllWorkouts().then((workouts) => {
      setHasActiveWorkout(workouts.some((w) => !w.finished_at));
    });
  }, []);

  // Refresh whenever this route regains focus — e.g. returning from
  // generated-workout (finished/discarded/exited), settings, or pick-day.
  useFocusEffect(useCallback(() => {
    refreshActiveWorkout();
  }, [refreshActiveWorkout]));

  const handleStartPress = async () => {
    const workouts = await getAllWorkouts();
    const active = workouts.find((w) => !w.finished_at);
    if (active) {
      router.push(`/generated-workout?workoutId=${active.id}`);
    } else {
      router.push('/pick-day');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SwipeableTabPager
        activeIndex={activeIndex}
        onIndexChange={setActiveIndex}
        pages={[
          <HomeTabPage key="home" />,
          <PlanTabPage key="plan" />,
          <StatsTabPage key="stats" />,
          <ExercisesTabPage key="exercises" />,
        ]}
      />
      <TabBar
        activeIndex={activeIndex}
        onSelectIndex={setActiveIndex}
        hasActiveWorkout={hasActiveWorkout}
        onStartPress={handleStartPress}
      />
    </View>
  );
}
