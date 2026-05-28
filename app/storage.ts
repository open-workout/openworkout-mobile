import * as SecureStore from 'expo-secure-store';

const ONBOARDING_DONE_KEY = 'onboarding_done';

export async function markOnboardingDone(): Promise<void> {
  await SecureStore.setItemAsync(ONBOARDING_DONE_KEY, '1');
}

export async function hasCompletedOnboarding(): Promise<boolean> {
  return (await SecureStore.getItemAsync(ONBOARDING_DONE_KEY)) !== null;
}
