import {
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as api from './src/api';
import { loadToken, saveToken } from './src/api/storage';
import { LoadingScreen } from './src/screens/LoadingScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { MainScreen } from './src/screens/MainScreen';
import { UsernameScreen } from './src/screens/UsernameScreen';
import { ThemeProvider, useColors } from './src/theme';
import { User } from './src/types';

// Keep the static native splash up until our animated loading screen has drawn.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Show the loading animation for at least this long so it doesn't just flash. */
const MIN_LOADING_MS = 1800;

export default function App() {
  return (
    <ThemeProvider>
      <Root />
    </ThemeProvider>
  );
}

function Root() {
  const colors = useColors();
  const [fontsLoaded, fontError] = useFonts({
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [showLoading, setShowLoading] = useState(true);
  const fade = useRef(new Animated.Value(1)).current;

  // Logged out -> Login; logged in without a username -> pick one; otherwise the app.
  const [user, setUser] = useState<User | null>(null);

  const logout = useCallback(async () => {
    api.logout().catch(() => undefined);
    api.setToken(null);
    await saveToken(null);
    setUser(null);
  }, []);

  // On launch, pick up the saved login, if it's still valid.
  useEffect(() => {
    api.setUnauthorizedHandler(() => {
      api.setToken(null);
      saveToken(null);
      setUser(null);
    });
    (async () => {
      const token = await loadToken();
      if (token) {
        api.setToken(token);
        try {
          setUser(await api.getMe());
        } catch {
          api.setToken(null);
        }
      }
      setSessionChecked(true);
    })();
    const t = setTimeout(() => setMinTimePassed(true), MIN_LOADING_MS);
    return () => clearTimeout(t);
  }, []);

  async function loggedIn(token: string, u: User) {
    api.setToken(token);
    await saveToken(token);
    setUser(u);
  }

  const fontsReady = fontsLoaded || !!fontError;
  const ready = fontsReady && minTimePassed && sessionChecked;

  // Fade the loading screen out once everything is ready.
  useEffect(() => {
    if (!ready) return;
    Animated.timing(fade, { toValue: 0, duration: 350, useNativeDriver: Platform.OS !== 'web' }).start(() =>
      setShowLoading(false),
    );
  }, [ready, fade]);

  return (
    <SafeAreaProvider>
      <StatusBar style={colors.scheme === 'dark' ? 'light' : 'dark'} />
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        {fontsReady && sessionChecked ? (
          !user ? (
            <LoginScreen onLoggedIn={loggedIn} />
          ) : !user.username ? (
            <UsernameScreen user={user} onDone={setUser} onLogout={logout} />
          ) : (
            <MainScreen user={user} onUserChange={setUser} onLogout={logout} />
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
  root: { flex: 1 },
});
