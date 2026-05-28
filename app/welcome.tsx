import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { markOnboardingDone } from './storage';

const C = {
  bg: '#0a0a0a',
  card: '#18181b',
  border: '#27272a',
  text: '#f4f4f5',
  textMuted: '#71717a',
  textDim: '#52525b',
  active: '#f4f4f5',
  activeDark: '#09090b',
};

export default function WelcomeScreen() {
  const router = useRouter();

  async function handleSkip() {
    await markOnboardingDone();
    router.replace('/home');
  }

  function handleStartSetup() {
    router.replace('/onboarding');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />

      <View style={{ flex: 1, paddingHorizontal: 28, justifyContent: 'space-between', paddingTop: 60, paddingBottom: 24 }}>

        {/* Logo + headline */}
        <View style={{ alignItems: 'center', gap: 20 }}>
          <View style={{
            width: 88, height: 88, borderRadius: 28,
            backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <MaterialCommunityIcons name="dumbbell" size={44} color={C.text} />
          </View>
          <View style={{ alignItems: 'center', gap: 10 }}>
            <Text style={{ color: C.text, fontSize: 34, fontWeight: '900', letterSpacing: -0.5 }}>
              OpenWorkout
            </Text>
            <Text style={{ color: C.textMuted, fontSize: 16, textAlign: 'center', lineHeight: 24 }}>
              Track your training, built around{'\n'}your schedule.
            </Text>
          </View>
        </View>

        {/* Feature hints */}
        <View style={{ gap: 16 }}>
          {[
            { icon: 'calendar-outline' as const, label: 'Structure your week with a training split' },
            { icon: 'barbell-outline' as const, label: 'Log sets and track personal records' },
            { icon: 'trending-up-outline' as const, label: 'Watch your progress over time' },
          ].map(({ icon, label }) => (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{
                width: 40, height: 40, borderRadius: 12,
                backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <MaterialCommunityIcons name={icon as any} size={20} color={C.textMuted} />
              </View>
              <Text style={{ color: C.textMuted, fontSize: 14, flex: 1 }}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={{ gap: 12 }}>
          <TouchableOpacity
            onPress={handleStartSetup}
            activeOpacity={0.85}
            style={{
              backgroundColor: C.active,
              borderRadius: 14,
              paddingVertical: 17,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: C.activeDark, fontSize: 16, fontWeight: '700' }}>Start Setup</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSkip}
            activeOpacity={0.7}
            style={{ paddingVertical: 14, alignItems: 'center' }}
          >
            <Text style={{ color: C.textDim, fontSize: 15, fontWeight: '500' }}>Skip for now</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}
