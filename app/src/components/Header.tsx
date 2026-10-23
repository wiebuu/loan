import { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { fonts, makeStyles } from '../theme';

interface Props {
  /** A page title, or leave it out and pass `left` (e.g. the logo). */
  title?: string;
  left?: ReactNode;
  /** Buttons on the right. */
  right?: ReactNode;
}

/** The bar at the top of each tab. */
export function Header({ title, left, right }: Props) {
  const styles = useStyles();
  return (
    <View style={styles.header}>
      {left ?? <Text style={styles.title}>{title}</Text>}
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    minHeight: 58,
  },
  title: { fontSize: 28, fontFamily: fonts.heavy, color: colors.ink, letterSpacing: -0.6 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
}));

/** An icon in the header: just the icon, with a comfortable touch area around it. */
export function HeaderButton({ children }: { children: ReactNode }) {
  return <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>{children}</View>;
}
