import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Small values are kept in the phone's secure storage (Keychain / Keystore).
// SecureStore doesn't exist on web, so the browser preview uses localStorage.
const TOKEN_KEY = 'loan.token';

export async function loadSetting(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null;
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

/** Saves the value, or forgets it when it's null. */
export async function saveSetting(key: string, value: string | null): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (value) globalThis.localStorage?.setItem(key, value);
      else globalThis.localStorage?.removeItem(key);
      return;
    }
    if (value) await SecureStore.setItemAsync(key, value);
    else await SecureStore.deleteItemAsync(key);
  } catch {
    // Not being remembered is fine; the user just logs in again, or gets the default theme.
  }
}

export const loadToken = () => loadSetting(TOKEN_KEY);
export const saveToken = (token: string | null) => saveSetting(TOKEN_KEY, token);
