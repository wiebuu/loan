import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '../theme';
import { Summary } from '../types';
import { formatMoney } from '../utils/format';
import { CoinMark } from './Logo';

export function SummaryCard({ summary }: { summary: Summary | null }) {
  const lent = summary?.totalLent ?? 0;
  const repaid = summary?.totalRepaid ?? 0;
  const overdue = summary?.overdueAmount ?? 0;
  const outstanding = lent - repaid;
  const share = lent > 0 ? repaid / lent : 0;

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Text style={styles.caption}>Still to get back</Text>
        <CoinMark size={30} />
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
    </View>
  );
}

function Stat({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <View style={[styles.stat, alert && styles.statAlert]}>
      <Text style={[styles.statLabel, alert && { color: '#FFD2CC' }]}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.brandDark,
    borderRadius: radius.lg,
    padding: 20,
    marginBottom: 18,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  caption: { color: '#9FB8AC', fontSize: 14, fontFamily: fonts.semibold },
  big: { color: '#FFFFFF', fontSize: 38, fontFamily: fonts.heavy, marginTop: 2, letterSpacing: -0.5 },
  track: { height: 8, borderRadius: 4, backgroundColor: '#24443A', marginTop: 16, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.gold, borderRadius: 4 },
  progress: { color: '#9FB8AC', fontSize: 12, fontFamily: fonts.semibold, marginTop: 8 },
  row: { flexDirection: 'row', gap: 8, marginTop: 16 },
  stat: { flex: 1, backgroundColor: '#1C3a2F', borderRadius: radius.sm, paddingVertical: 10, paddingHorizontal: 10 },
  statAlert: { backgroundColor: '#5A2420' },
  statLabel: { color: '#9FB8AC', fontSize: 11, fontFamily: fonts.bold, letterSpacing: 0.3, marginBottom: 3 },
  statValue: { color: '#FFFFFF', fontSize: 15, fontFamily: fonts.bold },
});
