import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { useColors } from '../theme';

/**
 * The "Loan" wordmark, all in one colour. L and n are Outfit SemiBold outlines; the o is a
 * rupee coin; the a ends in an open hand: the palm sweeps out of the bowl and the fingers
 * reach up and to the left.
 *
 * Units are Outfit's (1000 per em, baseline at y = 0). The coin and the fingers sit in their
 * own layers so the loading screen can spin the coin and make the fingers beckon.
 */
const VIEWBOX = { x: 62, y: -713, w: 2347, h: 733 };
const RATIO = VIEWBOX.w / VIEWBOX.h;
const VIEWBOX_STR = `${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.w} ${VIEWBOX.h}`;
const origin = (x: number, y: number) =>
  `${(((x - VIEWBOX.x) / VIEWBOX.w) * 100).toFixed(1)}% ${(((y - VIEWBOX.y) / VIEWBOX.h) * 100).toFixed(1)}%`;

const COIN = { x: 868.5, y: -242 };
/** Where the a starts, and the point in its palm the fingers pivot on. */
const A_X = 1257;
const PIVOT = { x: A_X + 150, y: -115 };

const L_AND_N =
  'M208 0L72 0L72-703L208-703L208 0M530 0L172 0L172-121L530-121M2399 0L2268 0L2268-277Q2268-320 2241-347' +
  'Q2214-374 2171-374Q2143-374 2121-362Q2099-350 2086.5-328Q2074-306 2074-277L2023-303Q2023-360 2047.5-402.5' +
  'Q2072-445 2115.5-469Q2159-493 2214-493Q2267-493 2309-466.5Q2351-440 2375-397.5Q2399-355 2399-306L2399 0M2074 0' +
  'L1943 0L1943-483L2074-483';
const BOWL = 'M34.6 -289.7 A250 250 0 0 1 530 -242 V0 H405 V-242 A125 125 0 0 0 157.3 -265.9 Z';
const PALM =
  'M530 -242 A250 250 0 0 1 215.3 -0.5 C70.4 -39.3 -70 -125 -95 -178 A20 20 0 0 1 -63 -202 C-28 -160 60 -105 140 -80 Q128 -150 171.7 -179.5 A125 125 0 0 0 405 -242 Z';
const FINGERS = ['M80 -232 Q118 -192 164 -150', 'M15 -248 Q80 -178 150 -118', 'M-38 -224 Q40 -142 140 -90'];
const FINGER_WIDTH = 30;

interface Props {
  height?: number;
  /** Defaults to the theme's text colour. */
  color?: string;
  /** Spin the coin and make the fingers beckon, on a loop. */
  animate?: boolean;
}

export function Logo({ height = 26, color, animate = false }: Props) {
  const theme = useColors();
  const ink = color ?? theme.ink;
  const spin = useRef(new Animated.Value(0)).current;
  const beckon = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) return;
    const native = Platform.OS !== 'web';
    const wave = (to: number) =>
      Animated.timing(beckon, { toValue: to, duration: 190, easing: Easing.inOut(Easing.quad), useNativeDriver: native });
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
  const rotate = beckon.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '8deg'] });

  return (
    <View style={{ width: height * RATIO, height }} accessibilityRole="image" accessibilityLabel="Loan">
      <Svg style={StyleSheet.absoluteFill} viewBox={VIEWBOX_STR}>
        <Path d={L_AND_N} fill={ink} />
        <G transform={`translate(${A_X} 0)`} fill={ink}>
          <Path d={BOWL} />
          <Path d={PALM} />
        </G>
      </Svg>

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { transformOrigin: origin(PIVOT.x, PIVOT.y), transform: [{ rotate }] }]}
      >
        <Svg style={StyleSheet.absoluteFill} viewBox={VIEWBOX_STR}>
          <G transform={`translate(${A_X} 0)`} fill="none" stroke={ink} strokeWidth={FINGER_WIDTH} strokeLinecap="round">
            {FINGERS.map((d) => (
              <Path key={d} d={d} />
            ))}
          </G>
        </Svg>
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { transformOrigin: origin(COIN.x, COIN.y), transform: [{ perspective: 600 }, { rotateY }] },
        ]}
      >
        <Svg style={StyleSheet.absoluteFill} viewBox={VIEWBOX_STR}>
          <G transform={`translate(${COIN.x} ${COIN.y})`}>
            <Coin color={ink} />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
}

/** Just the coin, e.g. on the summary card. */
export function CoinMark({ size = 28, color }: { size?: number; color?: string }) {
  const theme = useColors();
  const ink = color ?? theme.ink;
  return (
    <Svg width={size} height={size} viewBox="-260 -260 520 520">
      <Coin color={ink} />
    </Svg>
  );
}

/** A rupee coin the size of the o (radius 258), centred on 0,0: a rim, a fine inner ring and the ₹. */
function Coin({ color }: { color: string }) {
  return (
    <G fill="none" stroke={color}>
      <Circle r={225} strokeWidth={66} />
      <Circle r={163} strokeWidth={14} />
      <Path
        d="M-74 -101 H74 M-74 -41 H74 M-55 -101 H-28 A60 60 0 0 1 -28 18 H-55 L46 120"
        strokeWidth={34}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </G>
  );
}
