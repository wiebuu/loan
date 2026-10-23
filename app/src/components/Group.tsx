import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { fonts, makeStyles, radius, useColors } from '../theme';

/**
 * Lists are drawn as grouped cards: rows of one group share a single rounded card, separated
 * by fine dividers that start after the avatar. Pass first/last so the corners and dividers
 * land in the right places.
 */
export function GroupRow({
  first,
  last,
  onPress,
  children,
  inset = 70,
  style,
  accessibilityLabel,
}: {
  first: boolean;
  last: boolean;
  onPress?: () => void;
  children: ReactNode;
  /** Where the divider starts, from the left. */
  inset?: number;
  style?: ViewStyle;
  accessibilityLabel?: string;
}) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.row,
        first && styles.first,
        last && styles.last,
        pressed && { backgroundColor: colors.sunken },
        style,
      ]}
    >
      {children}
      {!last ? <View style={[styles.divider, { left: inset }]} /> : null}
    </Pressable>
  );
}

/** The small title above a group, with an optional note on the right. */
export function GroupHeader({ title, right, first }: { title: string; right?: string; first?: boolean }) {
  const styles = useStyles();
  return (
    <View style={[styles.header, first && { marginTop: 4 }]}>
      <Text style={styles.headerText}>{title}</Text>
      {right ? <Text style={styles.headerRight}>{right}</Text> : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  first: { borderTopLeftRadius: radius.lg - 4, borderTopRightRadius: radius.lg - 4 },
  last: { borderBottomLeftRadius: radius.lg - 4, borderBottomRightRadius: radius.lg - 4 },
  divider: { position: 'absolute', right: 0, bottom: 0, height: 1, backgroundColor: colors.border },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 20, marginBottom: 8, paddingHorizontal: 4 },
  headerText: { fontSize: 13, fontFamily: fonts.bold, color: colors.ink },
  headerRight: { fontSize: 12.5, fontFamily: fonts.semibold, color: colors.faint },
}));
