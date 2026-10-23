import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { fonts, Palette, radius, useColors } from '../theme';
import { CoinSpinner } from './Refresh';

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

const looks = (colors: Palette): Record<Variant, { bg: string; fg: string }> => ({
  primary: { bg: colors.brand, fg: colors.onBrand },
  secondary: { bg: colors.brandSoft, fg: colors.brand },
  gold: { bg: colors.gold, fg: colors.onGold },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
});

export function Button({ title, onPress, variant = 'primary', loading, disabled, icon, style }: Props) {
  const inactive = disabled || loading;
  const look = looks(useColors())[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: look.bg },
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 },
        disabled && !loading && { opacity: 0.55 },
        style,
      ]}
    >
      {loading ? (
        <CoinSpinner size={24} />
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
