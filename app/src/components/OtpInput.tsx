import { ComponentRef, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts, radius } from '../theme';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  error?: boolean;
  length?: number;
}

/**
 * Six boxes on top of one hidden TextInput. Typing goes into the real input,
 * so paste and the phone's SMS auto-fill still work.
 */
export function OtpInput({ value, onChange, onComplete, error, length = 6 }: Props) {
  const ref = useRef<ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(true);

  return (
    <Pressable onPress={() => ref.current?.focus()} style={styles.row}>
      {Array.from({ length }, (_, i) => {
        const active = focused && i === Math.min(value.length, length - 1);
        return (
          <View
            key={i}
            style={[
              styles.box,
              !!value[i] && styles.filled,
              active && styles.active,
              error && { borderColor: colors.danger },
            ]}
          >
            <Text style={styles.digit}>{value[i] ?? ''}</Text>
          </View>
        );
      })}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(t) => {
          const digits = t.replace(/\D/g, '').slice(0, length);
          onChange(digits);
          if (digits.length === length) onComplete?.(digits);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        autoFocus
        caretHidden
        style={styles.hidden}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  box: {
    flex: 1,
    aspectRatio: 0.85,
    maxWidth: 56,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#FAFBFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: { backgroundColor: '#FFFFFF', borderColor: '#C5D3CB' },
  active: { borderColor: colors.brand, backgroundColor: '#FFFFFF' },
  digit: { fontSize: 22, fontFamily: fonts.heavy, color: colors.ink },
  hidden: { position: 'absolute', opacity: 0, width: '100%', height: '100%' },
});
