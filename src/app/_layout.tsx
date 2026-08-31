import { Stack } from 'expo-router';

export default function RootLayout() {
  // Onboarding gate (redirect when onboarding_complete is false) lands here in M3.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding/index" />
      <Stack.Screen name="log/[date]" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
