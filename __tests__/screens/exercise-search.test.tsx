jest.mock('../../app/hooks/useExercises', () => ({ useExercises: jest.fn() }));

import { render, screen, fireEvent } from '@testing-library/react-native';
import ExploreScreen from '../../app/(tabs)/explore';
import { useExercises } from '../../app/hooks/useExercises';
import { FIXTURE_EXERCISES, CABLE_MATCHES, LAST_CABLE_MATCH } from '../fixtures/exercises';

beforeEach(() => {
  jest.mocked(useExercises).mockReturnValue({
    exercises: FIXTURE_EXERCISES,
    isLoading: false,
    createExercise: jest.fn(),
    editExercise: jest.fn(),
    deleteExercise: jest.fn(),
  });
});

describe('Library exercise search (explore.tsx)', () => {
  it('renders every match for "cable", including the last one', () => {
    render(<ExploreScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Find an exercise...'), 'cable');

    for (const name of CABLE_MATCHES) {
      expect(screen.getByText(name)).toBeTruthy();
    }
    // The bug this guards against: the last result silently dropped/clipped
    // from the list rather than merely scrolled past.
    expect(screen.getByText(LAST_CABLE_MATCH)).toBeTruthy();
  });

  it('excludes non-matching exercises once filtered', () => {
    render(<ExploreScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Find an exercise...'), 'cable');

    expect(screen.queryByText('Bench Press')).toBeNull();
    expect(screen.queryByText('Squat')).toBeNull();
  });
});
