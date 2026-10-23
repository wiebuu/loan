import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheet, SheetFlatList } from '../components/BottomSheet';
import { Avatar } from '../components/Avatar';
import { CoinRefresh, RefreshMode, ThemedRefreshControl, useScrollY } from '../components/Refresh';
import { FilterChips } from '../components/FilterChips';
import { GroupHeader, GroupRow } from '../components/Group';
import { ChevronIcon, CloseIcon, LinkIcon } from '../components/Icons';
import { LoanItem } from '../components/LoanItem';
import { fonts, makeStyles, radius, useColors } from '../theme';
import { Loan, Person } from '../types';
import { formatMoney } from '../utils/format';
import { sortLoans } from '../utils/loans';

interface Props {
  people: Person[];
  loans: Loan[];
  refreshing: boolean;
  refreshMode: RefreshMode;
  onRefresh: () => void;
  onOpenLoan: (loan: Loan) => void;
  /** Open this person's sheet straight away (e.g. picked from a list on Profile). */
  focusPersonKey?: string | null;
  onFocusDone?: () => void;
}

/** Everyone you've lent to or borrowed from, how often, and where you stand with them. */
export function PeopleScreen({ people, loans, refreshing, refreshMode, onRefresh, onOpenLoan, focusPersonKey, onFocusDone }: Props) {
  const styles = useStyles();
  const colors = useColors();
  const [openKey, setOpenKey] = useState<string | null>(null);
  useEffect(() => {
    if (!focusPersonKey) return;
    // Let the list page slide away first, then open the person and clear the request.
    const t = setTimeout(() => {
      setOpenKey(focusPersonKey);
      onFocusDone?.();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusPersonKey]);
  const { scrollY, onScroll } = useScrollY();
  const listRef = useRef<FlatList<PeopleRow>>(null);
  const [filter, setFilter] = useState<PeopleFilter>('all');
  const rows = useMemo(() => toPeopleRows(people.filter((p) => inFilter(p, filter))), [people, filter]);
  const counts = useMemo(
    () => ({
      all: people.length,
      'owe-you': people.filter((p) => inFilter(p, 'owe-you')).length,
      'you-owe': people.filter((p) => inFilter(p, 'you-owe')).length,
      settled: people.filter((p) => inFilter(p, 'settled')).length,
    }),
    [people],
  );

  // A tap on the People tab while here: go back to the top so the coin can be seen.
  useEffect(() => {
    if (refreshing && refreshMode === 'tap') listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [refreshing, refreshMode]);
  const open = people.find((p) => p.key === openKey) ?? null;
  // Keep showing the last person while the sheet slides away.
  const lastOpen = useRef<Person | null>(null);
  if (open) lastOpen.current = open;
  const shown = open ?? lastOpen.current;
  const theirLoans = useMemo(() => sortLoans(loans.filter((l) => l.personKey === shown?.key)), [loans, shown?.key]);

  return (
    <View style={{ flex: 1 }}>
      <CoinRefresh refreshing={refreshing} mode={refreshMode} scrollY={scrollY}>
      <Animated.FlatList
        ref={listRef}
        data={rows}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyExtractor={(r: PeopleRow) => r.key}
        contentContainerStyle={styles.list}
        refreshControl={<ThemedRefreshControl refreshing={refreshing && refreshMode === 'pull'} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <>
            <FilterChips<PeopleFilter>
              value={filter}
              onChange={setFilter}
              chips={[
                { key: 'all', label: 'All', count: counts.all },
                { key: 'owe-you', label: 'Owe you', count: counts['owe-you'] },
                { key: 'you-owe', label: 'You owe', count: counts['you-owe'] },
                { key: 'settled', label: 'Settled up', count: counts.settled },
              ]}
            />
          </>
        }
        renderItem={({ item }: { item: PeopleRow }) =>
          item.kind === 'header' ? (
            <GroupHeader title={item.title} right={item.note} first={item.first} />
          ) : (
            <PersonRow person={item.person} first={item.first} last={item.last} onPress={() => setOpenKey(item.person.key)} />
          )
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{people.length ? 'Nobody here' : 'No one yet'}</Text>
            <Text style={styles.emptyText}>
              {people.length ? 'No one matches this filter right now.' : 'People show up here once you add a loan with them.'}
            </Text>
          </View>
        }
      />
      </CoinRefresh>

      <BottomSheet
        visible={!!open}
        onClose={() => setOpenKey(null)}
        background={colors.bg}
        header={
          <View style={styles.sheetHeader}>
            <Pressable onPress={() => setOpenKey(null)} hitSlop={10} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
              <CloseIcon size={18} color={colors.muted} />
            </Pressable>
          </View>
        }
      >
        {shown ? (
          <SheetFlatList
            data={theirLoans}
            keyExtractor={(l: Loan) => String(l.id)}
            contentContainerStyle={[styles.list, { paddingTop: 0, paddingBottom: 40 }]}
            ListHeaderComponent={<PersonHeader person={shown} />}
            renderItem={({ item, index }) => (
              <LoanItem
                loan={item}
                first={index === 0}
                last={index === theirLoans.length - 1}
                onPress={(l) => {
                  // Let this sheet slide away before the loan's sheet comes up.
                  setOpenKey(null);
                  setTimeout(() => onOpenLoan(l), 450);
                }}
              />
            )}
          />
        ) : null}
      </BottomSheet>
    </View>
  );
}

function PersonRow({ person, onPress, first, last }: { person: Person; onPress: () => void; first: boolean; last: boolean }) {
  const styles = useStyles();
  const colors = useColors();
  const count = person.timesLent + person.timesBorrowed;
  const parts = [`${count} loan${count === 1 ? '' : 's'}`];
  if (person.timesLent) parts.push(`lent ${formatMoney(person.totalLent)}`);
  if (person.timesBorrowed) parts.push(`borrowed ${formatMoney(person.totalBorrowed)}`);

  return (
    <GroupRow first={first} last={last} onPress={onPress} inset={68}>
      <Avatar name={person.name} size={42} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {person.name}
          </Text>
          {person.userId ? <LinkIcon color={colors.faint} size={12} /> : null}
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {parts.join(' · ')}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Balance person={person} />
      </View>
      <ChevronIcon color={colors.faint} size={15} />
    </GroupRow>
  );
}

type PeopleRow =
  | { kind: 'header'; key: string; title: string; note: string; first: boolean }
  | { kind: 'person'; key: string; person: Person; first: boolean; last: boolean };

/** People in three groups: they owe you, you owe them, all settled. */
type PeopleFilter = 'all' | 'owe-you' | 'you-owe' | 'settled';
const net = (p: Person) => p.owesYou - p.youOwe;
const inFilter = (p: Person, f: PeopleFilter) =>
  f === 'all' || (f === 'owe-you' ? net(p) > 0 : f === 'you-owe' ? net(p) < 0 : net(p) === 0);

function toPeopleRows(people: Person[]): PeopleRow[] {
  const groups = [
    { key: 'owe-you', title: 'Owe you', list: people.filter((p) => net(p) > 0) },
    { key: 'you-owe', title: 'You owe', list: people.filter((p) => net(p) < 0) },
    { key: 'settled', title: 'Settled up', list: people.filter((p) => net(p) === 0) },
  ].filter((g) => g.list.length);
  const rows: PeopleRow[] = [];
  groups.forEach((g, gi) => {
    const total = g.list.reduce((sum, p) => sum + Math.abs(net(p)), 0);
    rows.push({ kind: 'header', key: `h-${g.key}`, title: g.title, note: total ? formatMoney(total) : `${g.list.length}`, first: gi === 0 });
    g.list.forEach((person, i) => rows.push({ kind: 'person', key: person.key, person, first: i === 0, last: i === g.list.length - 1 }));
  });
  return rows;
}

/** Net position with this person: they owe you, you owe them, or settled. */
function Balance({ person }: { person: Person }) {
  const styles = useStyles();
  const colors = useColors();
  const net = person.owesYou - person.youOwe;
  if (net === 0) return <Text style={[styles.balance, { color: colors.muted }]}>Settled</Text>;
  return (
    <>
      <Text style={styles.balanceLabel}>{net > 0 ? 'owes you' : 'you owe'}</Text>
      <Text style={[styles.balance, { color: net > 0 && person.hasOverdue ? colors.danger : colors.ink }]}>
        {formatMoney(Math.abs(net))}
      </Text>
    </>
  );
}

function PersonHeader({ person }: { person: Person }) {
  const styles = useStyles();
  return (
    <View style={styles.personHead}>
      <Avatar name={person.name} size={64} />
      <Text style={styles.personName}>{person.name}</Text>
      <Text style={styles.personSub}>{person.userId ? 'On Loan' : 'Just a name, only you can see these'}</Text>
      {/* Three figures in a row, split by fine rules. */}
      <View style={styles.figures}>
        <Stat label={`Lent ${person.timesLent}×`} value={formatMoney(person.totalLent)} />
        <View style={styles.vline} />
        <Stat label={`Borrowed ${person.timesBorrowed}×`} value={formatMoney(person.totalBorrowed)} />
        <View style={styles.vline} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Balance person={person} />
        </View>
      </View>
      <Text style={styles.section}>Loans</Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={styles.balanceLabel}>{label}</Text>
      <Text style={[styles.balance, { color: colors.ink }]}>{value}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  list: { padding: 16, paddingTop: 0, paddingBottom: 110 },
  title: { fontSize: 28, fontFamily: fonts.heavy, color: colors.ink },
  subtitle: { fontSize: 14, fontFamily: fonts.regular, color: colors.muted, marginBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 15.5, fontFamily: fonts.bold, color: colors.ink, flexShrink: 1 },
  meta: { fontSize: 13, fontFamily: fonts.regular, color: colors.muted, marginTop: 3 },
  balanceLabel: { fontSize: 11, fontFamily: fonts.bold, color: colors.faint },
  balance: { fontSize: 15, fontFamily: fonts.bold },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontFamily: fonts.bold, color: colors.ink },
  emptyText: { color: colors.muted, fontFamily: fonts.regular, marginTop: 6, textAlign: 'center' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 2, paddingBottom: 6 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.sunken, alignItems: 'center', justifyContent: 'center' },
  personHead: { alignItems: 'center' },
  personName: { fontSize: 24, fontFamily: fonts.heavy, color: colors.ink, marginTop: 10 },
  personSub: { fontSize: 13, fontFamily: fonts.regular, color: colors.muted, marginTop: 2 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18, width: '100%' },
  stat: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { fontSize: 18, fontFamily: fonts.heavy, color: colors.ink },
  statLabel: { fontSize: 12, fontFamily: fonts.semibold, color: colors.muted, marginTop: 2 },
  netCard: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  figures: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginTop: 20,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  vline: { width: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong, marginHorizontal: 12 },
  section: { alignSelf: 'flex-start', fontSize: 15, fontFamily: fonts.heavy, color: colors.ink, marginTop: 22, marginBottom: 10 },
}));
