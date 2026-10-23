import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as api from '../api';
import { Button } from '../components/Button';
import { Checker } from '../components/Checker';
import { Logo } from '../components/Logo';
import { OtpInput } from '../components/OtpInput';
import { TextField } from '../components/TextField';
import { fonts, makeStyles, radius, useColors } from '../theme';
import { User } from '../types';
import { validateOtp, validatePhone } from '../utils/validation';

const RESEND_SECONDS = 30;

interface Props {
  onLoggedIn: (token: string, user: User) => void;
}

export function LoginScreen({ onLoggedIn }: Props) {
  const styles = useStyles();
  const colors = useColors();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [autoFilled, setAutoFilled] = useState(false);

  // Count down to when "Resend OTP" becomes available again.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  async function sendOtp() {
    const invalid = validatePhone(phone);
    if (invalid) return setError(invalid);
    setError(null);
    setLoading(true);
    try {
      const res = await api.requestOtp(phone);
      setStep('otp');
      setResendIn(RESEND_SECONDS);
      if (res.devOtp) {
        // Demo mode: the server sent the code back, so fill it in and log in by itself.
        setOtp(res.devOtp);
        setAutoFilled(true);
        setTimeout(() => verify(res.devOtp), 900);
      } else {
        setOtp('');
        setAutoFilled(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function verify(code = otp) {
    const invalid = validateOtp(code);
    if (invalid) return setError(invalid);
    setError(null);
    setLoading(true);
    try {
      const { token, user } = await api.verifyOtp(phone, code);
      onLoggedIn(token, user);
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
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.hero}>
        <Checker />
        <Logo height={52} color={colors.heroInk} />
        <Text style={styles.tagline}>Lend to friends without losing track.</Text>
      </SafeAreaView>

      <KeyboardAvoidingView style={styles.sheet} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
          {step === 'phone' ? (
            <>
              <Text style={styles.title}>Log in</Text>
              <Text style={styles.subtitle}>We'll send a 6-digit code to your phone.</Text>
              <TextField
                label="Mobile number"
                prefix="+91"
                placeholder="98765 43210"
                keyboardType="number-pad"
                maxLength={10}
                value={phone}
                onChangeText={(t) => {
                  setPhone(t.replace(/\D/g, ''));
                  setError(null);
                }}
                error={error}
                autoFocus
                onSubmitEditing={sendOtp}
              />
              <Button title="Send OTP" onPress={sendOtp} loading={loading} />
            </>
          ) : (
            <>
              <Text style={styles.title}>Enter code</Text>
              <Text style={styles.subtitle}>
                Sent to <Text style={styles.strong}>+91 {phone}</Text>.{' '}
                <Text style={styles.link} onPress={changeNumber}>
                  Change
                </Text>
              </Text>

              <OtpInput
                value={otp}
                onChange={(v) => {
                  setOtp(v);
                  setAutoFilled(false);
                  setError(null);
                }}
                onComplete={verify}
                error={!!error}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Text style={styles.devHint}>
                {autoFilled
                  ? 'Filled in automatically (demo mode). The code is also in the server log.'
                  : 'Demo: the code is printed in the server log.'}
              </Text>

              <Button title="Verify and continue" onPress={() => verify()} loading={loading} />

              <Pressable onPress={sendOtp} disabled={resendIn > 0 || loading} hitSlop={8} style={styles.resend}>
                <Text style={[styles.link, resendIn > 0 && { color: colors.faint }]}>
                  {resendIn > 0 ? `Resend code in 0:${String(resendIn).padStart(2, '0')}` : 'Resend code'}
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.hero },
  hero: { alignItems: 'center', paddingTop: 48, paddingBottom: 40, gap: 14 },
  tagline: { color: colors.heroMuted, fontSize: 15, fontFamily: fonts.semibold },
  sheet: {
    flex: 1,
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg + 6,
    borderTopRightRadius: radius.lg + 6,
  },
  sheetBody: { padding: 24, paddingTop: 30 },
  title: { fontSize: 26, fontFamily: fonts.heavy, color: colors.ink },
  subtitle: { fontSize: 15, fontFamily: fonts.regular, color: colors.muted, marginTop: 6, marginBottom: 24 },
  strong: { fontFamily: fonts.bold, color: colors.ink },
  link: { color: colors.brand, fontFamily: fonts.bold, fontSize: 15 },
  error: { color: colors.danger, fontSize: 13, fontFamily: fonts.semibold, marginTop: 10 },
  devHint: { color: colors.muted, fontSize: 12, fontFamily: fonts.regular, marginTop: 14, marginBottom: 20 },
  resend: { alignSelf: 'center', marginTop: 18 },
}));
