import * as SecureStore from 'expo-secure-store';

const ONBOARDING_DONE_KEY = 'onboarding_done';
const WEIGHT_UNIT_KEY = 'weight_unit';

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
