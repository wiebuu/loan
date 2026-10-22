import {
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeScreen } from './src/screens/HomeScreen';
import { LoadingScreen } from './src/screens/LoadingScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { colors } from './src/theme';
import { Session } from './src/types';

// Keep the static native splash up until our animated loading screen has drawn.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Show the loading animation for at least this long so it doesn't just flash. */
const MIN_LOADING_MS = 1800;

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [showLoading, setShowLoading] = useState(true);
  const fade = useRef(new Animated.Value(1)).current;

  // Logged out -> Login screen; logged in -> Home. No navigation library needed for two screens.
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setMinTimePassed(true), MIN_LOADING_MS);
    return () => clearTimeout(t);
  }, []);

  const ready = (fontsLoaded || !!fontError) && minTimePassed;

  // Fade the loading screen out once everything is ready.
  useEffect(() => {
    if (!ready) return;
    Animated.timing(fade, { toValue: 0, duration: 350, useNativeDriver: Platform.OS !== 'web' }).start(() =>
      setShowLoading(false),
    );
  }, [ready, fade]);

  return (
    <SafeAreaProvider>
      <StatusBar style={showLoading || !session ? 'light' : 'dark'} />
      <View style={styles.root}>
        {fontsLoaded || fontError ? (
          session ? (
            <HomeScreen session={session} onLogout={() => setSession(null)} />
          ) : (
            <LoginScreen onLoggedIn={setSession} />
          )
        ) : null}

        {showLoading ? (
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
            <LoadingScreen fontsLoaded={fontsLoaded} onReady={() => SplashScreen.hideAsync().catch(() => undefined)} />
          </Animated.View>
        ) : null}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.brandDark },
});
