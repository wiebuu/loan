import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { CoinRefreshControl, CoinSpinner } from '../components/CoinSpinner';
import { ChevronIcon, LinkIcon } from '../components/Icons';
import { LoanItem } from '../components/LoanItem';
import { fonts, makeStyles, radius, useColors } from '../theme';
import { Loan, Person } from '../types';
import { formatMoney } from '../utils/format';
import { sortLoans } from '../utils/loans';

interface Props {
  people: Person[];
  loans: Loan[];
  refreshing: boolean;
  onRefresh: () => void;
  onOpenLoan: (loan: Loan) => void;
}

/** Everyone you've lent to or borrowed from, how often, and where you stand with them. */
export function PeopleScreen({ people, loans, refreshing, onRefresh, onOpenLoan }: Props) {
  const styles = useStyles();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const open = people.find((p) => p.key === openKey) ?? null;
  const theirLoans = useMemo(() => sortLoans(loans.filter((l) => l.personKey === openKey)), [loans, openKey]);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={people}
        keyExtractor={(p) => p.key}
        contentContainerStyle={styles.list}
        refreshControl={<CoinRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <>
            {refreshing ? (
              <View style={styles.refreshing}>
                <CoinSpinner />
              </View>
            ) : null}
            <Text style={styles.title}>People</Text>
            <Text style={styles.subtitle}>Everyone you've lent to or borrowed from.</Text>
          </>
        }
        renderItem={({ item }) => <PersonRow person={item} onPress={() => setOpenKey(item.key)} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No one yet</Text>
            <Text style={styles.emptyText}>People show up here once you add a loan with them.</Text>
          </View>
        }
      />

      <Modal visible={!!open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpenKey(null)}>
        {open ? (
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setOpenKey(null)} hitSlop={10}>
                <Text style={styles.close}>Done</Text>
              </Pressable>
            </View>
            <FlatList
              data={theirLoans}
              keyExtractor={(l) => String(l.id)}
              contentContainerStyle={styles.list}
              ListHeaderComponent={<PersonHeader person={open} />}
              renderItem={({ item }) => (
                <LoanItem
                  loan={item}
                  onPress={(l) => {
                    // iOS can't open a sheet while another is closing, so wait for this one to go.
                    setOpenKey(null);
                    setTimeout(() => onOpenLoan(l), 450);
                  }}
                />
              )}
            />
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

function PersonRow({ person, onPress }: { person: Person; onPress: () => void }) {
  const styles = useStyles();
  const colors = useColors();
  const parts: string[] = [];
  if (person.timesLent) parts.push(`Lent ${person.timesLent}× · ${formatMoney(person.totalLent)}`);
  if (person.timesBorrowed) parts.push(`Borrowed ${person.timesBorrowed}× · ${formatMoney(person.totalBorrowed)}`);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}>
      <Avatar name={person.name} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {person.name}
          </Text>
          {person.userId ? <LinkIcon color={colors.brand} size={13} /> : null}
        </View>
        <Text style={styles.meta} numberOfLines={2}>
          {parts.join('\n')}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Balance person={person} />
      </View>
      <ChevronIcon color={colors.faint} size={16} />
    </Pressable>
  );
}

/** Net position with this person: they owe you, you owe them, or settled. */
function Balance({ person }: { person: Person }) {
  const styles = useStyles();
  const colors = useColors();
  const net = person.owesYou - person.youOwe;
  if (net === 0) return <Text style={[styles.balance, { color: colors.success }]}>Settled</Text>;
  return (
    <>
      <Text style={styles.balanceLabel}>{net > 0 ? 'owes you' : 'you owe'}</Text>
      <Text style={[styles.balance, { color: net > 0 ? (person.hasOverdue ? colors.danger : colors.brand) : colors.goldInk }]}>
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
      <View style={styles.statGrid}>
        <Stat label="Times you lent" value={String(person.timesLent)} />
        <Stat label="Total lent" value={formatMoney(person.totalLent)} />
        <Stat label="Times you borrowed" value={String(person.timesBorrowed)} />
        <Stat label="Total borrowed" value={formatMoney(person.totalBorrowed)} />
      </View>
      <View style={styles.netCard}>
        <Balance person={person} />
      </View>
      <Text style={styles.section}>Loans</Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  list: { padding: 16, paddingBottom: 40 },
  refreshing: { alignItems: 'center', paddingBottom: 12 },
  title: { fontSize: 28, fontFamily: fonts.heavy, color: colors.ink },
  subtitle: { fontSize: 14, fontFamily: fonts.regular, color: colors.muted, marginTop: 4, marginBottom: 16 },
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
  name: { fontSize: 16, fontFamily: fonts.bold, color: colors.ink, flexShrink: 1 },
  meta: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.muted, marginTop: 3, lineHeight: 17 },
  balanceLabel: { fontSize: 11, fontFamily: fonts.bold, color: colors.faint },
  balance: { fontSize: 15, fontFamily: fonts.heavy },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontFamily: fonts.bold, color: colors.ink },
  emptyText: { color: colors.muted, fontFamily: fonts.regular, marginTop: 6, textAlign: 'center' },
  sheet: { flex: 1, backgroundColor: colors.bg },
  sheetHeader: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 20 },
  close: { fontSize: 16, color: colors.brand, fontFamily: fonts.bold },
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
  section: { alignSelf: 'flex-start', fontSize: 15, fontFamily: fonts.heavy, color: colors.ink, marginTop: 22, marginBottom: 10 },
}));
