import { Pressable, ScrollView, Text } from 'react-native';
import { fonts, makeStyles, radius, useColors } from '../theme';

export interface Chip<K extends string> {
  key: K;
  label: string;
  count: number;
  /** Show the count in red, e.g. overdue. */
  alert?: boolean;
}

/** A row of filters, one selected. The selected one sits on a white pill. */
export function FilterChips<K extends string>({ chips, value, onChange }: { chips: Chip<K>[]; value: K; onChange: (k: K) => void }) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.row}>
      {chips.map((c) => {
        const active = c.key === value;
        return (
          <Pressable
            key={c.key}
            onPress={() => onChange(c.key)}
            style={[styles.chip, active && styles.active]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{c.label}</Text>
            <Text style={[styles.count, active && styles.countActive, c.alert && c.count > 0 && { color: colors.danger }]}>{c.count}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const useStyles = makeStyles((colors) => ({
  scroll: { marginHorizontal: -16, marginBottom: 14, flexGrow: 0 },
  row: { flexDirection: 'row', gap: 4, paddingHorizontal: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: 'transparent' },
  active: { backgroundColor: colors.card, borderColor: colors.border },
  label: { fontSize: 13.5, fontFamily: fonts.semibold, color: colors.muted },
  labelActive: { color: colors.ink, fontFamily: fonts.bold },
  count: { fontSize: 13, fontFamily: fonts.semibold, color: colors.faint },
  countActive: { color: colors.muted },
}));
