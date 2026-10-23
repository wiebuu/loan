import { Alert, Platform } from 'react-native';

/** "Are you sure?" on phones. Alert buttons don't work on web, so the web build just goes ahead. */
export function confirm(title: string, message: string, okLabel: string, destructive = false): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(true);
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: okLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]);
  });
}
