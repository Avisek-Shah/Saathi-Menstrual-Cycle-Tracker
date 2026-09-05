import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';

import { colors } from '../theme/colors';
import { useSettingsStore } from '../stores/useSettingsStore';

// Keep the native splash on screen until the overlay below is mounted and ready to take
// over — otherwise there's a blank white frame between native splash and first JS paint.
void SplashScreen.preventAutoHideAsync();

// SPEC: the splash clip runs ~3s. If `playToEnd` never arrives (asset failed to decode,
// player stalled) the overlay would sit on screen forever, so the wait is hard-capped.
const SPLASH_MAX_MS = 4500;
// Same idea for the native splash: if the player never reports a status, stop waiting.
const PLAYER_READY_MAX_MS = 1500;

// SPEC: overlay plays assets/splash_animation.mp4 once over the same background the
// native expo-splash-screen plugin config in app.json uses, so the native→JS handoff has
// no visible pop. Two timing rules keep it a single continuous splash rather than a
// sequence of separate screens:
//   - the native splash is held until the player can actually paint, otherwise the mark
//     disappears and a bare background frame shows before the clip's first frame;
//   - it cuts (not cross-fades) to the app on the last frame, because a fade blends the
//     clip's final frame with the home screen underneath and reads as two screens stacked.
function AnimatedSplashOverlay({
  onReady,
  onFinished,
}: {
  onReady: () => void;
  onFinished: () => void;
}) {
  const player = useVideoPlayer(require('../../assets/splash_animation.mp4'), (p) => {
    p.loop = false;
    p.play();
  });

  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'readyToPlay' || status === 'error') onReady();
  });

  useEventListener(player, 'playToEnd', onFinished);

  useEffect(() => {
    const readyTimer = setTimeout(onReady, PLAYER_READY_MAX_MS);
    const finishTimer = setTimeout(onFinished, SPLASH_MAX_MS);
    return () => {
      clearTimeout(readyTimer);
      clearTimeout(finishTimer);
    };
  }, [onReady, onFinished]);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.overlay]}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls={false}
      />
    </View>
  );
}

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const hydrate = useSettingsStore((s) => s.hydrate);
  const hydrated = useSettingsStore((s) => s.hydrated);
  const onboardingComplete = useSettingsStore((s) => s.settings.onboarding_complete);

  // True once the splash clip has finished and the overlay has unmounted.
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

  // Fires once the splash player can paint. Hiding the native splash here (rather than on
  // overlay mount) means the video's first frame is what replaces the native mark.
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
          <AnimatedSplashOverlay onReady={onOverlayReady} onFinished={onIntroFinished} />
        ) : null}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    // SPEC: matches assets/splash_animation.mp4's own background, not colors.bg —
    // keeps the video edge-to-edge with no color seam during playback.
    backgroundColor: '#FBE4CE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: {
    width: '70%',
    height: '70%',
  },
});
