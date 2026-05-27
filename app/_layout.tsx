import { Stack } from "expo-router";
import '@/global.css'

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="workout" options={{ presentation: 'fullScreenModal' }} />
    </Stack>
  );
}
