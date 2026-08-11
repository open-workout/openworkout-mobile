jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), replace: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));
jest.mock('../../app/hooks/useExercises', () => ({ useExercises: jest.fn() }));
jest.mock('../../app/hooks/useKeyboardHeight', () => ({ useKeyboardHeight: jest.fn() }));

import { render, screen, fireEvent } from '@testing-library/react-native';
import { Platform } from 'react-native';
import EditRoutineScreen from '../../app/edit-routine';
import { useExercises } from '../../app/hooks/useExercises';
import { useKeyboardHeight } from '../../app/hooks/useKeyboardHeight';
import { FIXTURE_EXERCISES, CABLE_MATCHES, LAST_CABLE_MATCH } from '../fixtures/exercises';

const originalPlatformOS = Platform.OS;

beforeEach(() => {
  jest.mocked(useExercises).mockReturnValue({
    exercises: FIXTURE_EXERCISES,
    isLoading: false,
    createExercise: jest.fn(),
    editExercise: jest.fn(),
    deleteExercise: jest.fn(),
  });
  jest.mocked(useKeyboardHeight).mockReturnValue(0);
});

afterEach(() => {
  Platform.OS = originalPlatformOS;
});

function openPickerAndSearchCable() {
  render(<EditRoutineScreen />);
  fireEvent.press(screen.getByTestId('routine-add-exercise-trigger'));
  fireEvent.changeText(screen.getByPlaceholderText('Search exercises…'), 'cable');
}

describe('Routine builder "Add Exercise" picker (edit-routine.tsx)', () => {
  it('renders every "cable" match, including the last one', () => {
    openPickerAndSearchCable();

    for (const name of CABLE_MATCHES) {
      expect(screen.getByText(name)).toBeTruthy();
    }
    expect(screen.getByText(LAST_CABLE_MATCH)).toBeTruthy();
  });

  it('pads the results list by the live keyboard height on iOS', () => {
    Platform.OS = 'ios';
    jest.mocked(useKeyboardHeight).mockReturnValue(300);

    openPickerAndSearchCable();

    const list = screen.getByTestId('routine-exercise-picker-list');
    expect(list.props.contentContainerStyle.paddingBottom).toBe(300 + 24);
  });

  it('does not double-pad on Android, since the Modal already resizes for the keyboard natively', () => {
    Platform.OS = 'android';
    jest.mocked(useKeyboardHeight).mockReturnValue(300);

    openPickerAndSearchCable();

    const list = screen.getByTestId('routine-exercise-picker-list');
    expect(list.props.contentContainerStyle.paddingBottom).toBe(24);
  });
});
