import { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, fonts, radius } from '../theme';

interface Props extends TextInputProps {
  label: string;
  error?: string | null;
  prefix?: string;
  hint?: string;
}

export function TextField({ label, error, prefix, hint, style, onFocus, onBlur, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.box,
          focused && { borderColor: colors.brand, backgroundColor: '#FFFFFF' },
          !!error && { borderColor: colors.danger },
        ]}
      >
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          placeholderTextColor={colors.faint}
          style={[styles.input, style]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 18 },
  label: { fontSize: 13, fontFamily: fonts.bold, color: colors.muted, marginBottom: 8, letterSpacing: 0.2 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: '#FAFBFA',
    paddingHorizontal: 16,
  },
  prefix: { fontSize: 16, fontFamily: fonts.bold, color: colors.ink, marginRight: 8 },
  input: { flex: 1, height: 54, fontSize: 16, fontFamily: fonts.semibold, color: colors.ink },
  error: { color: colors.danger, fontSize: 13, fontFamily: fonts.semibold, marginTop: 6 },
  hint: { color: colors.muted, fontSize: 13, fontFamily: fonts.regular, marginTop: 6 },
});
