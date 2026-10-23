import { Pressable, Text, View } from 'react-native';
import { fonts, makeStyles, radius, useColors } from '../theme';
import { Loan } from '../types';
import { formatDate, formatMoney } from '../utils/format';
import { needsMyAction } from '../utils/loans';
import { Avatar } from './Avatar';
import { ChevronIcon, LinkIcon, NoteIcon } from './Icons';
import { StatusPill } from './StatusPill';

interface Props {
  loan: Loan;
  onPress: (loan: Loan) => void;
}

export function LoanItem({ loan, onPress }: Props) {
  const styles = useStyles();
  const colors = useColors();
  const settled = loan.status === 'repaid' || loan.status === 'declined';
  const lent = loan.role === 'lender';
  const attention = needsMyAction(loan);

  return (
    <Pressable
      onPress={() => onPress(loan)}
      style={({ pressed }) => [
        styles.card,
        loan.overdue && styles.overdueCard,
        attention && !loan.overdue && styles.attentionCard,
        pressed && { opacity: 0.85 },
      ]}
    >
      {loan.overdue ? <View style={styles.stripe} /> : null}
      <View style={styles.top}>
        <Avatar name={loan.counterparty.name} muted={settled} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.direction, { color: lent ? colors.brand : colors.goldInk }]}>
            {lent ? 'YOU LENT' : 'YOU BORROWED'}
          </Text>
          <Text style={[styles.name, settled && { color: colors.muted }]} numberOfLines={1}>
            {loan.counterparty.name}
          </Text>
          <View style={styles.metaRow}>
            {loan.linked ? <LinkIcon color={colors.faint} size={12} /> : <NoteIcon color={colors.faint} size={12} />}
            <Text style={styles.meta} numberOfLines={1}>
              {loan.status === 'repaid' && loan.repaidAt
                ? `Repaid ${formatDate(loan.repaidAt.slice(0, 10))}`
                : `Due ${formatDate(loan.dueDate)}`}
              {loan.linked ? '' : ' · just for you'}
            </Text>
          </View>
        </View>
        <View style={styles.right}>
          <Text
            style={[
              styles.amount,
              settled && styles.settledAmount,
              loan.overdue && { color: colors.danger },
            ]}
          >
            {lent ? '' : '−'}
            {formatMoney(loan.amount)}
          </Text>
          <ChevronIcon color={colors.faint} size={16} />
        </View>
      </View>
      <View style={styles.bottom}>
        <StatusPill loan={loan} />
        {loan.note ? (
          <Text style={styles.note} numberOfLines={1}>
            {loan.note}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  overdueCard: { backgroundColor: colors.dangerSoft, borderColor: colors.dangerLine },
  attentionCard: { borderColor: colors.brand, borderWidth: 1.5 },
  stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, backgroundColor: colors.danger },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  direction: { fontSize: 10.5, fontFamily: fonts.heavy, letterSpacing: 0.8 },
  name: { fontSize: 16, fontFamily: fonts.bold, color: colors.ink, marginTop: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  meta: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.muted, flexShrink: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  amount: { fontSize: 17, fontFamily: fonts.heavy, color: colors.ink },
  settledAmount: { textDecorationLine: 'line-through', color: colors.faint },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  note: { flex: 1, fontSize: 12.5, fontFamily: fonts.regular, color: colors.muted, textAlign: 'right' },
}));
