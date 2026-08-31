import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { useSettingsStore } from '../stores/useSettingsStore';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const hydrate = useSettingsStore((s) => s.hydrate);
  const hydrated = useSettingsStore((s) => s.hydrated);
  const onboardingComplete = useSettingsStore((s) => s.settings.onboarding_complete);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    const inOnboarding = segments[0] === 'onboarding';
    if (!onboardingComplete && !inOnboarding) {
      router.replace('/onboarding');
    } else if (onboardingComplete && inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [hydrated, onboardingComplete, segments, router]);

  // Hold the first frame until we know whether onboarding is needed (§6.1, avoids a flash).
  if (!hydrated) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding/index" />
      <Stack.Screen name="log/[date]" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
