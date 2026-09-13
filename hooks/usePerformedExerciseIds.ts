import { useState, useEffect, useCallback } from 'react';
import { getPerformedExerciseIds, subscribeToHistoryChanges } from '../db/exerciseHistory';

export function usePerformedExerciseIds() {
  const [performedIds, setPerformedIds] = useState<Set<string>>(new Set());

  const loadLocal = useCallback(async () => {
    setPerformedIds(await getPerformedExerciseIds());
  }, []);

  useEffect(() => {
    loadLocal();
  }, [loadLocal]);

  useEffect(() => subscribeToHistoryChanges(loadLocal), [loadLocal]);

  return { performedIds, reload: loadLocal };
}
