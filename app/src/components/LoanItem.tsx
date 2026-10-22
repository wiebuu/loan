import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';
import { Loan } from '../types';
import { daysPast, formatDate, formatMoney } from '../utils/format';
import { isOverdue } from '../utils/loans';

interface Props {
  loan: Loan;
  onMarkRepaid: (loan: Loan) => void;
}

export function LoanItem({ loan, onMarkRepaid }: Props) {
  const overdue = isOverdue(loan);
  const repaid = loan.status === 'repaid';

  return (
    <View style={[styles.card, overdue && styles.overdueCard, repaid && styles.repaidCard]}>
      <View style={styles.top}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{loan.friendName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{loan.friendName}</Text>
          <Text style={[styles.due, overdue && { color: colors.danger }]}>{dueText(loan, overdue)}</Text>
        </View>
        <Text style={[styles.amount, repaid && styles.struck]}>{formatMoney(loan.amount)}</Text>
      </View>

      <View style={styles.bottom}>
        <Badge overdue={overdue} repaid={repaid} />
        {!repaid && (
          <Pressable onPress={() => onMarkRepaid(loan)} hitSlop={8} style={styles.repayBtn}>
            <Text style={styles.repayText}>Mark repaid</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function dueText(loan: Loan, overdue: boolean): string {
  if (loan.status === 'repaid') return `Repaid on ${formatDate(loan.repaidAt!.slice(0, 10))}`;
  if (overdue) {
    const days = daysPast(loan.dueDate);
    return `Overdue by ${days} day${days === 1 ? '' : 's'} · was due ${formatDate(loan.dueDate)}`;
  }
  const left = -daysPast(loan.dueDate);
  if (left === 0) return 'Due today';
  return `Due ${formatDate(loan.dueDate)} · in ${left} day${left === 1 ? '' : 's'}`;
}

function Badge({ overdue, repaid }: { overdue: boolean; repaid: boolean }) {
  const [label, fg, bg] = repaid
    ? ['Repaid', colors.success, colors.successSoft]
    : overdue
      ? ['Overdue', colors.danger, '#FEE2E2']
      : ['Pending', colors.primary, colors.primarySoft];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  overdueCard: {
    backgroundColor: colors.dangerSoft,
    borderColor: '#FCA5A5',
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
  },
  repaidCard: { opacity: 0.7 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontWeight: '700', fontSize: 16 },
  name: { fontSize: 16, fontWeight: '600', color: colors.ink },
  due: { fontSize: 13, color: colors.muted, marginTop: 2 },
  amount: { fontSize: 17, fontWeight: '700', color: colors.ink },
  struck: { textDecorationLine: 'line-through', color: colors.muted },
  bottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  repayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.success,
    backgroundColor: '#fff',
  },
  repayText: { color: colors.success, fontWeight: '600', fontSize: 13 },
});
