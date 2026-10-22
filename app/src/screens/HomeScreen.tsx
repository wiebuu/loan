import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as api from '../api';
import { AddLoanModal } from '../components/AddLoanModal';
import { Button } from '../components/Button';
import { LogoutIcon, PlusIcon } from '../components/Icons';
import { LoanItem } from '../components/LoanItem';
import { Logo } from '../components/Logo';
import { SummaryCard } from '../components/SummaryCard';
import { colors, fonts, radius } from '../theme';
import { Loan, NewLoan, Session, Summary } from '../types';
import { formatMoney } from '../utils/format';
import { isOverdue, sortLoans } from '../utils/loans';

type Filter = 'all' | 'overdue' | 'pending' | 'repaid';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'pending', label: 'Upcoming' },
  { key: 'repaid', label: 'Repaid' },
];

function matches(loan: Loan, filter: Filter): boolean {
  if (filter === 'all') return true;
  if (filter === 'overdue') return isOverdue(loan);
  if (filter === 'pending') return loan.status === 'pending' && !isOverdue(loan);
  return loan.status === 'repaid';
}

interface Props {
  session: Session;
  onLogout: () => void;
}

export function HomeScreen({ session, onLogout }: Props) {
  const insets = useSafeAreaInsets();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

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
    setFilter('all');
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
      { text: 'Mark repaid', onPress: () => markRepaid(loan) },
    ]);
  }

  const sorted = useMemo(() => sortLoans(loans), [loans]);
  const visible = useMemo(() => sorted.filter((l) => matches(l, filter)), [sorted, filter]);
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, overdue: 0, pending: 0, repaid: 0 };
    for (const l of loans) for (const f of FILTERS) if (matches(l, f.key)) c[f.key]++;
    return c;
  }, [loans]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Logo height={34} />
        <Pressable onPress={onLogout} hitSlop={10} style={styles.logout} accessibilityLabel="Log out">
          <Text style={styles.phone}>+91 {session.phone}</Text>
          <LogoutIcon size={18} color={colors.muted} />
        </Pressable>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(l) => l.id}
        renderItem={({ item }) => <LoanItem loan={item} onMarkRepaid={confirmRepaid} />}
        contentContainerStyle={[styles.list, { paddingBottom: 110 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} />}
        ListHeaderComponent={
          <>
            <SummaryCard summary={summary} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tabsScroll}
              contentContainerStyle={styles.tabs}
            >
              {FILTERS.map((f) => {
                const active = f.key === filter;
                const alert = f.key === 'overdue' && counts.overdue > 0;
                return (
                  <Pressable
                    key={f.key}
                    onPress={() => setFilter(f.key)}
                    style={[styles.tab, active && styles.tabActive]}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.tabText, active && styles.tabTextActive]}>{f.label}</Text>
                    <View style={[styles.count, active && styles.countActive, alert && !active && styles.countAlert]}>
                      <Text
                        style={[
                          styles.countText,
                          active && { color: colors.ink },
                          alert && !active && { color: '#FFFFFF' },
                        ]}
                      >
                        {counts[f.key]}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        }
        ListEmptyComponent={
          loading ? undefined : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{emptyTitle(filter)}</Text>
              <Text style={styles.emptyText}>
                {filter === 'all' ? 'Tap "New loan" when you lend money to a friend.' : 'Nothing in this list right now.'}
              </Text>
            </View>
          )
        }
      />

      <View style={[styles.fabWrap, { bottom: 20 + insets.bottom }]}>
        <Button
          title="New loan"
          variant="gold"
          onPress={() => setAdding(true)}
          icon={<PlusIcon size={20} color={colors.ink} />}
          style={styles.fab}
        />
      </View>

      <AddLoanModal visible={adding} onClose={() => setAdding(false)} onSubmit={addLoan} />
    </SafeAreaView>
  );
}

function emptyTitle(filter: Filter): string {
  if (filter === 'overdue') return 'Nothing overdue';
  if (filter === 'pending') return 'No upcoming repayments';
  if (filter === 'repaid') return 'Nothing repaid yet';
  return 'No loans yet';
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 14,
  },
  logout: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  phone: { fontSize: 13, fontFamily: fonts.semibold, color: colors.muted },
  list: { paddingHorizontal: 16 },
  error: { color: colors.danger, fontFamily: fonts.semibold, marginBottom: 12 },
  tabsScroll: { marginHorizontal: -16, marginBottom: 14 },
  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 16 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  tabText: { fontSize: 13, fontFamily: fonts.bold, color: colors.muted },
  tabTextActive: { color: '#FFFFFF' },
  count: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countActive: { backgroundColor: colors.gold },
  countAlert: { backgroundColor: colors.danger },
  countText: { fontSize: 12, fontFamily: fonts.heavy, color: colors.muted },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontFamily: fonts.bold, color: colors.ink },
  emptyText: { color: colors.muted, fontFamily: fonts.regular, marginTop: 6, textAlign: 'center' },
  fabWrap: { position: 'absolute', right: 20 },
  fab: {
    borderRadius: radius.pill,
    paddingHorizontal: 22,
    shadowColor: '#12261E',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
