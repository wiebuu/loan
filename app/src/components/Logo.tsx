import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { fonts, useColors } from '../theme';

/**
 * The Loan logo: two overlapping circles (you and a friend; what's lent and what comes back)
 * next to a plain lowercase "loan" wordmark.
 *
 * The mark is drawn on a 36 × 24 grid: two circles of radius 12, twelve units apart, with
 * the lens where they overlap in its own shade so the two read as separate shapes.
 */
const MARK_RATIO = 36 / 24;
const LENS = 'M18 1.608 A12 12 0 0 1 18 22.392 A12 12 0 0 1 18 1.608 Z';

interface MarkProps {
  /** Height of the mark; it is 1.5 times as wide. */
  size?: number;
  /** The left circle. Defaults to the theme's emerald. */
  left?: string;
  /** The right circle. Defaults to the lime accent. */
  right?: string;
  /** The overlap. Defaults to the theme's lens colour (a mid green in light mode). */
  lens?: string;
}

export function LogoMark({ size = 24, left, right, lens }: MarkProps) {
  const colors = useColors();
  return (
    <Svg width={size * MARK_RATIO} height={size} viewBox="0 0 36 24">
      <Circle cx={12} cy={12} r={12} fill={left ?? colors.brand} />
      <Circle cx={24} cy={12} r={12} fill={right ?? colors.gold} />
      <Path d={LENS} fill={lens ?? colors.logoLens} />
    </Svg>
  );
}

interface Props {
  /** Height of the mark; the wordmark is sized to match. */
  height?: number;
  /** Wordmark colour. Defaults to the theme's text colour. */
  color?: string;
  /** Leave out the wordmark, e.g. before the fonts have loaded. */
  markOnly?: boolean;
  /** Gently slide the two circles apart and back together, on a loop. */
  animate?: boolean;
}

export function Logo({ height = 24, color, markOnly = false, animate = false }: Props) {
  const colors = useColors();
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) return;
    const native = Platform.OS !== 'web';
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.cubic), useNativeDriver: native }),
        Animated.timing(breathe, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.cubic), useNativeDriver: native }),
        Animated.delay(200),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animate, breathe]);

  const scale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: height * 0.36 }} accessibilityRole="image" accessibilityLabel="Loan">
      <Animated.View style={animate ? { transform: [{ scale }] } : undefined}>
        <LogoMark size={height} />
      </Animated.View>
      {markOnly ? null : (
        <Text
          style={{
            color: color ?? colors.ink,
            fontFamily: fonts.heavy,
            fontSize: height * 1.08,
            lineHeight: height * 1.25,
            letterSpacing: -height * 0.05,
            includeFontPadding: false,
          }}
        >
          loan
        </Text>
      )}
    </View>
  );
}
