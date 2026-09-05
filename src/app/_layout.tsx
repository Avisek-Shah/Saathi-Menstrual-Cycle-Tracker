import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';
import { useSettingsStore } from '../stores/useSettingsStore';

// Keep the native splash on screen until the overlay below is mounted and ready to take
// over — otherwise there's a blank white frame between native splash and first JS paint.
void SplashScreen.preventAutoHideAsync();

// SPEC: overlay reuses assets/splash-icon.png at the same size/position the native
// expo-splash-screen plugin config in app.json renders it at, and the same `colors.bg`
// background, so the native→JS handoff has no visible pop/jump. No lottie-react-native —
// react-native-reanimated is already a project dependency (§2), so the bloom/fade below
// adds no new package.
function AnimatedSplashOverlay({ onFinished }: { onFinished: () => void }) {
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0.92);

  useEffect(() => {
    // Blooming pulse (scale up past 1, settle back) then fade the whole overlay out.
    scale.value = withSequence(
      withTiming(1.06, { duration: 320, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 220, easing: Easing.inOut(Easing.quad) }),
    );
    opacity.value = withSequence(
      withTiming(1, { duration: 420 }),
      withTiming(0, { duration: 360 }, (finished) => {
        if (finished) runOnJS(onFinished)();
      }),
    );
  }, [onFinished, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.overlay, style]}
    >
      <Image
        source={require('../../assets/splash-icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const hydrate = useSettingsStore((s) => s.hydrate);
  const hydrated = useSettingsStore((s) => s.hydrated);
  const onboardingComplete = useSettingsStore((s) => s.settings.onboarding_complete);

  // True once the intro animation has faded out and the overlay has unmounted.
  const [introDone, setIntroDone] = useState(false);

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

  // Fires once the overlay mounts on top of the (already-hydrated) app. The native splash
  // hides right here, revealing the overlay instead of a blank frame, then the overlay
  // itself takes over the fade.
  const onOverlayReady = useCallback(() => {
    void SplashScreen.hideAsync();
  }, []);

  const onIntroFinished = useCallback(() => setIntroDone(true), []);

  return (
    // §11.6 — SafeAreaProvider must wrap everything: without it every inset reads 0 and the
    // tab bar and onboarding footer render underneath the system navigation bar.
    // GestureHandlerRootView is required for the calendar month swipe (§6.3).
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        {/* Hold the first frame until we know whether onboarding is needed (§6.1, avoids a flash). */}
        {hydrated ? (
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="onboarding/index" />
            <Stack.Screen name="log/[date]" options={{ presentation: 'modal' }} />
            <Stack.Screen name="settings/profile" options={{ presentation: 'modal' }} />
          </Stack>
        ) : null}
        {hydrated && !introDone ? (
          <AnimatedSplashOverlayMount onReady={onOverlayReady} onFinished={onIntroFinished} />
        ) : null}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Separate from AnimatedSplashOverlay so `onReady` (hide native splash) fires from a plain
// mount effect, kept apart from the animation's own useEffect above.
function AnimatedSplashOverlayMount({
  onReady,
  onFinished,
}: {
  onReady: () => void;
  onFinished: () => void;
}) {
  useEffect(() => {
    onReady();
    // Intentionally once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <AnimatedSplashOverlay onFinished={onFinished} />;
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 160,
    height: 160,
  },
});
