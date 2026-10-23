import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, makeStyles, radius, useColors } from '../theme';
import { AppNotification } from '../types';
import { BellIcon } from './Icons';
import { Portal } from './Portal';

const native = Platform.OS !== 'web';
const SHOW_MS = 4500;

interface Props {
  /** The notification to show; a new one replaces the current banner. */
  notification: AppNotification | null;
  onPress: (n: AppNotification) => void;
  onHide: () => void;
}

/**
 * A banner that drops in from the top when something new happens (a request, a reminder,
 * a payment), like a phone notification but inside the app. Tap it to open the loan, swipe
 * it up to dismiss, or let it slide away after a few seconds.
 */
export function LiveBanner({ notification, onPress, onHide }: Props) {
  const styles = useStyles();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const y = useRef(new Animated.Value(-200)).current;
  const [shown, setShown] = useState<AppNotification | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onHideRef = useRef(onHide);
  onHideRef.current = onHide;

  const hide = useRef((velocity = 0) => {
    if (timer.current) clearTimeout(timer.current);
    Animated.timing(y, { toValue: -200, duration: velocity > 0.5 ? 160 : 240, easing: Easing.in(Easing.cubic), useNativeDriver: native }).start(() => {
      setShown(null);
      onHideRef.current();
    });
  }).current;

  useEffect(() => {
    if (!notification) return;
    setShown(notification);
    y.setValue(-200);
    Animated.spring(y, { toValue: 0, damping: 18, stiffness: 220, mass: 0.9, useNativeDriver: native }).start();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => hide(), SHOW_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [notification, y, hide]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6,
      onPanResponderGrant: () => timer.current && clearTimeout(timer.current),
      onPanResponderMove: (_, g) => y.setValue(g.dy < 0 ? g.dy : g.dy / 5),
      onPanResponderRelease: (_, g) => {
        if (g.dy < -24 || g.vy < -0.5) hide(-g.vy);
        else {
          Animated.spring(y, { toValue: 0, damping: 18, stiffness: 260, useNativeDriver: native }).start();
          timer.current = setTimeout(() => hide(), SHOW_MS);
        }
      },
    }),
  ).current;

  if (!shown) return null;
  return (
    <Portal>
      <Animated.View
        {...pan.panHandlers}
        style={[styles.wrap, { top: insets.top + 6, transform: [{ translateY: y }] }]}
        accessibilityLiveRegion="assertive"
      >
        <Pressable
          onPress={() => {
            hide();
            onPress(shown);
          }}
          style={({ pressed }) => [styles.banner, pressed && { opacity: 0.9 }]}
          accessibilityRole="button"
          accessibilityLabel={`New notification. ${shown.message}`}
        >
          <View style={styles.icon}>
            <BellIcon size={17} color={colors.onBrand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.app}>Loan · now</Text>
            <Text style={styles.message} numberOfLines={2}>
              {shown.message}
            </Text>
          </View>
        </Pressable>
        <View style={styles.grabber} />
      </Animated.View>
    </Portal>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: { position: 'absolute', left: 12, right: 12, zIndex: 100 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: colors.scheme === 'dark' ? 1 : 0,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: colors.scheme === 'dark' ? 0.5 : 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  icon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  app: { fontSize: 12, fontFamily: fonts.bold, color: colors.muted },
  message: { fontSize: 14.5, fontFamily: fonts.bold, color: colors.ink, marginTop: 1, lineHeight: 19 },
  grabber: { alignSelf: 'center', width: 34, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, marginTop: -10, opacity: 0 },
}));
