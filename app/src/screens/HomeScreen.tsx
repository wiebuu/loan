import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { CoinRefresh, CoinSpinner, RefreshMode, ThemedRefreshControl, useScrollY } from '../components/Refresh';
import { FilterChips } from '../components/FilterChips';
import { GroupHeader } from '../components/Group';
import { LoanItem } from '../components/LoanItem';
import { SummaryCard } from '../components/SummaryCard';
import { fonts, makeStyles, radius, useColors } from '../theme';
import { Loan, Summary } from '../types';
import { formatMoney } from '../utils/format';
import { isOpen, needsMyAction, sortLoans } from '../utils/loans';

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

type Row = { kind: 'header'; key: string; title: string; note: string; first: boolean } | { kind: 'loan'; key: string; loan: Loan; first: boolean; last: boolean };

/** Which group a loan goes in on the Loans list. */
function groupOf(l: Loan): { key: string; title: string } {
  if (needsMyAction(l)) return { key: 'needs', title: 'Needs you' };
  if (l.overdue) return { key: 'late', title: 'Overdue' };
  if (isOpen(l) || l.status === 'pending') return { key: 'active', title: 'Active' };
  return { key: 'settled', title: 'Settled' };
}

/** Loans in groups (in the order sortLoans gives), flattened with a header before each group. */
function toRows(loans: Loan[]): Row[] {
  const groups: { key: string; title: string; loans: Loan[] }[] = [];
  for (const l of loans) {
    const g = groupOf(l);
    let group = groups.find((x) => x.key === g.key);
    if (!group) groups.push((group = { ...g, loans: [] }));
    group.loans.push(l);
  }
  const rows: Row[] = [];
  groups.forEach((g, gi) => {
    const total = g.loans.reduce((sum, l) => sum + l.amount, 0);
    rows.push({ kind: 'header', key: `h-${g.key}`, title: g.title, note: `${g.loans.length} · ${formatMoney(total)}`, first: gi === 0 });
    g.loans.forEach((loan, i) =>
      rows.push({ kind: 'loan', key: String(loan.id), loan, first: i === 0, last: i === g.loans.length - 1 }),
    );
  });
  return rows;
}

interface Props {
  loans: Loan[];
  summary: Summary | null;
  loading: boolean;
  refreshing: boolean;
  refreshMode: RefreshMode;
  error: string | null;
  bottomInset: number;
  onRefresh: () => void;
  onOpenLoan: (loan: Loan) => void;
  /** Open Settings at "Demo data" (from the link on an empty Home). */
  onOpenDemo: () => void;
}

export function HomeScreen({ loans, summary, loading, refreshing, refreshMode, error, bottomInset, onRefresh, onOpenLoan, onOpenDemo }: Props) {
  const styles = useStyles();
  const colors = useColors();
  const [filter, setFilter] = useState<Filter>('all');
  const { scrollY, onScroll } = useScrollY();
  const listRef = useRef<FlatList<Row>>(null);

  // A tap on the Loans tab while here: go back to the top so the coin can be seen.
  useEffect(() => {
    if (refreshing && refreshMode === 'tap') listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [refreshing, refreshMode]);

  const sorted = useMemo(() => sortLoans(loans), [loans]);
  const visible = useMemo(() => sorted.filter((l) => matches(l, filter)), [sorted, filter]);
  const rows = useMemo(() => toRows(visible), [visible]);
  const counts = useMemo(() => {
    const c = Object.fromEntries(FILTERS.map((f) => [f.key, 0])) as Record<Filter, number>;
    for (const l of loans) for (const f of FILTERS) if (matches(l, f.key)) c[f.key]++;
    return c;
  }, [loans]);

  return (
    <CoinRefresh refreshing={refreshing} mode={refreshMode} scrollY={scrollY}>
    <Animated.FlatList
      ref={listRef}
      data={rows}
      onScroll={onScroll}
      scrollEventThrottle={16}
      keyExtractor={(r: Row) => r.key}
      renderItem={({ item }: { item: Row }) =>
        item.kind === 'header' ? (
          <GroupHeader title={item.title} right={item.note} first={item.first} />
        ) : (
          <LoanItem loan={item.loan} onPress={onOpenLoan} first={item.first} last={item.last} />
        )
      }
      contentContainerStyle={[styles.list, { paddingBottom: 100 + bottomInset }]}
      style={{ flex: 1 }}
      refreshControl={<ThemedRefreshControl refreshing={refreshing && refreshMode === 'pull'} onRefresh={onRefresh} />}
      ListHeaderComponent={
        <>
          <SummaryCard summary={summary} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <FilterChips
            value={filter}
            onChange={setFilter}
            chips={FILTERS.filter((f) => f.key !== 'needsYou' || counts.needsYou > 0).map((f) => ({
              key: f.key,
              label: f.label,
              count: counts[f.key],
              alert: f.key === 'overdue',
            }))}
          />
        </>
      }
      ListEmptyComponent={
        loading ? (
          <View style={styles.loading}>
            <CoinSpinner size={36} />
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{filter === 'all' ? 'No loans yet' : 'Nothing here'}</Text>
            <Text style={styles.emptyText}>
              {filter === 'all'
                ? 'Tap "New loan" when you lend or borrow money.'
                : 'No loans match this filter right now.'}
            </Text>
            {filter === 'all' && loans.length === 0 ? (
              <Pressable onPress={onOpenDemo} hitSlop={8} style={styles.demoLink} accessibilityRole="link">
                <Text style={styles.demoText}>
                  Just looking around? <Text style={styles.demoStrong}>Fill it with demo data →</Text>
                </Text>
              </Pressable>
            ) : null}
          </View>
        )
      }
    />
    </CoinRefresh>
  );
}

const useStyles = makeStyles((colors) => ({
  list: { paddingHorizontal: 16, paddingTop: 4 },
  error: { color: colors.danger, fontFamily: fonts.semibold, marginBottom: 12 },
  loading: { alignItems: 'center', paddingVertical: 48 },
  demoLink: { marginTop: 14 },
  demoText: { fontSize: 13.5, fontFamily: fonts.regular, color: colors.muted, textAlign: 'center' },
  demoStrong: { fontFamily: fonts.bold, color: colors.brand },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontFamily: fonts.bold, color: colors.ink },
  emptyText: { color: colors.muted, fontFamily: fonts.regular, marginTop: 6, textAlign: 'center' },
}));
