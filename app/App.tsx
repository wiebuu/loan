import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeScreen } from './src/screens/HomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { Session } from './src/types';

export default function App() {
  // Logged out -> Login screen; logged in -> Home. No navigation library needed for two screens.
  const [session, setSession] = useState<Session | null>(null);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {session ? (
        <HomeScreen session={session} onLogout={() => setSession(null)} />
      ) : (
        <LoginScreen onLoggedIn={setSession} />
      )}
    </SafeAreaProvider>
  );
}
