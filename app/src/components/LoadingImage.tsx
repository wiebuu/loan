import { useEffect, useState } from 'react';
import { Image, ImageProps, StyleSheet, Text, View } from 'react-native';
import { fonts, useColors } from '../theme';
import { CoinSpinner } from './Refresh';

type State = 'loading' | 'done' | 'failed';

/**
 * An image that shows the flipping coin until it has loaded (or says so if it can't).
 *
 * The spinner starts when the address changes and stops on load or error. It is not tied to
 * onLoadStart: on iPhone that can arrive after the image has already finished (cached or
 * small photos), which used to leave the coin spinning forever.
 */
export function LoadingImage(props: ImageProps) {
  const colors = useColors();
  const uri = typeof props.source === 'object' && props.source && 'uri' in props.source ? props.source.uri : undefined;
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    setState('loading');
    // Never spin forever: give up after 20 seconds.
    const t = setTimeout(() => setState((s) => (s === 'loading' ? 'failed' : s)), 20_000);
    return () => clearTimeout(t);
  }, [uri]);

  return (
    <View style={[props.style, { overflow: 'hidden' }]}>
      <Image
        {...props}
        style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
        onLoad={(e) => {
          setState('done');
          props.onLoad?.(e);
        }}
        onError={(e) => {
          setState('failed');
          props.onError?.(e);
        }}
      />
      {state !== 'done' ? (
        <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
          {state === 'loading' ? (
            <CoinSpinner size={28} />
          ) : (
            <Text style={[styles.failed, { color: colors.muted }]}>Couldn't load</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  failed: { fontSize: 10.5, fontFamily: fonts.semibold, textAlign: 'center' },
});
