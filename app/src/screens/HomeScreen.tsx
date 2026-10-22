import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as api from '../api';
import { AddLoanModal } from '../components/AddLoanModal';
import { Button } from '../components/Button';
import { LoanItem } from '../components/LoanItem';
import { SummaryCard } from '../components/SummaryCard';
import { colors } from '../theme';
import { Loan, NewLoan, Session, Summary } from '../types';
import { formatMoney } from '../utils/format';
import { sortLoans } from '../utils/loans';

interface Props {
  session: Session;
  onLogout: () => void;
}

export function HomeScreen({ session, onLogout }: Props) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const [list, sum] = await Promise.all([api.listLoans(), api.getSummary()]);
      setLoans(list);
      setSummary(sum);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your entries');
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function addLoan(input: NewLoan) {
    await api.createLoan(input);
    setAdding(false);
    await load();
  }

  async function markRepaid(loan: Loan) {
    try {
      await api.markRepaid(loan.id);
      await load();
    } catch (e) {
      Alert.alert('Could not update', e instanceof Error ? e.message : 'Try again');
    }
  }

  function confirmRepaid(loan: Loan) {
    // Alert buttons do nothing on web, so skip the confirmation there.
    if (Platform.OS === 'web') return markRepaid(loan);
    Alert.alert('Mark as repaid?', `${loan.friendName} paid back ${formatMoney(loan.amount)}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark repaid',
        onPress: () => markRepaid(loan),
      },
    ]);
  }

  const sorted = useMemo(() => sortLoans(loans), [loans]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>Hello 👋</Text>
          <Text style={styles.phone}>+91 {session.phone}</Text>
        </View>
        <Pressable onPress={onLogout} hitSlop={10}>
          <Text style={styles.logout}>Log out</Text>
        </Pressable>
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(l) => l.id}
        renderItem={({ item }) => <LoanItem loan={item} onMarkRepaid={confirmRepaid} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListHeaderComponent={
          <>
            <SummaryCard summary={summary} />
            <Button title="+ Add entry" onPress={() => setAdding(true)} style={{ marginBottom: 20 }} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {sorted.length > 0 ? <Text style={styles.section}>Your entries</Text> : null}
          </>
        }
        ListEmptyComponent={
          loading ? undefined : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No entries yet</Text>
              <Text style={styles.emptyText}>Tap "Add entry" when you lend money to a friend.</Text>
            </View>
          )
        }
      />

      <AddLoanModal visible={adding} onClose={() => setAdding(false)} onSubmit={addLoan} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  hello: { fontSize: 22, fontWeight: '700', color: colors.ink },
  phone: { fontSize: 13, color: colors.muted, marginTop: 2 },
  logout: { color: colors.primary, fontWeight: '600', fontSize: 15 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  section: { fontSize: 16, fontWeight: '700', color: colors.ink, marginBottom: 10 },
  error: { color: colors.danger, marginBottom: 12 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: colors.ink },
  emptyText: { color: colors.muted, marginTop: 6, textAlign: 'center' },
});
