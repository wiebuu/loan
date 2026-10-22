import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, radius } from '../theme';

interface Props extends TextInputProps {
  label: string;
  error?: string | null;
  prefix?: string;
}

export function TextField({ label, error, prefix, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.box, !!error && { borderColor: colors.danger }]}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          placeholderTextColor="#9CA3AF"
          style={[styles.input, style]}
          {...rest}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: colors.ink, marginBottom: 6 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
  },
  prefix: { fontSize: 16, color: colors.muted, marginRight: 6 },
  input: { flex: 1, height: 50, fontSize: 16, color: colors.ink },
  error: { color: colors.danger, fontSize: 13, marginTop: 6 },
});
