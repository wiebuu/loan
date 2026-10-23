import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// The login token is kept in the phone's secure storage (Keychain / Keystore).
// SecureStore doesn't exist on web, so the browser preview uses localStorage.
const KEY = 'loan.token';

export async function loadToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(KEY) ?? null;
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function saveToken(token: string | null): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (token) globalThis.localStorage?.setItem(KEY, token);
      else globalThis.localStorage?.removeItem(KEY);
      return;
    }
    if (token) await SecureStore.setItemAsync(KEY, token);
    else await SecureStore.deleteItemAsync(KEY);
  } catch {
    // Not being remembered is fine; the user just logs in again next time.
  }
}
