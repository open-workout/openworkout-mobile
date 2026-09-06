import { useState, useEffect, useCallback } from 'react';
import { getActiveSplit, insertSplit, type Split } from '../db/splits';

export function useSplit() {
  const [split, setSplit] = useState<Split | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadLocal = useCallback(async () => {
    setSplit(await getActiveSplit());
  }, []);

  useEffect(() => {
    setIsLoading(true);
    loadLocal().finally(() => setIsLoading(false));
  }, []);

  const saveSplit = useCallback(
    async (input: Omit<Split, 'id' | 'created_at'>) => {
      await insertSplit(input);
      await loadLocal();
    },
    [loadLocal],
  );

  return { split, isLoading, saveSplit, reload: loadLocal };
}
