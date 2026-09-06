import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { getSetsForMuscle, getTrainedDatesForMuscle, type MuscleSetEntry } from '../db/muscleStats';
import type { SimplifiedMuscle } from '../lib/muscleMapping';
import { periodKey, type StatsPeriod } from '../lib/statsPeriod';

export function useMuscleDetail(muscle: SimplifiedMuscle | undefined, period: StatsPeriod) {
  const [sets, setSets] = useState<MuscleSetEntry[]>([]);
  const [trainedDates, setTrainedDates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const key = periodKey(period);

  const reload = useCallback(async () => {
    if (!muscle) {
      setSets([]);
      setTrainedDates([]);
      return;
    }
    const [setsResult, datesResult] = await Promise.all([
      getSetsForMuscle(muscle, period),
      getTrainedDatesForMuscle(muscle, period),
    ]);
    setSets(setsResult);
    setTrainedDates(datesResult);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muscle, key]);

  useEffect(() => {
    setIsLoading(true);
    reload().finally(() => setIsLoading(false));
  }, [reload]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  return { sets, trainedDates, isLoading, reload };
}
