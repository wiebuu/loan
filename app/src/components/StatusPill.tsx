import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { fonts, Palette, radius, useColors } from '../theme';
import { Loan } from '../types';
import { daysPast } from '../utils/format';

/** One short label for where the loan stands, from your side. */
export function statusInfo(loan: Loan, colors: Palette): { label: string; fg: string; bg: string } {
  const other = loan.counterparty.name;
  switch (loan.status) {
    case 'pending':
      return loan.createdByMe
        ? { label: `Waiting for ${other}`, fg: colors.muted, bg: colors.bg }
        : { label: 'Needs your OK', fg: colors.onBrand, bg: colors.brand };
    case 'declined':
      return { label: 'Declined', fg: colors.muted, bg: colors.bg };
    case 'cancelled':
      return { label: 'Withdrawn', fg: colors.muted, bg: colors.bg };
    case 'repaid':
      return { label: 'Repaid', fg: colors.success, bg: colors.successSoft };
    case 'paid_claimed':
      return loan.role === 'lender'
        ? { label: 'Confirm payment', fg: colors.onBrand, bg: colors.brand }
        : { label: 'Waiting for confirmation', fg: colors.goldInk, bg: colors.goldSoft };
    default: {
      if (loan.overdue) {
        const days = loan.daysPastDue;
        return { label: `${days} day${days === 1 ? '' : 's'} late`, fg: '#FFFFFF', bg: colors.danger };
      }
      const left = -daysPast(loan.dueDate);
      const label = left === 0 ? 'Due today' : `${left} day${left === 1 ? '' : 's'} left`;
      return left <= 3
        ? { label, fg: colors.goldInk, bg: colors.goldSoft }
        : { label, fg: colors.muted, bg: colors.bg };
    }
  }
}

export function StatusPill({ loan, style }: { loan: Loan; style?: ViewStyle }) {
  const { label, fg, bg } = statusInfo(loan, useColors());
  return (
    <View style={[styles.pill, { backgroundColor: bg }, style]}>
      <Text style={[styles.text, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, alignSelf: 'flex-start' },
  text: { fontSize: 12, fontFamily: fonts.bold },
});
