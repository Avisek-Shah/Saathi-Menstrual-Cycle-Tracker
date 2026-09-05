import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';
import { useSettingsStore } from '../stores/useSettingsStore';

// Keep the native splash on screen until the settings hydration below has finished —
// otherwise there's a blank frame, or an onboarding flash, between the native splash and
// the first JS paint.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const hydrate = useSettingsStore((s) => s.hydrate);
  const hydrated = useSettingsStore((s) => s.hydrated);
  const onboardingComplete = useSettingsStore((s) => s.settings.onboarding_complete);

  useEffect(() => {
    // "Background init": the same SQLite settings read the app already relies on to know
    // whether onboarding is needed. Nothing mocked here — this is the real hydration path.
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

  // Hide the native splash once hydration has resolved onboarding vs. tabs, so there's no
  // blank frame or flash of the wrong screen underneath it.
  useEffect(() => {
    if (hydrated) void SplashScreen.hideAsync();
  }, [hydrated]);

  return (
    // §11.6 — SafeAreaProvider must wrap everything: without it every inset reads 0 and the
    // tab bar and onboarding footer render underneath the system navigation bar.
    // GestureHandlerRootView is required for the calendar month swipe (§6.3).
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        {/* Hold the first frame until we know whether onboarding is needed (§6.1, avoids a flash). */}
        {hydrated ? (
          <Stack
            screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="onboarding/index" />
            <Stack.Screen name="log/[date]" options={{ presentation: 'modal' }} />
            <Stack.Screen name="settings/profile" options={{ presentation: 'modal' }} />
          </Stack>
        ) : null}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
