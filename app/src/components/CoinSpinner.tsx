import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, RefreshControl, RefreshControlProps } from 'react-native';
import { useColors } from '../theme';
import { CoinMark } from './Logo';

interface Props {
  size?: number;
  color?: string;
  /** Flip while true; sit still otherwise. */
  spinning?: boolean;
}

/** The loading and refresh indicator: a rupee coin flipping over and over. */
export function CoinSpinner({ size = 28, color, spinning = true }: Props) {
  const theme = useColors();
  const flip = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!spinning) return;
    const loop = Animated.loop(
      Animated.timing(flip, {
        toValue: 1,
        duration: 650,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: Platform.OS !== 'web',
      }),
    );
    loop.start();
    return () => {
      loop.stop();
      flip.setValue(0);
    };
  }, [spinning, flip]);

  const rotateY = flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View
      style={{ transform: [{ perspective: 400 }, { rotateY }] }}
      accessibilityRole={spinning ? 'progressbar' : undefined}
      accessibilityLabel={spinning ? 'Loading' : undefined}
    >
      <CoinMark size={size} color={color ?? theme.brand} />
    </Animated.View>
  );
}

/**
 * Pull-to-refresh with the platform spinner hidden, so the screen can show a CoinSpinner instead.
 * Use it exactly like RefreshControl.
 */
export function CoinRefreshControl(props: RefreshControlProps) {
  return <RefreshControl {...props} tintColor="transparent" colors={['transparent']} progressBackgroundColor="transparent" />;
}
