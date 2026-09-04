jest.mock('../../app/hooks/useExercises', () => ({ useExercises: jest.fn() }));

import { render, screen, fireEvent } from '@testing-library/react-native';
import ExploreScreen from '../../app/components/ExercisesTabPage';
import { useExercises } from '../../app/hooks/useExercises';
import { FIXTURE_EXERCISES, CABLE_MATCHES, LAST_CABLE_MATCH } from '../fixtures/exercises';
import i18n from '../../app/i18n';
import type { Exercise } from '../../app/db/exercises';

const BENCH_PRESS_SEED: Exercise = {
  id: 'ex-bench-seed',
  name: 'Bench Press (Barbell)',
  exercise_type: 'compound',
  primary_muscles: ['chest'],
  secondary_muscles: ['front delts', 'triceps'],
  alt_names: ['Bench Press', 'Flat Bench'],
  description: '',
  weight_direction: 1,
  logging_type: 'reps',
  created_at: 8,
  animation_name: null,
  can_be_done_in_reps: true,
  can_be_done_in_time: true,
  can_be_done_in_distance: false,
  requires_weight: true,
  equipment: [],
  csv_id: null,
  human_readable_id: null,
};

beforeEach(() => {
  jest.mocked(useExercises).mockReturnValue({
    exercises: FIXTURE_EXERCISES,
    isLoading: false,
    createExercise: jest.fn(),
    editExercise: jest.fn(),
    deleteExercise: jest.fn(),
    reload: jest.fn(),
  });
  i18n.changeLanguage('en');
});

afterEach(() => {
  i18n.changeLanguage('en');
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

describe('Library exercise search in a non-English locale', () => {
  beforeEach(() => {
    jest.mocked(useExercises).mockReturnValue({
      exercises: [BENCH_PRESS_SEED],
      isLoading: false,
      createExercise: jest.fn(),
      editExercise: jest.fn(),
      deleteExercise: jest.fn(),
      reload: jest.fn(),
    });
  });

  it('finds a translated exercise by searching in the active (French) language', () => {
    i18n.changeLanguage('fr');
    render(<ExploreScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Rechercher un exercice...'), 'couché');

    expect(screen.getByText('Développé couché (Barre)')).toBeTruthy();
  });

  it('still finds the same exercise by its English name while in French', () => {
    i18n.changeLanguage('fr');
    render(<ExploreScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Rechercher un exercice...'), 'flat bench');

    expect(screen.getByText('Développé couché (Barre)')).toBeTruthy();
  });

  it('displays the translated name and muscle label while in German', () => {
    i18n.changeLanguage('de');
    render(<ExploreScreen />);

    expect(screen.getByText('Bankdrücken (Langhantel)')).toBeTruthy();
  });
});
