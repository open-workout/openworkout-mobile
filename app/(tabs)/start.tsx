import { View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { getAllWorkouts } from '../db/workouts';
import { C } from '../theme/colors';

// This tab has no content of its own — tapping it immediately routes into
// the start-workout flow (resume if a workout is in progress, otherwise the
// pick-day entry screen), mirroring the CTA already on Home.
export default function StartTabScreen() {
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getAllWorkouts().then((workouts) => {
        if (cancelled) return;
        const active = workouts.find((w) => !w.finished_at);
        if (active) {
          router.push(`/generated-workout?workoutId=${active.id}`);
        } else {
          router.push('/pick-day');
        }
      });
      return () => {
        cancelled = true;
      };
    }, [router]),
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
      <View>
        <ActivityIndicator color={C.textMuted} />
      </View>
    </SafeAreaView>
  );
}
