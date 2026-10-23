import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as api from '../api';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import { TextField } from '../components/TextField';
import { colors, fonts, radius } from '../theme';
import { User } from '../types';
import { validateUsername } from '../utils/validation';

interface Props {
  user: User;
  onDone: (user: User) => void;
  onLogout: () => void;
}

/** Shown once, right after the first login: pick the name friends will find you by. */
export function UsernameScreen({ user, onDone, onLogout }: Props) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    const invalid = validateUsername(username);
    if (invalid) return setError(invalid);
    setSaving(true);
    setError(null);
    try {
      onDone(await api.setUsername(username));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your username');
      setSaving(false);
    }
  }

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.hero}>
        <Logo height={40} color="#FFFFFF" onDark />
      </SafeAreaView>
      <KeyboardAvoidingView style={styles.sheet} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.body}>
          <Text style={styles.title}>Pick a username</Text>
          <Text style={styles.subtitle}>
            Friends use it, or your number (+91 {user.phone}), to add loans with you.
          </Text>
          <TextField
            label="Username"
            prefix="@"
            placeholder="rahul_k"
            value={username}
            onChangeText={(t) => {
              setUsername(t.replace(/\s/g, '').toLowerCase());
              setError(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            maxLength={20}
            error={error}
            hint="3-20 letters, numbers or _, starting with a letter"
            onSubmitEditing={save}
          />
          <Button title="Continue" onPress={save} loading={saving} />
          <Pressable onPress={onLogout} hitSlop={8} style={styles.back}>
            <Text style={styles.link}>Use a different number</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.brandDark },
  hero: { alignItems: 'center', paddingTop: 36, paddingBottom: 32 },
  sheet: { flex: 1, backgroundColor: colors.card, borderTopLeftRadius: radius.lg + 6, borderTopRightRadius: radius.lg + 6 },
  body: { padding: 24, paddingTop: 30 },
  title: { fontSize: 26, fontFamily: fonts.heavy, color: colors.ink },
  subtitle: { fontSize: 15, fontFamily: fonts.regular, color: colors.muted, marginTop: 6, marginBottom: 24, lineHeight: 21 },
  back: { alignSelf: 'center', marginTop: 18 },
  link: { color: colors.brand, fontFamily: fonts.bold, fontSize: 15 },
});
