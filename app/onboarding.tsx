import React from 'react';
import { View, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { insertSplit } from './db/splits';
import { markOnboardingDone } from './storage';
import type { SplitDay } from './constants/splits';
import SplitEditor from './components/SplitEditor';

export default function OnboardingScreen() {
  const router = useRouter();

  async function handleSave(name: string, days: SplitDay[]) {
    await insertSplit({ name, days });
    await markOnboardingDone();
    router.replace('/home');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />
      <View style={{ flex: 1, paddingTop: 16 }}>
        <SplitEditor saveLabel="Get Started" onSave={handleSave} />
      </View>
    </SafeAreaView>
  );
}
