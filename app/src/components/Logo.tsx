import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';
import { colors } from '../theme';

/**
 * The "Loan" wordmark. L, o and n are Outfit SemiBold outlines; the a is drawn to match
 * them, with an open hand for the lower half of its bowl: the palm sweeps out of the bowl
 * and the fingers reach up and to the left. The a is gold, the other letters take `color`.
 *
 * Units are Outfit's (1000 per em, baseline at y = 0). The fingers sit in their own layer
 * so the loading screen can make them beckon.
 */
const VIEWBOX = { x: 62, y: -713, w: 2347, h: 733 };
const RATIO = VIEWBOX.w / VIEWBOX.h;
const VIEWBOX_STR = `${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.w} ${VIEWBOX.h}`;

/** Where the a starts, and the point in its palm the fingers pivot on. */
const A_X = 1257;
const PIVOT = { x: A_X + 150, y: -115 };
const PIVOT_ORIGIN = `${(((PIVOT.x - VIEWBOX.x) / VIEWBOX.w) * 100).toFixed(1)}% ${(((PIVOT.y - VIEWBOX.y) / VIEWBOX.h) * 100).toFixed(1)}%`;

const LETTERS =
  'M208 0L72 0L72-703L208-703L208 0M530 0L172 0L172-121L530-121M869 10Q796 10 737.5-23.5Q679-57 644.5-114.5' +
  'Q610-172 610-243Q610-314 644-370.5Q678-427 737-460.5Q796-494 868-494Q942-494 1000.5-460.5Q1059-427 1093-370.5' +
  'Q1127-314 1127-243Q1127-172 1093-114.5Q1059-57 1000.5-23.5Q942 10 869 10M868-112Q905-112 933.5-128.5' +
  'Q962-145 977.5-174.5Q993-204 993-242Q993-280 977-309Q961-338 933-354.5Q905-371 868-371Q832-371 804-354.5' +
  'Q776-338 760-309Q744-280 744-242Q744-204 760-174.5Q776-145 804-128.5Q832-112 868-112M2399 0L2268 0L2268-277' +
  'Q2268-320 2241-347Q2214-374 2171-374Q2143-374 2121-362Q2099-350 2086.5-328Q2074-306 2074-277L2023-303' +
  'Q2023-360 2047.5-402.5Q2072-445 2115.5-469Q2159-493 2214-493Q2267-493 2309-466.5Q2351-440 2375-397.5' +
  'Q2399-355 2399-306L2399 0M2074 0L1943 0L1943-483L2074-483';
const BOWL = 'M34.6 -289.7 A250 250 0 0 1 530 -242 V0 H405 V-242 A125 125 0 0 0 157.3 -265.9 Z';
const PALM =
  'M530 -242 A250 250 0 0 1 215.3 -0.5 C70.4 -39.3 -70 -125 -95 -178 A20 20 0 0 1 -63 -202 C-28 -160 60 -105 140 -80 Q128 -150 171.7 -179.5 A125 125 0 0 0 405 -242 Z';
const FINGERS = ['M80 -232 Q118 -192 164 -150', 'M15 -248 Q80 -178 150 -118', 'M-38 -224 Q40 -142 140 -90'];

const FINGER_WIDTH = 30;

/** Champagne gold on dark backgrounds, a deeper gold on light ones so it keeps its contrast. */
const GOLD = {
  dark: ['#FBEBC4', '#E8C27A', '#C1913F'],
  light: ['#EDBE55', '#D69A22', '#A86F08'],
};

interface Props {
  height?: number;
  /** Colour of the L, the o and the n. */
  color?: string;
  /** Set when the logo sits on a dark background. */
  onDark?: boolean;
  /** Make the fingers beckon, on a loop. */
  animate?: boolean;
}

export function Logo({ height = 26, color = colors.ink, onDark = false, animate = false }: Props) {
  const beckon = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) return;
    const native = Platform.OS !== 'web';
    const wave = (to: number) =>
      Animated.timing(beckon, { toValue: to, duration: 190, easing: Easing.inOut(Easing.quad), useNativeDriver: native });
    const loop = Animated.loop(Animated.sequence([Animated.delay(450), wave(1), wave(0), wave(1), wave(0)]));
    loop.start();
    return () => loop.stop();
  }, [animate, beckon]);

  const rotate = beckon.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '8deg'] });
  const tone = onDark ? 'dark' : 'light';
  const gold = `url(#loanGold-${tone})`;

  return (
    <View style={{ width: height * RATIO, height }} accessibilityRole="image" accessibilityLabel="Loan">
      <Svg style={StyleSheet.absoluteFill} viewBox={VIEWBOX_STR}>
        <Gold tone={tone} />
        <Path d={LETTERS} fill={color} />
        <G transform={`translate(${A_X} 0)`}>
          <Path d={BOWL} fill={gold} />
          <Path d={PALM} fill={gold} />
        </G>
      </Svg>

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { transformOrigin: PIVOT_ORIGIN, transform: [{ rotate }] }]}
      >
        <Svg style={StyleSheet.absoluteFill} viewBox={VIEWBOX_STR}>
          <Gold tone={tone} />
          <G transform={`translate(${A_X} 0)`} fill="none" stroke={gold} strokeWidth={FINGER_WIDTH} strokeLinecap="round">
            {FINGERS.map((d) => (
              <Path key={d} d={d} />
            ))}
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
}

/** The gold gradient. Its units are the a's own (inside the translate), so every layer lines up. */
function Gold({ tone }: { tone: keyof typeof GOLD }) {
  const [from, mid, to] = GOLD[tone];
  return (
    <Defs>
      <LinearGradient id={`loanGold-${tone}`} gradientUnits="userSpaceOnUse" x1={-60} y1={-480} x2={520} y2={20}>
        <Stop offset="0" stopColor={from} />
        <Stop offset="0.5" stopColor={mid} />
        <Stop offset="1" stopColor={to} />
      </LinearGradient>
    </Defs>
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
