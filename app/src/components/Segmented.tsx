import { Pressable, Text, View } from 'react-native';
import { fonts, makeStyles, radius } from '../theme';

interface Props<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

/** Two or three side-by-side choices, one selected. */
export function Segmented<T extends string>({ value, options, onChange }: Props<T>) {
  const styles = useStyles();
  return (
    <View style={styles.wrap} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.option, active && styles.active]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.text, active && styles.activeText]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: radius.md, padding: 4, gap: 4 },
  option: { flex: 1, paddingVertical: 11, borderRadius: radius.sm, alignItems: 'center' },
  active: {
    backgroundColor: colors.card,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  text: { fontSize: 14, fontFamily: fonts.bold, color: colors.muted },
  activeText: { color: colors.ink },
}));
