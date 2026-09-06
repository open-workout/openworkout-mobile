import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { getMuscleSetCounts, type MuscleSetCount } from '../db/muscleStats';
import { periodKey, type StatsPeriod } from '../lib/statsPeriod';

export function useMuscleStats(period: StatsPeriod) {
  const [counts, setCounts] = useState<MuscleSetCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const key = periodKey(period);

  const reload = useCallback(async () => {
    setCounts(await getMuscleSetCounts(period));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    setIsLoading(true);
    reload().finally(() => setIsLoading(false));
  }, [reload]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  return { counts, isLoading, reload };
}
