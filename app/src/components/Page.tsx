import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts, makeStyles, useColors } from '../theme';
import { BackIcon } from './Icons';

const native = Platform.OS !== 'web';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  /**
   * Called first by the back arrow, the edge swipe and Android's back button. Return true if
   * it handled going back itself (e.g. leaving a sub-page), so the page stays open.
   */
  onBack?: () => boolean;
  /** Something on the right of the title bar, e.g. "Mark all as read". */
  right?: ReactNode;
  children: ReactNode;
}

/**
 * A full page that slides in from the right over the app, like a pushed screen in a native
 * app. Go back with the arrow, a swipe to the right, or Android's back button.
 */
export function Page({ visible, onClose, title, onBack, right, children }: Props) {
  const styles = useStyles();
  const colors = useColors();
  const { width } = useWindowDimensions();
  const x = useRef(new Animated.Value(width)).current;
  const [mounted, setMounted] = useState(visible);
  const closing = useRef(false);

  useEffect(() => {
    if (visible) {
      closing.current = false;
      setMounted(true);
      x.setValue(width);
      Animated.spring(x, { toValue: 0, damping: 30, stiffness: 300, mass: 0.9, useNativeDriver: native }).start();
    } else if (mounted) {
      if (closing.current) setMounted(false);
      else
        Animated.timing(x, { toValue: width, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start(() =>
          setMounted(false),
        );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const close = useCallback(
    (velocity = 0) => {
      if (closing.current) return;
      closing.current = true;
      Animated.timing(x, {
        toValue: width,
        duration: Math.max(140, 280 - Math.min(velocity, 3) * 45),
        easing: Easing.out(Easing.cubic),
        useNativeDriver: native,
      }).start(() => onClose());
    },
    [x, width, onClose],
  );
  const latest = useRef({ close, onBack });
  latest.current = { close, onBack };
  const back = useCallback(() => {
    if (latest.current.onBack?.()) return;
    latest.current.close();
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      back();
      return true;
    });
    return () => sub.remove();
  }, [mounted, back]);

  // Swipe right anywhere on the page to go back: it follows your finger, then slides all the
  // way off to the right (or springs back if you didn't go far enough).
  const swipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, g) => g.dx > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => x.setValue(Math.max(0, g.dx)),
      onPanResponderRelease: (_, g) => {
        if (g.dx > width * 0.33 || (g.vx > 0.5 && g.dx > 30)) {
          if (latest.current.onBack?.()) {
            Animated.spring(x, { toValue: 0, damping: 30, stiffness: 300, useNativeDriver: native }).start();
          } else latest.current.close(g.vx);
        } else {
          Animated.spring(x, { toValue: 0, velocity: g.vx, damping: 30, stiffness: 320, useNativeDriver: native }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(x, { toValue: 0, damping: 30, stiffness: 320, useNativeDriver: native }).start();
      },
    }),
  ).current;

  if (!mounted) return null;
  const shade = x.interpolate({ inputRange: [0, width], outputRange: [0.25, 0], extrapolate: 'clamp' });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: shade }]} />
      <Animated.View {...swipe.panHandlers} style={[StyleSheet.absoluteFill, styles.page, { transform: [{ translateX: x }] }]}>
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.header}>
              <Pressable onPress={back} hitSlop={12} style={styles.side} accessibilityRole="button" accessibilityLabel="Back">
                <BackIcon size={26} color={colors.ink} />
              </Pressable>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              <View style={[styles.side, { alignItems: 'flex-end' }]}>{right}</View>
            </View>
            {children}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  page: {
    backgroundColor: colors.bg,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: -4, height: 0 },
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    minHeight: 58,
  },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontFamily: fonts.heavy, color: colors.ink },
  side: { width: 92, height: 40, justifyContent: 'center' },
}));
