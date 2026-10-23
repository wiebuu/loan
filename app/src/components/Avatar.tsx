import { StyleSheet, Text, View } from 'react-native';
import { fonts, useColors } from '../theme';

/** A circle with the person's first letter, in a colour that stays the same for the same name. */
export function Avatar({ name, size = 44, muted }: { name: string; size?: number; muted?: boolean }) {
  const colors = useColors();
  const clean = name.replace(/^@/, '');
  let h = 0;
  for (const ch of clean.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const [bg, fg] = colors.tints[h % colors.tints.length];
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: muted ? colors.bg : bg },
      ]}
    >
      <Text style={[styles.letter, { fontSize: size * 0.4, color: muted ? colors.faint : fg }]}>
        {clean.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  letter: { fontFamily: fonts.heavy },
});
