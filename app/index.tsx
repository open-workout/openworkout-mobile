import { View, Text, TouchableOpacity, ImageBackground, StatusBar } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-[#0a0a0a]">
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1000&auto=format&fit=crop' }}
        style={{ flex: 1 }}
        imageStyle={{ opacity: 0.35 }}
      >
        <LinearGradient
          colors={['rgba(10,10,10,0.2)', 'rgba(10,10,10,0.65)', '#0a0a0a']}
          style={{ flex: 1 }}
        >
          <SafeAreaView style={{ flex: 1, paddingHorizontal: 24, paddingBottom: 48 }}>
            {/* Logo */}
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <LinearGradient
                colors={['#e4e4e7', '#a1a1aa', '#71717a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 80, height: 80, borderRadius: 24,
                  alignItems: 'center', justifyContent: 'center',
                  marginBottom: 24,
                  shadowColor: '#e4e4e7', shadowOpacity: 0.2, shadowRadius: 20,
                }}
              >
                <MaterialCommunityIcons name="dumbbell" size={40} color="#09090b" />
              </LinearGradient>
              <Text style={{ color: '#fff', fontSize: 36, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' }}>
                OpenWorkout
              </Text>
              <Text style={{ color: '#71717a', marginTop: 16, textAlign: 'center', fontSize: 18, maxWidth: 280, lineHeight: 26 }}>
                The smartest way to log sets, analyze volume, and smash records.
              </Text>
            </View>

            {/* Buttons */}
            <View style={{ gap: 12 }}>
              <TouchableOpacity onPress={() => router.push('/signup')} activeOpacity={0.85}>
                <LinearGradient
                  colors={['#f4f4f5', '#a1a1aa']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ borderRadius: 16, paddingVertical: 17, alignItems: 'center', shadowColor: '#a1a1aa', shadowOpacity: 0.15, shadowRadius: 20 }}
                >
                  <Text style={{ color: '#09090b', fontWeight: '700', fontSize: 18 }}>Create Account</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/login')}
                activeOpacity={0.85}
                style={{ backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 16, paddingVertical: 17, alignItems: 'center' }}
              >
                <Text style={{ color: '#e4e4e7', fontWeight: '700', fontSize: 18 }}>Log In</Text>
              </TouchableOpacity>

              <Text style={{ color: '#52525b', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
                By continuing, you agree to our{' '}
                <Text style={{ color: '#71717a', textDecorationLine: 'underline' }}>Terms</Text>
                {' '}and{' '}
                <Text style={{ color: '#71717a', textDecorationLine: 'underline' }}>Privacy Policy</Text>.
              </Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}
