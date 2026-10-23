import { createContext, ReactNode, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

interface PortalApi {
  mount: (key: number, node: ReactNode) => void;
  unmount: (key: number) => void;
}

const PortalContext = createContext<PortalApi | null>(null);
let nextKey = 1;

/**
 * Draws <Portal> contents on top of the whole app, in the order they were opened. Sheets use
 * this instead of a native modal: native modals can refuse to open while another one is
 * still closing (which left the screen stuck), and these never do.
 */
export function PortalProvider({ children }: { children: ReactNode }) {
  const [nodes, setNodes] = useState<{ key: number; node: ReactNode }[]>([]);
  const api = useMemo<PortalApi>(
    () => ({
      mount: (key, node) =>
        setNodes((list) => {
          const i = list.findIndex((n) => n.key === key);
          if (i === -1) return [...list, { key, node }];
          const copy = list.slice();
          copy[i] = { key, node };
          return copy;
        }),
      unmount: (key) => setNodes((list) => list.filter((n) => n.key !== key)),
    }),
    [],
  );
  return (
    <PortalContext.Provider value={api}>
      {children}
      {nodes.map((n) => (
        <View key={n.key} style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {n.node}
        </View>
      ))}
    </PortalContext.Provider>
  );
}

/** Renders its children on top of the whole app (see PortalProvider). */
export function Portal({ children }: { children: ReactNode }) {
  const api = useContext(PortalContext);
  const key = useRef(nextKey++).current;
  // A layout effect, so the portal shows the new content in the same frame. (With a normal
  // effect it lagged a frame behind, and fast typing in a sheet could drop characters.)
  useLayoutEffect(() => {
    api?.mount(key, children);
  });
  useEffect(() => () => api?.unmount(key), [api, key]);
  return null;
}
