jest.mock('../../app/db/exercises', () => ({
  getAllExercises: jest.fn(),
  insertExercise: jest.fn(),
}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { getAllExercises, insertExercise } from '../../app/db/exercises';
import { useExercises } from '../../app/hooks/useExercises';
import type { LocalExercise, NewExerciseInput } from '../../app/db/exercises';

const MOCK_EXERCISES: LocalExercise[] = [
  {
    local_id: 'local_abc',
    name: 'Bench Press',
    exercise_type: 'compound',
    primary_muscles: ['chest'],
    secondary_muscles: ['triceps'],
    alt_names: [],
    description: '',
    weight_direction: 1,
    created_at: 1000,
  },
];

const NEW_INPUT: NewExerciseInput = {
  name: 'Squat',
  exercise_type: 'compound',
  primary_muscles: ['legs'],
  secondary_muscles: [],
  alt_names: [],
  description: '',
  is_private: false,
  weight_direction: 1,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getAllExercises).mockResolvedValue(MOCK_EXERCISES);
  jest.mocked(insertExercise).mockResolvedValue('local_new');
});

describe('useExercises', () => {
  it('starts with isLoading=true and an empty list before the DB resolves', async () => {
    const { result } = renderHook(() => useExercises());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.exercises).toEqual([]);
    // flush pending async state so the next test doesn't get act() warnings
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('loads exercises from the DB on mount', async () => {
    const { result } = renderHook(() => useExercises());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(getAllExercises).toHaveBeenCalledTimes(1);
    expect(result.current.exercises).toEqual(MOCK_EXERCISES);
  });

  it('createExercise inserts the exercise and refreshes the list', async () => {
    const refreshed: LocalExercise[] = [
      ...MOCK_EXERCISES,
      { ...MOCK_EXERCISES[0], local_id: 'local_new', name: 'Squat', created_at: 2000 },
    ];
    jest.mocked(getAllExercises)
      .mockResolvedValueOnce(MOCK_EXERCISES)
      .mockResolvedValueOnce(refreshed);

    const { result } = renderHook(() => useExercises());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.createExercise(NEW_INPUT);
    });

    expect(insertExercise).toHaveBeenCalledWith(NEW_INPUT);
    expect(getAllExercises).toHaveBeenCalledTimes(2);
    expect(result.current.exercises).toHaveLength(2);
  });

  it('reflects an empty DB without errors', async () => {
    jest.mocked(getAllExercises).mockResolvedValue([]);

    const { result } = renderHook(() => useExercises());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.exercises).toEqual([]);
  });
});
