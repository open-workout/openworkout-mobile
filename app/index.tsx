import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { getActiveSplit } from '@/db/splits';
import { hasCompletedOnboarding } from '@/storage';

export default function Index() {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    async function check() {
      const [split, onboardingDone] = await Promise.all([
        getActiveSplit(),
        hasCompletedOnboarding(),
      ]);
      setTarget(split || onboardingDone ? '/home' : '/welcome');
    }
    check();
  }, []);

  if (!target) return <View style={{ flex: 1, backgroundColor: '#0a0a0a' }} />;
  return <Redirect href={target as any} />;
}
