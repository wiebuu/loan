import { ComponentRef, useCallback, useRef } from 'react';
import { LayoutChangeEvent, ScrollView, TextInput } from 'react-native';

export type InputRef = ComponentRef<typeof TextInput>;

/**
 * For forms in a scroll view: remembers where each field sits, and on a failed submit
 * scrolls to the first field with a problem and puts the cursor in it.
 *
 *   const form = useFormScroll(['amount', 'person']);
 *   <ScrollView ref={form.scrollRef}> <View onLayout={form.at('amount')}> ... </View>
 *   if (errors) form.reveal(Object.keys(errors), { amount: amountRef });
 */
export function useFormScroll<K extends string>(order: readonly K[]) {
  const scrollRef = useRef<ScrollView>(null);
  const positions = useRef<Partial<Record<K, number>>>({});

  const at = useCallback(
    (key: K) => (e: LayoutChangeEvent) => {
      positions.current[key] = e.nativeEvent.layout.y;
    },
    [],
  );

  /** Scroll to the first of these keys (in form order) and focus its input, if given. */
  const reveal = useCallback(
    (keys: string[], inputs: Partial<Record<K, { current: InputRef | null } | null>> = {}) => {
      const first = order.find((k) => keys.includes(k));
      if (!first) return;
      const y = positions.current[first];
      if (y !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
      // Focus once the scroll has mostly run, so the keyboard doesn't fight it.
      const input = inputs[first]?.current;
      if (input) setTimeout(() => input.focus(), 280);
    },
    [order],
  );

  return { scrollRef, at, reveal };
}
