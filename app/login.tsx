import { View, Text, TouchableOpacity, StatusBar, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useAuth } from './_context/auth';
import FormField from './components/FormField';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!username.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      await login(username.trim(), password);
      router.replace('/home');
    } catch (e: any) {
      setError(e?.message ?? 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#18181b', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#27272a' }}
        >
          <Ionicons name="arrow-back" size={20} color="#a1a1aa" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 40, paddingBottom: 48 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 8 }}>
          Welcome back
        </Text>
        <Text style={{ color: '#71717a', fontSize: 16, marginBottom: 40, lineHeight: 24 }}>
          Sign in to continue tracking your progress.
        </Text>

        {error !== '' && (
          <View style={{ backgroundColor: 'rgba(239,68,68,0.07)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', borderRadius: 14, padding: 16, marginBottom: 24 }}>
            <Text style={{ color: '#ef4444', fontSize: 14 }}>{error}</Text>
          </View>
        )}

        <FormField
          label="Username"
          value={username}
          onChangeText={setUsername}
          placeholder="Your username"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <FormField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          secureTextEntry={!showPassword}
          rightIcon={
            <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#52525b" />
            </TouchableOpacity>
          }
        />

        <TouchableOpacity activeOpacity={0.85} onPress={handleLogin} disabled={loading} style={{ marginTop: 8 }}>
          <LinearGradient
            colors={['#f4f4f5', '#a1a1aa']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 16, paddingVertical: 17, alignItems: 'center' }}
          >
            {loading
              ? <ActivityIndicator color="#09090b" />
              : <Text style={{ color: '#09090b', fontWeight: '700', fontSize: 17 }}>Sign In</Text>
            }
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 32 }}>
          <Text style={{ color: '#71717a', fontSize: 14 }}>Don&#39;t have an account? </Text>
          <TouchableOpacity onPress={() => router.replace('/signup')}>
            <Text style={{ color: '#f4f4f5', fontSize: 14, fontWeight: '600' }}>Create one</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
