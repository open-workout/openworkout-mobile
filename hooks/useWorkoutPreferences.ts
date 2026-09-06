import { useState, useEffect, useCallback } from 'react';
import {
  getWorkoutPreferences,
  setWorkoutPreferences,
  type WorkoutPreferences,
} from '../storage';

export function useWorkoutPreferences() {
  const [prefs, setPrefs] = useState<WorkoutPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    setPrefs(await getWorkoutPreferences());
  }, []);

  useEffect(() => {
    setIsLoading(true);
    reload().finally(() => setIsLoading(false));
  }, []);

  const update = useCallback(async (next: WorkoutPreferences) => {
    await setWorkoutPreferences(next);
    setPrefs(next);
  }, []);

  return { prefs, isLoading, reload, update };
}
