import { Text, View } from 'react-native';
import { Checker } from '../components/Checker';
import { Logo } from '../components/Logo';
import { fonts, makeStyles, useColors } from '../theme';

interface Props {
  /** Called once the screen has drawn, so the native splash can hide without a flash. */
  onReady?: () => void;
  /** Fonts may still be loading, so the tagline only uses Manrope once they are in. */
  fontsLoaded?: boolean;
}

export function LoadingScreen({ onReady, fontsLoaded }: Props) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View style={styles.root} onLayout={onReady}>
      <Checker size={34} />
      <Logo height={68} color={colors.heroInk} animate />
      <Text style={[styles.tagline, fontsLoaded && { fontFamily: fonts.semibold }]}>Money you lent, tracked.</Text>
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
  },
  tagline: { color: colors.heroMuted, fontSize: 15, letterSpacing: 0.3 },
}));
