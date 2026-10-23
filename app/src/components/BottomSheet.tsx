import { createContext, ReactNode, Ref, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  FlatListProps,
  NativeScrollEvent,
  ScrollView,
  ScrollViewProps,
  NativeSyntheticEvent,
  Easing,
  KeyboardAvoidingView,
  BackHandler,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeStyles, useColors } from '../theme';
import { Portal } from './Portal';

const native = Platform.OS !== 'web';

/** Lets the list inside a sheet tell the sheet whether it is scrolled to the very top. */
const SheetScrollContext = createContext<{ onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void } | null>(null);

/**
 * Spread these on the ScrollView / FlatList inside a BottomSheet. When the list is at the top,
 * dragging down moves the sheet (and lets you swipe it away) instead of bouncing the list.
 */
export function useSheetScroll() {
  const ctx = useContext(SheetScrollContext);
  return {
    onScroll: ctx?.onScroll,
    onScrollEndDrag: ctx?.onScroll,
    onMomentumScrollEnd: ctx?.onScroll,
    // Every scroll event, so the sheet always knows the final position (the handler is tiny).
    scrollEventThrottle: 1,
    bounces: false,
    overScrollMode: 'never' as const,
  };
}

/** A ScrollView for inside a BottomSheet: swipe down at the top to close the sheet. */
export function SheetScrollView({ ref, ...props }: ScrollViewProps & { ref?: Ref<ScrollView> }) {
  const sheet = useSheetScroll();
  return (
    <ScrollView
      ref={ref}
      {...sheet}
      {...props}
      onScroll={(e) => {
        sheet.onScroll?.(e);
        props.onScroll?.(e);
      }}
    />
  );
}

/** A FlatList for inside a BottomSheet: swipe down at the top to close the sheet. */
export function SheetFlatList<T>(props: FlatListProps<T>) {
  const sheet = useSheetScroll();
  return (
    <FlatList<T>
      {...sheet}
      {...props}
      onScroll={(e) => {
        sheet.onScroll?.(e);
        props.onScroll?.(e);
      }}
    />
  );
}

interface Props {
  visible: boolean;
  /** Called when the user swipes it down, taps outside it, or presses back. */
  onClose: () => void;
  /** The title row. It and the grab handle above it are where you drag the sheet down. */
  header?: ReactNode;
  children: ReactNode;
  /** Sheet colour. Defaults to the card colour. */
  background?: string;
}

/**
 * A sheet that slides up from the bottom, with a grab handle. Drag it down to close: from the
 * handle or title row any time, or from the content once its list is scrolled to the top.
 * It follows your finger, and a short flick is enough. The animations run on the native side.
 */
export function BottomSheet({ visible, onClose, header, children, background }: Props) {
  const styles = useStyles();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const sheetHeight = height - Math.max(insets.top, 20) - 12;
  const y = useRef(new Animated.Value(height)).current;
  const [mounted, setMounted] = useState(visible);
  const closing = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const slideOut = useCallback(
    (velocity = 0, then?: () => void) => {
      closing.current = true;
      Animated.timing(y, {
        toValue: height,
        // A fast flick finishes sooner.
        duration: Math.max(160, 280 - Math.min(velocity, 3) * 40),
        easing: Easing.out(Easing.cubic),
        useNativeDriver: native,
      }).start(() => then?.());
    },
    [y, height],
  );

  // Open when `visible` turns on; slide away (then unmount) when it turns off.
  useEffect(() => {
    if (visible) {
      closing.current = false;
      setMounted(true);
      y.setValue(height);
      Animated.spring(y, { toValue: 0, damping: 26, stiffness: 260, mass: 0.9, useNativeDriver: native }).start();
    } else if (mounted) {
      if (closing.current) setMounted(false);
      else slideOut(0, () => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const requestClose = useCallback(
    (velocity = 0) => {
      if (closing.current) return;
      slideOut(velocity, () => onCloseRef.current());
    },
    [slideOut],
  );

  // Where the sheet's top edge is on screen, and how tall the handle + header are.
  const sheetTop = height - sheetHeight;
  const headerHeight = useRef(60);
  const atTop = useRef(true);
  const startedAtTop = useRef(true);
  /** Where on screen the current touch began. (The gesture's own y0 is still 0 at this point.) */
  const touchStartY = useRef(0);
  const touchStarted = (pageY: number) => {
    touchStartY.current = pageY;
    startedAtTop.current = atTop.current;
  };
  const scrollCtx = useMemo(
    () => ({
      onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        atTop.current = e.nativeEvent.contentOffset.y <= 1;
      },
    }),
    [],
  );
  useEffect(() => {
    if (visible) atTop.current = true;
  }, [visible]);

  const geometry = useRef({ sheetTop, sheetHeight });
  geometry.current = { sheetTop, sheetHeight };

  const pan = useRef(
    PanResponder.create({
      // Take over a downward drag that starts on the handle/header, or anywhere once the
      // content is scrolled to the top. Capture runs before the list can start scrolling.
      // Remember, when the finger first touches, whether the content was already at the top.
      // A drag that starts while the list still has room to scroll back up only scrolls the
      // list, even if it reaches the top part-way through; the next drag closes the sheet.
      onStartShouldSetPanResponderCapture: (e) => {
        touchStarted(e.nativeEvent.pageY);
        return false;
      },
      onMoveShouldSetPanResponderCapture: (_, g) => {
        const down = g.dy > 6 && g.dy > Math.abs(g.dx) * 1.2;
        if (!down) return false;
        const inHeader = touchStartY.current - geometry.current.sheetTop < headerHeight.current;
        return inHeader || (startedAtTop.current && atTop.current);
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => {
        y.setValue(Math.max(0, g.dy));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > geometry.current.sheetHeight * 0.22 || (g.vy > 0.5 && g.dy > 16)) {
          requestCloseRef.current(g.vy);
        } else {
          Animated.spring(y, { toValue: 0, velocity: g.vy, damping: 26, stiffness: 320, mass: 0.9, useNativeDriver: native }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(y, { toValue: 0, damping: 26, stiffness: 320, useNativeDriver: native }).start();
      },
    }),
  ).current;
  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;

  // Android back closes the top sheet first.
  useEffect(() => {
    if (!mounted) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      requestCloseRef.current();
      return true;
    });
    return () => sub.remove();
  }, [mounted]);

  if (!mounted) return null;

  const backdrop = y.interpolate({ inputRange: [0, sheetHeight], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <Portal>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdrop }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => requestClose()} accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View
        {...pan.panHandlers}
        onTouchStart={(e) => touchStarted(e.nativeEvent.pageY)}
        {...(Platform.OS === 'web' ? { onMouseDown: (e: { nativeEvent: { pageY: number } }) => touchStarted(e.nativeEvent.pageY) } : null)}
        style={[
          styles.sheet,
          { height: sheetHeight + 40, backgroundColor: background ?? colors.card, transform: [{ translateY: y }] },
        ]}
      >
        <View onLayout={(e) => (headerHeight.current = e.nativeEvent.layout.height)}>
          <View style={styles.handleArea} accessibilityLabel="Drag down to close">
            <View style={styles.handle} />
          </View>
          {header}
        </View>
        <KeyboardAvoidingView
          style={{ flex: 1, paddingBottom: 40 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Math.max(insets.top, 20) + 12}
        >
          <SheetScrollContext.Provider value={scrollCtx}>{children}</SheetScrollContext.Provider>
        </KeyboardAvoidingView>
      </Animated.View>
    </Portal>
  );
}

const useStyles = makeStyles((colors) => ({
  backdrop: { backgroundColor: colors.scheme === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(17,21,19,0.35)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -40,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 16,
  },
  handleArea: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong },
}));
