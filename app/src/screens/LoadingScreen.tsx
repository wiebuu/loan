import { Text, View } from 'react-native';
import { Logo } from '../components/Logo';
import { fonts, makeStyles, useColors } from '../theme';
import { HeroDecor } from './LoginScreen';

interface Props {
  /** Called once the screen has drawn, so the native splash can hide without a flash. */
  onReady?: () => void;
  /** Fonts may still be loading, so the wordmark and tagline wait for Manrope. */
  fontsLoaded?: boolean;
}

export function LoadingScreen({ onReady, fontsLoaded }: Props) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View style={styles.root} onLayout={onReady}>
      <HeroDecor />
      <Logo height={56} color={colors.heroInk} markOnly={!fontsLoaded} animate />
      <Text style={[styles.tagline, fontsLoaded ? { fontFamily: fonts.semibold } : { opacity: 0 }]}>
        Money you lent, tracked.
      </Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: {
    flex: 1,
    backgroundColor: colors.hero,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    overflow: 'hidden',
  },
  tagline: { color: colors.heroMuted, fontSize: 15, letterSpacing: 0.3 },
}));
