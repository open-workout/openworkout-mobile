import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StatusBar, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { insertSplit } from './db/splits';
import { markOnboardingDone, setWeightUnit, setWorkoutPreferences, getWorkoutPreferences, type WorkoutPreferences } from './storage';
import type { SplitDay } from './constants/splits';
import SplitEditor from './components/SplitEditor';
import WorkoutPrefsEditor from './components/WorkoutPrefsEditor';

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'unit' | 'split' | 'preferences'>('unit');
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');
  const [pendingSplit, setPendingSplit] = useState<{ name: string; days: SplitDay[] } | null>(null);
  const [prefs, setPrefs] = useState<WorkoutPreferences>({
    compound_exercises: 3,
    accessory_exercises: 3,
    isolation_exercises: 2,
    compound_sets: 4,
    accessory_sets: 3,
    isolation_sets: 3,
  });

  async function handleSplitSave(name: string, days: SplitDay[]) {
    setPendingSplit({ name, days });
    setStep('preferences');
  }

  async function handlePreferencesDone() {
    await setWorkoutPreferences(prefs);
    if (pendingSplit) await insertSplit(pendingSplit);
    await markOnboardingDone();
    router.replace('/home');
  }

  if (step === 'unit') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" />
        <View style={{ flex: 1, paddingHorizontal: 28, justifyContent: 'space-between', paddingTop: 60, paddingBottom: 24 }}>

          <View style={{ gap: 12 }}>
            <Text style={{ color: '#f4f4f5', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 }}>
              Which unit do you use?
            </Text>
            <Text style={{ color: '#71717a', fontSize: 15, lineHeight: 22 }}>
              You can change this at any time in your profile.
            </Text>
          </View>

          <View style={{ gap: 12 }}>
            {(['kg', 'lbs'] as const).map((u) => {
              const selected = unit === u;
              return (
                <TouchableOpacity
                  key={u}
                  onPress={() => setUnit(u)}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: selected ? '#f4f4f5' : '#18181b',
                    borderRadius: 16,
                    paddingVertical: 22,
                    paddingHorizontal: 24,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderWidth: 1,
                    borderColor: selected ? '#f4f4f5' : '#27272a',
                  }}
                >
                  <View>
                    <Text style={{ color: selected ? '#09090b' : '#f4f4f5', fontSize: 20, fontWeight: '800' }}>
                      {u === 'kg' ? 'Kilograms' : 'Pounds'}
                    </Text>
                    <Text style={{ color: selected ? '#3f3f46' : '#52525b', fontSize: 13, marginTop: 3 }}>
                      {u}
                    </Text>
                  </View>
                  {selected && <Ionicons name="checkmark-circle" size={24} color="#09090b" />}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={async () => {
              await setWeightUnit(unit);
              setStep('split');
            }}
            activeOpacity={0.85}
            style={{ backgroundColor: '#f4f4f5', borderRadius: 14, paddingVertical: 17, alignItems: 'center' }}
          >
            <Text style={{ color: '#09090b', fontSize: 16, fontWeight: '700' }}>Continue</Text>
          </TouchableOpacity>

        </View>
      </SafeAreaView>
    );
  }

  if (step === 'split') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" />
        <View style={{ flex: 1, paddingTop: 16 }}>
          <SplitEditor saveLabel="Continue" onSave={handleSplitSave} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />
      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 28, paddingTop: 60, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ gap: 8, marginBottom: 40 }}>
            <Text style={{ color: '#f4f4f5', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 }}>
              Workout structure
            </Text>
            <Text style={{ color: '#71717a', fontSize: 15, lineHeight: 22 }}>
              How do you usually structure your sessions? You can change this later.
            </Text>
          </View>
          <WorkoutPrefsEditor prefs={prefs} onChange={setPrefs} />
        </ScrollView>

        <View style={{ paddingHorizontal: 28, paddingBottom: 24, paddingTop: 8 }}>
          <TouchableOpacity
            onPress={handlePreferencesDone}
            activeOpacity={0.85}
            style={{ backgroundColor: '#f4f4f5', borderRadius: 14, paddingVertical: 17, alignItems: 'center' }}
          >
            <Text style={{ color: '#09090b', fontSize: 16, fontWeight: '700' }}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
