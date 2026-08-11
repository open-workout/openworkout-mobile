jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), replace: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));
jest.mock('../../app/hooks/useWorkouts', () => ({ useWorkouts: jest.fn() }));
jest.mock('../../app/hooks/useExercises', () => ({ useExercises: jest.fn() }));
jest.mock('../../app/hooks/useWeightUnit', () => ({ useWeightUnit: jest.fn() }));
jest.mock('../../app/hooks/useKeyboardHeight', () => ({ useKeyboardHeight: jest.fn() }));
jest.mock('../../app/storage', () => ({ getWorkoutPreferences: jest.fn() }));

import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import WorkoutScreen from '../../app/workout';
import { useWorkouts } from '../../app/hooks/useWorkouts';
import { useExercises } from '../../app/hooks/useExercises';
import { useWeightUnit } from '../../app/hooks/useWeightUnit';
import { useKeyboardHeight } from '../../app/hooks/useKeyboardHeight';
import { getWorkoutPreferences } from '../../app/storage';
import { FIXTURE_EXERCISES, CABLE_MATCHES, LAST_CABLE_MATCH } from '../fixtures/exercises';

const originalPlatformOS = Platform.OS;

beforeEach(() => {
  jest.mocked(useWorkouts).mockReturnValue({
    finishWorkout: jest.fn(),
    renameWorkout: jest.fn(),
    addSet: jest.fn(),
    editSet: jest.fn(),
    removeSet: jest.fn(),
  } as unknown as ReturnType<typeof useWorkouts>);
  jest.mocked(useExercises).mockReturnValue({
    exercises: FIXTURE_EXERCISES,
    isLoading: false,
    createExercise: jest.fn(),
    editExercise: jest.fn(),
    deleteExercise: jest.fn(),
  });
  jest.mocked(useWeightUnit).mockReturnValue({
    unit: 'kg',
    update: jest.fn(),
    reload: jest.fn(),
  });
  jest.mocked(useKeyboardHeight).mockReturnValue(0);
  jest.mocked(getWorkoutPreferences).mockResolvedValue(undefined as never);
});

afterEach(() => {
  Platform.OS = originalPlatformOS;
});

async function openPickerAndSearchCable() {
  render(<WorkoutScreen />);
  await waitFor(() => expect(getWorkoutPreferences).toHaveBeenCalled());

  fireEvent.press(screen.getByTestId('workout-add-exercise-trigger'));
  fireEvent.changeText(screen.getByPlaceholderText('Search exercises...'), 'cable');
}

describe('Workout "Add Exercise" picker (workout.tsx)', () => {
  it('renders every "cable" match, including the last one', async () => {
    await openPickerAndSearchCable();

    for (const name of CABLE_MATCHES) {
      expect(screen.getByText(name)).toBeTruthy();
    }
    expect(screen.getByText(LAST_CABLE_MATCH)).toBeTruthy();
  });

  it('pads the results list by the live keyboard height on iOS', async () => {
    Platform.OS = 'ios';
    jest.mocked(useKeyboardHeight).mockReturnValue(300);

    await openPickerAndSearchCable();

    const list = screen.getByTestId('workout-exercise-picker-list');
    expect(list.props.contentContainerStyle.paddingBottom).toBe(300 + 24);
  });

  it('does not double-pad on Android, since the Modal already resizes for the keyboard natively', async () => {
    Platform.OS = 'android';
    jest.mocked(useKeyboardHeight).mockReturnValue(300);

    await openPickerAndSearchCable();

    const list = screen.getByTestId('workout-exercise-picker-list');
    expect(list.props.contentContainerStyle.paddingBottom).toBe(24);
  });
});
