import { useState, useEffect, useCallback } from 'react';
import { getWeightUnit, setWeightUnit } from '../storage';

export function useWeightUnit() {
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');

  const reload = useCallback(async () => {
    setUnit(await getWeightUnit());
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const update = useCallback(async (u: 'kg' | 'lbs') => {
    setUnit(u);
    await setWeightUnit(u);
  }, []);

  return { unit, update, reload };
}
