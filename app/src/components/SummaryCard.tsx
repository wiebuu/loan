import { Text, View } from 'react-native';
import { fonts, makeStyles, radius, useColors } from '../theme';
import { Summary } from '../types';
import { formatMoney } from '../utils/format';
import { Checker } from './Checker';
import { CoinMark } from './Logo';

export function SummaryCard({ summary }: { summary: Summary | null }) {
  const styles = useStyles();
  const colors = useColors();
  const lent = summary?.totalLent ?? 0;
  const repaid = summary?.totalRepaid ?? 0;
  const overdue = summary?.overdueAmount ?? 0;
  const outstanding = summary?.toReceive ?? 0;
  const toPay = summary?.toPay ?? 0;
  const share = lent > 0 ? repaid / lent : 0;

  return (
    <View style={styles.card}>
      <Checker size={22} />
      <View style={styles.top}>
        <Text style={styles.caption}>Still to get back</Text>
        <CoinMark size={30} color={colors.heroInk} />
      </View>
      <Text style={styles.big} numberOfLines={1} adjustsFontSizeToFit>
        {summary ? formatMoney(outstanding) : '—'}
      </Text>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(share * 100)}%` }]} />
      </View>
      <Text style={styles.progress}>
        {summary ? `${formatMoney(repaid)} of ${formatMoney(lent)} repaid` : ' '}
      </Text>

      <View style={styles.row}>
        <Stat label="Total lent" value={summary ? formatMoney(lent) : '—'} />
        <Stat label="Repaid" value={summary ? formatMoney(repaid) : '—'} />
        <Stat label="Overdue" value={summary ? formatMoney(overdue) : '—'} alert={overdue > 0} />
      </View>

      {toPay > 0 ? (
        <View style={styles.owe}>
          <Text style={styles.oweLabel}>You owe others</Text>
          <Text style={styles.oweValue}>
            {formatMoney(toPay)}
            {summary!.youOweOverdue > 0 ? `  ·  ${formatMoney(summary!.youOweOverdue)} late` : ''}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function Stat({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View style={[styles.stat, alert && styles.statAlert]}>
      <Text style={[styles.statLabel, alert && { color: colors.heroAlertInk }]}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    backgroundColor: colors.hero,
    borderRadius: radius.lg,
    padding: 20,
    marginBottom: 18,
    overflow: 'hidden',
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  caption: { color: colors.heroMuted, fontSize: 14, fontFamily: fonts.semibold },
  big: { color: colors.heroInk, fontSize: 38, fontFamily: fonts.heavy, marginTop: 2, letterSpacing: -0.5 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.heroTrack, marginTop: 16, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.gold, borderRadius: 4 },
  progress: { color: colors.heroMuted, fontSize: 12, fontFamily: fonts.semibold, marginTop: 8 },
  row: { flexDirection: 'row', gap: 8, marginTop: 16 },
  stat: { flex: 1, backgroundColor: colors.heroTile, borderRadius: radius.sm, paddingVertical: 10, paddingHorizontal: 10 },
  statAlert: { backgroundColor: colors.heroAlert },
  statLabel: { color: colors.heroMuted, fontSize: 11, fontFamily: fonts.bold, letterSpacing: 0.3, marginBottom: 3 },
  statValue: { color: colors.heroInk, fontSize: 15, fontFamily: fonts.bold },
  owe: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.heroTrack,
  },
  oweLabel: { color: colors.heroMuted, fontSize: 13, fontFamily: fonts.semibold },
  oweValue: { color: colors.goldInk, fontSize: 14, fontFamily: fonts.bold },
}));
