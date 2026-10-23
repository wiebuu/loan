import { Text, View } from 'react-native';
import { fonts, makeStyles, useColors } from '../theme';
import { Loan } from '../types';
import { formatDate, formatMoney } from '../utils/format';
import { needsMyAction } from '../utils/loans';
import { Avatar } from './Avatar';
import { GroupRow } from './Group';
import { ArrowInIcon, ArrowOutIcon } from './Icons';
import { statusInfo } from './StatusPill';

interface Props {
  loan: Loan;
  onPress: (loan: Loan) => void;
  /** Its place in a grouped list, for the rounded corners and dividers. */
  first?: boolean;
  last?: boolean;
}

/**
 * One loan as a row of a grouped list: who and which way the money went on the left, the
 * amount and where it stands on the right. Colour only where it means something.
 */
export function LoanItem({ loan, onPress, first = true, last = true }: Props) {
  const styles = useStyles();
  const colors = useColors();
  const settled = loan.status === 'repaid' || loan.status === 'declined' || loan.status === 'cancelled';
  const lent = loan.role === 'lender';
  const attention = needsMyAction(loan);
  const { label } = statusInfo(loan, colors);
  const statusColor = loan.overdue ? colors.danger : attention ? colors.brand : colors.faint;
  const Arrow = lent ? ArrowOutIcon : ArrowInIcon;

  const when =
    loan.status === 'repaid' && loan.repaidAt ? formatDate(loan.repaidAt.slice(0, 10)) : `Due ${formatDate(loan.dueDate)}`;

  return (
    <GroupRow
      first={first}
      last={last}
      onPress={() => onPress(loan)}
      accessibilityLabel={`${lent ? 'You lent' : 'You borrowed from'} ${loan.counterparty.name}, ${formatMoney(loan.amount)}, ${label}`}
    >
      <Avatar name={loan.counterparty.name} size={42} muted={settled} />

      <View style={styles.main}>
        <Text style={[styles.name, settled && { color: colors.muted }]} numberOfLines={1}>
          {loan.counterparty.name}
        </Text>
        <View style={styles.metaRow}>
          <Arrow size={13} color={settled ? colors.faint : lent ? colors.brand : colors.goldInk} />
          <Text style={styles.meta} numberOfLines={1}>
            {lent ? 'Lent' : 'Borrowed'} · {when}
          </Text>
        </View>
      </View>

      <View style={styles.right}>
        <Text style={[styles.amount, settled && styles.settledAmount]} numberOfLines={1}>
          {formatMoney(loan.amount)}
        </Text>
        <Text style={[styles.status, { color: statusColor }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </GroupRow>
  );
}

const useStyles = makeStyles((colors) => ({
  main: { flex: 1, minWidth: 0 },
  name: { fontSize: 15.5, fontFamily: fonts.bold, color: colors.ink },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  meta: { fontSize: 13, fontFamily: fonts.regular, color: colors.muted, flexShrink: 1 },
  right: { alignItems: 'flex-end', maxWidth: '45%' },
  amount: { fontSize: 16, fontFamily: fonts.bold, color: colors.ink, letterSpacing: -0.2 },
  settledAmount: { color: colors.faint, textDecorationLine: 'line-through' },
  status: { fontSize: 12.5, fontFamily: fonts.semibold, marginTop: 3 },
}));
