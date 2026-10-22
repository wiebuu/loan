import { StyleSheet, Text, View } from 'react-native';
import { Logo } from '../components/Logo';
import { colors, fonts } from '../theme';

interface Props {
  /** Called once the screen has drawn, so the native splash can hide without a flash. */
  onReady?: () => void;
  /** Fonts may still be loading, so the tagline only uses Manrope once they are in. */
  fontsLoaded?: boolean;
}

export function LoadingScreen({ onReady, fontsLoaded }: Props) {
  return (
    <View style={styles.root} onLayout={onReady}>
      <Logo height={84} color="#FFFFFF" animate />
      <Text style={[styles.tagline, fontsLoaded && { fontFamily: fonts.semibold }]}>
        Money you lent, tracked.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.brandDark,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
  },
  tagline: { color: '#9FB8AC', fontSize: 15, letterSpacing: 0.3 },
});
