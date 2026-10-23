import { StyleSheet, Text, View } from 'react-native';
import { fonts, useColors } from '../theme';

/** A soft rounded square with the person's initial. */
export function Avatar({ name, size = 44, muted }: { name: string; size?: number; muted?: boolean }) {
  const colors = useColors();
  const clean = name.replace(/^@/, '');
  const [bg, fg] = colors.tints[0];
  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: size * 0.34, backgroundColor: muted ? colors.sunken : bg }]}>
      <Text style={[styles.letter, { fontSize: size * 0.4, color: muted ? colors.faint : fg }]}>{clean.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  letter: { fontFamily: fonts.heavy },
});
