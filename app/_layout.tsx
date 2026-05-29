import { Stack } from "expo-router";
import '@/global.css'

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="welcome" options={{ headerShown: false, gestureEnabled: false, animation: 'none' }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false, animation: 'none' }} />
      <Stack.Screen name="pick-day" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="edit-split" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="workout" options={{ presentation: 'fullScreenModal' }} />
    </Stack>
  );
}
