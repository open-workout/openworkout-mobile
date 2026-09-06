jest.mock('../../db/splits', () => ({
  getActiveSplit: jest.fn(),
  insertSplit: jest.fn(),
}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { getActiveSplit, insertSplit } from '../../db/splits';
import { useSplit } from '../../hooks/useSplit';
import type { Split } from '../../db/splits';

const MOCK_SPLIT: Split = {
  id: 'abc',
  name: 'PPL',
  days: [
    { name: 'Push', muscles: ['chest', 'triceps'] },
    { name: 'Pull', muscles: ['lats', 'biceps'] },
    { name: 'Legs', muscles: ['quads', 'hamstrings'] },
  ],
  created_at: 1000,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getActiveSplit).mockResolvedValue(MOCK_SPLIT);
  jest.mocked(insertSplit).mockResolvedValue('new_id');
});

describe('useSplit', () => {
  it('starts with isLoading=true and split=null before DB resolves', async () => {
    const { result } = renderHook(() => useSplit());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.split).toBeNull();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('loads split from DB on mount', async () => {
    const { result } = renderHook(() => useSplit());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(getActiveSplit).toHaveBeenCalledTimes(1);
    expect(result.current.split).toEqual(MOCK_SPLIT);
  });

  it('split is null when no split exists in DB', async () => {
    jest.mocked(getActiveSplit).mockResolvedValue(null);
    const { result } = renderHook(() => useSplit());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.split).toBeNull();
  });

  it('saveSplit calls insertSplit then refreshes from DB', async () => {
    const newSplit: Split = { ...MOCK_SPLIT, id: 'new_id', name: 'My Split', created_at: 2000 };
    jest.mocked(getActiveSplit)
      .mockResolvedValueOnce(MOCK_SPLIT)
      .mockResolvedValueOnce(newSplit);

    const { result } = renderHook(() => useSplit());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.saveSplit({ name: 'My Split', days: newSplit.days });
    });

    expect(insertSplit).toHaveBeenCalledWith({ name: 'My Split', days: newSplit.days });
    expect(getActiveSplit).toHaveBeenCalledTimes(2);
    expect(result.current.split).toEqual(newSplit);
  });
});
