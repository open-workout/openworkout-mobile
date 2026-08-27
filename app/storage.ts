import * as SecureStore from 'expo-secure-store';

const ONBOARDING_DONE_KEY = 'onboarding_done';
const WEIGHT_UNIT_KEY = 'weight_unit';
const WORKOUT_PREFS_KEY = 'workout_preferences';
const LANGUAGE_KEY = 'app_language';

export type WorkoutPreferences = {
  compound_exercises: number;
  accessory_exercises: number;
  isolation_exercises: number;
  progress_reps: number;
  weekly_goal: number;
};

export const DEFAULT_WORKOUT_PREFS: WorkoutPreferences = {
  compound_exercises: 1,
  accessory_exercises: 1,
  isolation_exercises: 1,
  progress_reps: 8,
  weekly_goal: 3,
};

export async function markOnboardingDone(): Promise<void> {
  await SecureStore.setItemAsync(ONBOARDING_DONE_KEY, '1');
}

export async function hasCompletedOnboarding(): Promise<boolean> {
  return (await SecureStore.getItemAsync(ONBOARDING_DONE_KEY)) !== null;
}

export async function getWeightUnit(): Promise<'kg' | 'lbs'> {
  const v = await SecureStore.getItemAsync(WEIGHT_UNIT_KEY);
  return v === 'lbs' ? 'lbs' : 'kg';
}

export async function setWeightUnit(unit: 'kg' | 'lbs'): Promise<void> {
  await SecureStore.setItemAsync(WEIGHT_UNIT_KEY, unit);
}

export async function getLanguage(): Promise<string | null> {
  return SecureStore.getItemAsync(LANGUAGE_KEY);
}

export async function setLanguage(lang: string): Promise<void> {
  await SecureStore.setItemAsync(LANGUAGE_KEY, lang);
}

export async function getWorkoutPreferences(): Promise<WorkoutPreferences> {
  const v = await SecureStore.getItemAsync(WORKOUT_PREFS_KEY);
  if (!v) return { ...DEFAULT_WORKOUT_PREFS };
  try {
    return { ...DEFAULT_WORKOUT_PREFS, ...JSON.parse(v) };
  } catch {
    return { ...DEFAULT_WORKOUT_PREFS };
  }
}

export async function setWorkoutPreferences(prefs: WorkoutPreferences): Promise<void> {
  await SecureStore.setItemAsync(WORKOUT_PREFS_KEY, JSON.stringify(prefs));
}
