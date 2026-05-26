import { Stack } from "expo-router";
import '@/global.css'
import { AuthProvider } from './_context/auth';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="workout" options={{ presentation: 'fullScreenModal' }} />
      </Stack>
    </AuthProvider>
  );
}
