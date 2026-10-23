import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, fonts, radius } from '../theme';

type Variant = 'primary' | 'secondary' | 'gold' | 'danger';

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
}

const looks: Record<Variant, { bg: string; fg: string }> = {
  primary: { bg: colors.brand, fg: '#FFFFFF' },
  secondary: { bg: colors.brandSoft, fg: colors.brand },
  gold: { bg: colors.gold, fg: colors.ink },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
};

export function Button({ title, onPress, variant = 'primary', loading, disabled, icon, style }: Props) {
  const inactive = disabled || loading;
  const look = looks[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: look.bg },
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 },
        inactive && { opacity: 0.55 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={look.fg} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text style={[styles.text, { color: look.fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 54,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { fontSize: 16, fontFamily: fonts.bold },
});
