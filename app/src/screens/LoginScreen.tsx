import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as api from '../api';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { colors } from '../theme';
import { Session } from '../types';
import { validateOtp, validatePhone } from '../utils/validation';

interface Props {
  onLoggedIn: (session: Session) => void;
}

export function LoginScreen({ onLoggedIn }: Props) {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendOtp() {
    const invalid = validatePhone(phone);
    if (invalid) return setError(invalid);
    setError(null);
    setLoading(true);
    try {
      await api.requestOtp(phone);
      setStep('otp');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    const invalid = validateOtp(otp);
    if (invalid) return setError(invalid);
    setError(null);
    setLoading(true);
    try {
      onLoggedIn(await api.verifyOtp(phone, otp));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not verify OTP');
      setLoading(false);
    }
  }

  function changeNumber() {
    setStep('phone');
    setOtp('');
    setError(null);
  }

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView style={styles.inner} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>₹</Text>
          </View>
          <Text style={styles.title}>Loan</Text>
          <Text style={styles.subtitle}>Keep track of money you've lent to friends.</Text>
        </View>

        {step === 'phone' ? (
          <>
            <TextField
              label="Mobile number"
              prefix="+91"
              placeholder="98765 43210"
              keyboardType="number-pad"
              maxLength={10}
              value={phone}
              onChangeText={(t) => setPhone(t.replace(/\D/g, ''))}
              error={error}
              autoFocus
              onSubmitEditing={sendOtp}
            />
            <Button title="Send OTP" onPress={sendOtp} loading={loading} />
          </>
        ) : (
          <>
            <Text style={styles.sentTo}>
              Enter the 6-digit code sent to <Text style={styles.bold}>+91 {phone}</Text>
            </Text>
            <TextField
              label="OTP"
              placeholder="••••••"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={(t) => setOtp(t.replace(/\D/g, ''))}
              error={error}
              style={styles.otpInput}
              autoFocus
              onSubmitEditing={verify}
            />
            <Text style={styles.devHint}>Demo: the OTP is printed in the server log.</Text>
            <Button title="Verify & continue" onPress={verify} loading={loading} />
            <View style={styles.links}>
              <Pressable onPress={changeNumber} hitSlop={8}>
                <Text style={styles.link}>Change number</Text>
              </Pressable>
              <Pressable onPress={sendOtp} hitSlop={8} disabled={loading}>
                <Text style={styles.link}>Resend OTP</Text>
              </Pressable>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  brand: { alignItems: 'center', marginBottom: 40 },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoText: { color: '#fff', fontSize: 32, fontWeight: '700' },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink },
  subtitle: { fontSize: 15, color: colors.muted, marginTop: 6, textAlign: 'center' },
  sentTo: { color: colors.muted, fontSize: 15, marginBottom: 16 },
  bold: { color: colors.ink, fontWeight: '700' },
  otpInput: { letterSpacing: 8, fontSize: 20 },
  devHint: { color: colors.muted, fontSize: 12, marginBottom: 16, marginTop: -6 },
  links: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  link: { color: colors.primary, fontWeight: '600', fontSize: 15 },
});
