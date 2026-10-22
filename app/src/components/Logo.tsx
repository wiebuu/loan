import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { colors } from '../theme';

/**
 * The "Loan" wordmark: the o is a rupee coin and the a is an open palm asking for it.
 * Everything is drawn on one 218 x 100 grid; the coin and the palm sit in their
 * own layers so the loading screen can animate them.
 */
const VIEWBOX = '0 0 218 100';
const RATIO = 218 / 100;

interface Props {
  height?: number;
  /** Colour of the L, the palm and the n. */
  color?: string;
  /** Spin the coin and make the palm beckon, on a loop. */
  animate?: boolean;
}

export function Logo({ height = 40, color = colors.ink, animate = false }: Props) {
  const spin = useRef(new Animated.Value(0)).current;
  const beckon = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) return;
    const native = Platform.OS !== 'web';
    const wave = (to: number) =>
      Animated.timing(beckon, { toValue: to, duration: 170, easing: Easing.inOut(Easing.quad), useNativeDriver: native });
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.cubic), useNativeDriver: native }),
        Animated.sequence([wave(1), wave(0), wave(1), wave(0)]),
        Animated.delay(250),
        Animated.timing(spin, { toValue: 0, duration: 0, useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animate, spin, beckon]);

  const rotateY = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const rotate = beckon.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-9deg'] });

  return (
    <View style={{ width: height * RATIO, height }} accessibilityRole="image" accessibilityLabel="Loan">
      <Svg style={StyleSheet.absoluteFill} viewBox={VIEWBOX}>
        <G fill="none" stroke={color} strokeWidth={13} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M16 12 V84 H42" />
          <Path d="M171 44 V84 M171 60 A17 17 0 0 1 205 60 V84" />
        </G>
      </Svg>

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { transformOrigin: '58.7% 84%', transform: [{ rotate }] }]}
      >
        <Svg style={StyleSheet.absoluteFill} viewBox={VIEWBOX}>
          <Palm color={color} />
        </Svg>
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { transformOrigin: '33.9% 62%', transform: [{ perspective: 600 }, { rotateY }] }]}
      >
        <Svg style={StyleSheet.absoluteFill} viewBox={VIEWBOX}>
          <Coin cx={74} cy={62} />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** Just the coin, for small places like the app header. */
export function CoinMark({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 52 52">
      <Coin cx={26} cy={26} />
    </Svg>
  );
}

function Coin({ cx, cy }: { cx: number; cy: number }) {
  return (
    <G transform={`translate(${cx} ${cy}) rotate(-12)`}>
      <Circle r={24} fill={colors.gold} stroke={colors.goldDeep} strokeWidth={4} />
      <Circle r={17} fill="none" stroke="#D99A1C" strokeWidth={2} />
      {/* ₹ */}
      <Path
        d="M-8 -11 H8 M-8 -4.5 H8 M-6 -11 H-3 A6.5 6.5 0 0 1 -3 2 H-6 L5 13"
        fill="none"
        stroke={colors.goldInk}
        strokeWidth={3.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </G>
  );
}

/** The a: a cupped palm with the thumb as its stem and three fingers curling over the top. */
function Palm({ color }: { color: string }) {
  return (
    <G fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M144.91 70.16 A18 18 0 1 1 112.74 54.46" strokeWidth={13} />
      <Path d="M117.67 59.18 A11.4 11.4 0 0 1 133.35 53.93" strokeWidth={5} />
      <Path d="M111.69 56.39 A18 18 0 0 1 135.89 47.82" strokeWidth={5} />
      <Path d="M105.70 53.60 A24.6 24.6 0 0 1 133.53 40.03" strokeWidth={5} />
      <Path d="M145.5 84 V58 Q145.5 48 148 44" strokeWidth={13} />
    </G>
  );
}
