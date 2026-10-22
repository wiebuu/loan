import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';
import { Summary } from '../types';
import { formatMoney } from '../utils/format';

export function SummaryCard({ summary }: { summary: Summary | null }) {
  const outstanding = summary ? summary.totalLent - summary.totalRepaid : 0;
  return (
    <View style={styles.card}>
      <Text style={styles.caption}>Still to get back</Text>
      <Text style={styles.big}>{summary ? formatMoney(outstanding) : '—'}</Text>
      <View style={styles.row}>
        <Stat label="Total lent" value={summary?.totalLent} />
        <Stat label="Repaid" value={summary?.totalRepaid} />
        <Stat label="Overdue" value={summary?.overdueAmount} highlight />
      </View>
    </View>
  );
}

function Stat({ label, value, highlight }: { label: string; value?: number; highlight?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && !!value && { color: '#FCA5A5' }]}>
        {value === undefined ? '—' : formatMoney(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: 20,
    marginBottom: 16,
  },
  caption: { color: '#C7D2FE', fontSize: 14 },
  big: { color: '#fff', fontSize: 32, fontWeight: '700', marginTop: 4, marginBottom: 18 },
  row: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1 },
  statLabel: { color: '#C7D2FE', fontSize: 12, marginBottom: 2 },
  statValue: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
