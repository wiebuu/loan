import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LoanItem } from '../components/LoanItem';
import { SummaryCard } from '../components/SummaryCard';
import { colors, fonts, radius } from '../theme';
import { Loan, Summary } from '../types';
import { needsMyAction, sortLoans } from '../utils/loans';

type Filter = 'all' | 'needsYou' | 'overdue' | 'lent' | 'borrowed' | 'repaid';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'needsYou', label: 'Needs you' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'lent', label: 'You lent' },
  { key: 'borrowed', label: 'You borrowed' },
  { key: 'repaid', label: 'Repaid' },
];

function matches(loan: Loan, filter: Filter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'needsYou':
      return needsMyAction(loan);
    case 'overdue':
      return loan.overdue;
    case 'lent':
      return loan.role === 'lender' && loan.status !== 'repaid';
    case 'borrowed':
      return loan.role === 'borrower' && loan.status !== 'repaid';
    case 'repaid':
      return loan.status === 'repaid';
  }
}

interface Props {
  loans: Loan[];
  summary: Summary | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  bottomInset: number;
  onRefresh: () => void;
  onOpenLoan: (loan: Loan) => void;
}

export function HomeScreen({ loans, summary, loading, refreshing, error, bottomInset, onRefresh, onOpenLoan }: Props) {
  const [filter, setFilter] = useState<Filter>('all');

  const sorted = useMemo(() => sortLoans(loans), [loans]);
  const visible = useMemo(() => sorted.filter((l) => matches(l, filter)), [sorted, filter]);
  const counts = useMemo(() => {
    const c = Object.fromEntries(FILTERS.map((f) => [f.key, 0])) as Record<Filter, number>;
    for (const l of loans) for (const f of FILTERS) if (matches(l, f.key)) c[f.key]++;
    return c;
  }, [loans]);

  return (
    <FlatList
      data={visible}
      keyExtractor={(l) => String(l.id)}
      renderItem={({ item }) => <LoanItem loan={item} onPress={onOpenLoan} />}
      contentContainerStyle={[styles.list, { paddingBottom: 100 + bottomInset }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      ListHeaderComponent={
        <>
          <SummaryCard summary={summary} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabs}>
            {FILTERS.filter((f) => f.key !== 'needsYou' || counts.needsYou > 0).map((f) => {
              const active = f.key === filter;
              const alert = (f.key === 'overdue' || f.key === 'needsYou') && counts[f.key] > 0;
              return (
                <Pressable
                  key={f.key}
                  onPress={() => setFilter(f.key)}
                  style={[styles.tab, active && styles.tabActive]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{f.label}</Text>
                  <View
                    style={[
                      styles.count,
                      active && styles.countActive,
                      alert && !active && { backgroundColor: f.key === 'overdue' ? colors.danger : colors.brand },
                    ]}
                  >
                    <Text style={[styles.countText, active && { color: colors.ink }, alert && !active && { color: '#FFFFFF' }]}>
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
            <Text style={styles.emptyTitle}>{filter === 'all' ? 'No loans yet' : 'Nothing here'}</Text>
            <Text style={styles.emptyText}>
              {filter === 'all'
                ? 'Tap "New loan" when you lend or borrow money.'
                : 'No loans match this filter right now.'}
            </Text>
          </View>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingTop: 4 },
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
  countText: { fontSize: 12, fontFamily: fonts.heavy, color: colors.muted },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontFamily: fonts.bold, color: colors.ink },
  emptyText: { color: colors.muted, fontFamily: fonts.regular, marginTop: 6, textAlign: 'center' },
});
