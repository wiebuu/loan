import { ReactNode, useEffect, useRef } from 'react';
import { Animated, Easing, Platform, RefreshControl, RefreshControlProps, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useColors } from '../theme';

const native = Platform.OS !== 'web';

/** How far (in points) you pull before the coin is fully shown. */
const PULL = 80;
/** How far the page moves down to show the coin when a refresh starts without a pull. */
const PUSH = 62;
const COIN = 30;

/** What started a refresh: pulling the list down, or tapping the tab you're already on. */
export type RefreshMode = 'pull' | 'tap';

/**
 * Pull-to-refresh with the platform spinner hidden: the coin behind the list is the one and
 * only "loading" sign. Use it exactly like RefreshControl.
 */
export function ThemedRefreshControl(props: RefreshControlProps) {
  return <RefreshControl tintColor="transparent" colors={['transparent']} progressBackgroundColor="transparent" {...props} />;
}

/** The ₹ coin: lime with a darker rim, a fine inner ring and an emerald ₹. */
export function Coin({ size = COIN }: { size?: number }) {
  const colors = useColors();
  return (
    <Svg width={size} height={size} viewBox="-260 -260 520 520">
      <Circle r={250} fill={colors.coinRim} />
      <Circle r={212} fill={colors.coinFace} />
      <Circle r={168} fill="none" stroke={colors.coinRim} strokeWidth={14} />
      <Path
        d="M-74 -101 H74 M-74 -41 H74 M-55 -101 H-28 A60 60 0 0 1 -28 18 H-55 L46 120"
        fill="none"
        stroke={colors.coinInk}
        strokeWidth={38}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/*
 * A flip is drawn as the coin's width following |cos| of the turn (sampled finely so the motion
 * is smooth). It goes edge-on twice per turn and the ₹ is never shown mirrored.
 */
const TURNS = 2;
const STEPS = 24; // samples per turn
const flipInput: number[] = [];
const widthOutput: number[] = [];
for (let i = 0; i <= TURNS * STEPS; i++) {
  const t = i / STEPS;
  flipInput.push(t);
  widthOutput.push(Math.max(Math.abs(Math.cos(2 * Math.PI * t)), 0.03));
}

/** Tracks how far a list is scrolled (negative while it is pulled down past the top). */
export function useScrollY() {
  const scrollY = useRef(new Animated.Value(0)).current;
  const onScroll = useRef(Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: native })).current;
  return { scrollY, onScroll };
}

interface Props {
  refreshing: boolean;
  mode: RefreshMode;
  /** From useScrollY(), wired to the list's onScroll. */
  scrollY: Animated.Value;
  /** The list. Its background must be transparent so the coin can show from behind it. */
  children: ReactNode;
  /** Colour behind the coin (what shows when the list is pulled down). Defaults to the page. */
  backdrop?: string;
}

/**
 * The coin sits just under the header, *behind* the list. Pulling the list down uncovers it:
 * it fades and grows in, and turns over as you pull further. Once the refresh starts it keeps
 * flipping until the data is in, then the list slides back over it. Scrolling up hides it
 * behind the content again.
 */
export function CoinRefresh({ refreshing, mode, scrollY, children, backdrop }: Props) {
  const shown = useRef(new Animated.Value(0)).current;
  const push = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(shown, { toValue: refreshing ? 1 : 0, duration: refreshing ? 160 : 260, useNativeDriver: native }).start();
    Animated.spring(push, {
      toValue: refreshing && mode === 'tap' ? 1 : 0,
      damping: 22,
      stiffness: 220,
      mass: 1,
      useNativeDriver: native,
    }).start();
    if (!refreshing) return;
    // Even speed, so the flips look steady.
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: native }),
    );
    loop.start();
    return () => {
      // Finish the turn forwards (never spin back), then start the next one from the front.
      loop.stop();
      Animated.timing(spin, { toValue: 1, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: native }).start(() =>
        spin.setValue(0),
      );
    };
  }, [refreshing, mode, shown, push, spin]);

  // 0 at rest, 1 once pulled far enough.
  const pulled = scrollY.interpolate({ inputRange: [-PULL, -6], outputRange: [1, 0], extrapolate: 'clamp' });
  // While refreshing, scrolling up tucks the coin away behind the content.
  const notScrolledUp = scrollY.interpolate({ inputRange: [0, 40], outputRange: [1, 0], extrapolate: 'clamp' });
  const visible = Animated.add(pulled, Animated.add(Animated.multiply(shown, notScrolledUp), push)).interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const scale = visible.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  // Rises into place as the list comes down.
  const drop = Animated.add(
    scrollY.interpolate({ inputRange: [-PULL, 0], outputRange: [1, 0], extrapolate: 'clamp' }),
    push,
  ).interpolate({ inputRange: [0, 1], outputRange: [-22, 0], extrapolate: 'clamp' });
  // Turns with the pull, then keeps flipping while it loads.
  const pullTurn = scrollY.interpolate({ inputRange: [-PULL * 1.6, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  const turn = Animated.add(pullTurn, spin);
  const scaleX = turn.interpolate({ inputRange: flipInput, outputRange: widthOutput, extrapolate: 'clamp' });
  const listY = push.interpolate({ inputRange: [0, 1], outputRange: [0, PUSH] });

  return (
    <View style={[styles.root, backdrop ? { backgroundColor: backdrop } : null]}>
      <Animated.View
        pointerEvents="none"
        style={[styles.coin, { opacity: visible, transform: [{ translateY: drop }, { scale }] }]}
        accessibilityRole="progressbar"
        accessibilityLabel={refreshing ? 'Updating' : undefined}
        accessibilityElementsHidden={!refreshing}
      >
        <Animated.View style={{ transform: [{ scaleX }] }}>
          <Coin />
        </Animated.View>
      </Animated.View>
      <Animated.View style={[styles.root, { transform: [{ translateY: listY }] }]}>{children}</Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  coin: { position: 'absolute', top: 16, left: 0, right: 0, alignItems: 'center' },
});

/**
 * The app's loading sign wherever something is loading: the ₹ coin, flipping steadily.
 * Use it instead of the platform spinner.
 */
export function CoinSpinner({ size = 28, spinning = true }: { size?: number; spinning?: boolean }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!spinning) return;
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: native }),
    );
    loop.start();
    return () => {
      loop.stop();
      spin.setValue(0);
    };
  }, [spinning, spin]);
  const scaleX = spin.interpolate({ inputRange: flipInput.slice(0, STEPS + 1), outputRange: widthOutput.slice(0, STEPS + 1) });
  return (
    <Animated.View
      style={{ transform: [{ scaleX }] }}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
    >
      <Coin size={size} />
    </Animated.View>
  );
}
