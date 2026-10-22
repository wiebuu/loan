import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '../theme';
import { Loan } from '../types';
import { daysPast, formatDate, formatMoney } from '../utils/format';
import { isOverdue } from '../utils/loans';
import { CheckIcon } from './Icons';

interface Props {
  loan: Loan;
  onMarkRepaid: (loan: Loan) => void;
}

const AVATAR_TINTS = [
  ['#E4F0E9', '#1F6B4A'],
  ['#FDF3DC', '#8A5A00'],
  ['#E7EEF8', '#2F5C99'],
  ['#F3E8F4', '#7B3F86'],
  ['#E9F3F3', '#2D6E6E'],
];

function tint(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_TINTS[h % AVATAR_TINTS.length];
}

export function LoanItem({ loan, onMarkRepaid }: Props) {
  const overdue = isOverdue(loan);
  const repaid = loan.status === 'repaid';
  const [bg, fg] = tint(loan.friendName);

  return (
    <View style={[styles.card, overdue && styles.overdueCard]}>
      {overdue ? <View style={styles.stripe} /> : null}
      <View style={styles.top}>
        <View style={[styles.avatar, { backgroundColor: repaid ? colors.bg : bg }]}>
          <Text style={[styles.avatarText, { color: repaid ? colors.faint : fg }]}>
            {loan.friendName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.name, repaid && { color: colors.muted }]} numberOfLines={1}>
            {loan.friendName}
          </Text>
          <Text style={styles.due}>{subtitle(loan)}</Text>
        </View>
        <Text style={[styles.amount, repaid && styles.repaidAmount, overdue && { color: colors.danger }]}>
          {formatMoney(loan.amount)}
        </Text>
      </View>

      <View style={styles.bottom}>
        <StatusPill loan={loan} overdue={overdue} />
        {repaid ? null : (
          <Pressable
            onPress={() => onMarkRepaid(loan)}
            hitSlop={8}
            accessibilityRole="button"
            style={({ pressed }) => [styles.repayBtn, pressed && { opacity: 0.7 }]}
          >
            <CheckIcon size={15} color={colors.brand} />
            <Text style={styles.repayText}>Mark repaid</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function subtitle(loan: Loan): string {
  if (loan.status === 'repaid') return `Repaid ${formatDate(loan.repaidAt!.slice(0, 10))}`;
  return `Due ${formatDate(loan.dueDate)}`;
}

function StatusPill({ loan, overdue }: { loan: Loan; overdue: boolean }) {
  let label: string;
  let fg: string;
  let bg: string;
  if (loan.status === 'repaid') {
    [label, fg, bg] = ['Repaid', colors.success, colors.successSoft];
  } else if (overdue) {
    const days = daysPast(loan.dueDate);
    [label, fg, bg] = [`${days} day${days === 1 ? '' : 's'} late`, '#FFFFFF', colors.danger];
  } else {
    const left = -daysPast(loan.dueDate);
    label = left === 0 ? 'Due today' : `${left} day${left === 1 ? '' : 's'} left`;
    [fg, bg] = left <= 3 ? [colors.goldInk, colors.goldSoft] : [colors.muted, colors.bg];
  }
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  overdueCard: { backgroundColor: colors.dangerSoft, borderColor: colors.dangerLine },
  stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, backgroundColor: colors.danger },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.heavy, fontSize: 17 },
  name: { fontSize: 16, fontFamily: fonts.bold, color: colors.ink },
  due: { fontSize: 13, fontFamily: fonts.regular, color: colors.muted, marginTop: 2 },
  amount: { fontSize: 18, fontFamily: fonts.heavy, color: colors.ink },
  repaidAmount: { textDecorationLine: 'line-through', color: colors.faint },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  pillText: { fontSize: 12, fontFamily: fonts.bold },
  repayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
  },
  repayText: { color: colors.brand, fontFamily: fonts.bold, fontSize: 13 },
});
