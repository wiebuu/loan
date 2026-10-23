import { useMemo, useRef } from 'react';
import { FlatList, Text, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { GroupHeader, GroupRow } from '../components/Group';
import { ChevronIcon, LinkIcon } from '../components/Icons';
import { LoanItem } from '../components/LoanItem';
import { Page } from '../components/Page';
import { fonts, makeStyles, useColors } from '../theme';
import { Loan, Person } from '../types';
import { formatMoney } from '../utils/format';
import { isOpen, sortLoans } from '../utils/loans';

/** What a Profile figure opens. */
export type ListKind = 'lent' | 'borrowed' | 'people' | 'overdue';

const TITLES: Record<ListKind, string> = {
  lent: 'You lent',
  borrowed: 'You borrowed',
  people: 'People',
  overdue: 'Overdue to you',
};

type Row =
  | { kind: 'header'; key: string; title: string; note: string; first: boolean }
  | { kind: 'loan'; key: string; loan: Loan; first: boolean; last: boolean }
  | { kind: 'person'; key: string; person: Person; first: boolean; last: boolean };

function loanRows(loans: Loan[]): Row[] {
  const groups = [
    { key: 'open', title: 'Still open', list: loans.filter((l) => isOpen(l) || l.status === 'pending') },
    { key: 'settled', title: 'Settled', list: loans.filter((l) => !(isOpen(l) || l.status === 'pending')) },
  ].filter((g) => g.list.length);
  const rows: Row[] = [];
  groups.forEach((g, gi) => {
    const total = g.list.reduce((sum, l) => sum + l.amount, 0);
    rows.push({ kind: 'header', key: `h-${g.key}`, title: g.title, note: `${g.list.length} · ${formatMoney(total)}`, first: gi === 0 });
    g.list.forEach((loan, i) => rows.push({ kind: 'loan', key: String(loan.id), loan, first: i === 0, last: i === g.list.length - 1 }));
  });
  return rows;
}

interface Props {
  kind: ListKind | null;
  loans: Loan[];
  people: Person[];
  onClose: () => void;
  onOpenLoan: (loan: Loan) => void;
  onOpenPerson: (person: Person) => void;
}

/**
 * The list behind a figure on Profile: every loan you lent, every loan you borrowed, the
 * overdue ones, or everyone you've dealt with. Tap one to open it.
 */
export function ListPage({ kind, loans, people, onClose, onOpenLoan, onOpenPerson }: Props) {
  const styles = useStyles();
  // Keep showing the last list while the page slides away.
  const last = useRef<ListKind>('lent');
  if (kind) last.current = kind;
  const shown = kind ?? last.current;

  const rows = useMemo<Row[]>(() => {
    const sorted = sortLoans(loans.filter((l) => l.status !== 'cancelled'));
    if (shown === 'lent') return loanRows(sorted.filter((l) => l.role === 'lender'));
    if (shown === 'borrowed') return loanRows(sorted.filter((l) => l.role === 'borrower'));
    if (shown === 'overdue') {
      const list = sorted.filter((l) => l.role === 'lender' && l.overdue);
      return list.map((loan, i) => ({ kind: 'loan', key: String(loan.id), loan, first: i === 0, last: i === list.length - 1 }));
    }
    return people.map((person, i) => ({ kind: 'person', key: person.key, person, first: i === 0, last: i === people.length - 1 }));
  }, [shown, loans, people]);

  return (
    <Page visible={kind !== null} onClose={onClose} title={TITLES[shown]}>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        contentContainerStyle={styles.list}
        renderItem={({ item }) =>
          item.kind === 'header' ? (
            <GroupHeader title={item.title} right={item.note} first={item.first} />
          ) : item.kind === 'loan' ? (
            <LoanItem loan={item.loan} first={item.first} last={item.last} onPress={onOpenLoan} />
          ) : (
            <PersonLine person={item.person} first={item.first} last={item.last} onPress={() => onOpenPerson(item.person)} />
          )
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nothing here</Text>
            <Text style={styles.emptyText}>
              {shown === 'overdue' ? 'Nobody is late paying you back.' : 'Loans show up here once you add them.'}
            </Text>
          </View>
        }
      />
    </Page>
  );
}

function PersonLine({ person, first, last, onPress }: { person: Person; first: boolean; last: boolean; onPress: () => void }) {
  const styles = useStyles();
  const colors = useColors();
  const net = person.owesYou - person.youOwe;
  const count = person.timesLent + person.timesBorrowed;
  return (
    <GroupRow first={first} last={last} onPress={onPress} inset={68}>
      <Avatar name={person.name} size={42} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.name} numberOfLines={1}>
            {person.name}
          </Text>
          {person.userId ? <LinkIcon color={colors.faint} size={12} /> : null}
        </View>
        <Text style={styles.meta}>
          {count} loan{count === 1 ? '' : 's'}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.netLabel}>{net === 0 ? 'settled' : net > 0 ? 'owes you' : 'you owe'}</Text>
        {net !== 0 ? (
          <Text style={[styles.net, { color: net > 0 && person.hasOverdue ? colors.danger : colors.ink }]}>{formatMoney(Math.abs(net))}</Text>
        ) : null}
      </View>
      <ChevronIcon color={colors.faint} size={15} />
    </GroupRow>
  );
}

const useStyles = makeStyles((colors) => ({
  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 },
  name: { fontSize: 15.5, fontFamily: fonts.bold, color: colors.ink, flexShrink: 1 },
  meta: { fontSize: 13, fontFamily: fonts.regular, color: colors.muted, marginTop: 3 },
  netLabel: { fontSize: 11, fontFamily: fonts.bold, color: colors.faint },
  net: { fontSize: 15, fontFamily: fonts.bold },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontFamily: fonts.bold, color: colors.ink },
  emptyText: { color: colors.muted, fontFamily: fonts.regular, marginTop: 6, textAlign: 'center' },
}));
