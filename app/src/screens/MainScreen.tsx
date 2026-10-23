import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as api from '../api';
import { AddLoanModal } from '../components/AddLoanModal';
import { Button } from '../components/Button';
import { BellIcon, HomeIcon, PeopleIcon, PlusIcon, UserIcon } from '../components/Icons';
import { Logo } from '../components/Logo';
import { colors, fonts } from '../theme';
import { AppNotification, Loan, NewLoan, Person, Summary, User } from '../types';
import { HomeScreen } from './HomeScreen';
import { LoanDetailModal } from './LoanDetailModal';
import { NotificationsModal } from './NotificationsModal';
import { PeopleScreen } from './PeopleScreen';
import { ProfileScreen } from './ProfileScreen';

type Tab = 'home' | 'people' | 'profile';

/** How often to check for new requests, reminders and payment updates while the app is open. */
const POLL_MS = 15_000;

interface Props {
  user: User;
  onUserChange: (user: User) => void;
  onLogout: () => void;
}

/** The logged-in app: three tabs, plus the sheets that open on top (new loan, loan, notifications). */
export function MainScreen({ user, onUserChange, onLogout }: Props) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('home');
  const [loans, setLoans] = useState<Loan[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [adding, setAdding] = useState(false);
  const [openLoanId, setOpenLoanId] = useState<number | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const showingNotifications = useRef(false);
  showingNotifications.current = showNotifications;

  const load = useCallback(async () => {
    try {
      const [l, s, p, n] = await Promise.all([api.listLoans(), api.getSummary(), api.getPeople(), api.getNotifications()]);
      setLoans(l);
      setSummary(s);
      setPeople(p);
      setNotifications(n.notifications);
      // While the inbox is open, new ones count as seen.
      setUnread(showingNotifications.current ? 0 : n.unread);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your loans');
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load, version]);

  // Check for updates every few seconds while the app is on screen.
  useEffect(() => {
    let timer = setInterval(load, POLL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      clearInterval(timer);
      if (state === 'active') {
        load();
        timer = setInterval(load, POLL_MS);
      }
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [load]);

  const changed = () => setVersion((v) => v + 1);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function addLoan(input: NewLoan) {
    const loan = await api.createLoan(input);
    setAdding(false);
    changed();
    setTab('home');
    // Show what was just created.
    setTimeout(() => setOpenLoanId(loan.id), 450);
  }

  function openNotifications() {
    setShowNotifications(true);
    if (unread > 0) {
      setUnread(0);
      api.markNotificationsRead().catch(() => undefined);
    }
  }

  function openLoanFromNotification(loanId: number) {
    setShowNotifications(false);
    // iOS can't open a sheet while another is closing.
    setTimeout(() => setOpenLoanId(loanId), 450);
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Logo height={32} />
        <Pressable onPress={openNotifications} hitSlop={10} style={styles.bell} accessibilityLabel={`Notifications, ${unread} unread`}>
          <BellIcon color={colors.ink} />
          {unread > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View style={{ flex: 1 }}>
        {tab === 'home' ? (
          <HomeScreen
            loans={loans}
            summary={summary}
            loading={loading}
            refreshing={refreshing}
            error={error}
            bottomInset={0}
            onRefresh={refresh}
            onOpenLoan={(l) => setOpenLoanId(l.id)}
          />
        ) : tab === 'people' ? (
          <PeopleScreen
            people={people}
            loans={loans}
            refreshing={refreshing}
            onRefresh={refresh}
            onOpenLoan={(l) => setOpenLoanId(l.id)}
          />
        ) : (
          <ProfileScreen user={user} version={version} onUserChange={onUserChange} onLogout={onLogout} />
        )}

        {tab !== 'profile' ? (
          <View style={styles.fabWrap}>
            <Button
              title="New loan"
              variant="gold"
              onPress={() => setAdding(true)}
              icon={<PlusIcon size={20} color={colors.ink} />}
              style={styles.fab}
            />
          </View>
        ) : null}
      </View>

      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TabButton label="Loans" active={tab === 'home'} onPress={() => setTab('home')} icon={HomeIcon} />
        <TabButton label="People" active={tab === 'people'} onPress={() => setTab('people')} icon={PeopleIcon} />
        <TabButton label="Profile" active={tab === 'profile'} onPress={() => setTab('profile')} icon={UserIcon} />
      </View>

      <AddLoanModal visible={adding} onClose={() => setAdding(false)} onSubmit={addLoan} />
      <LoanDetailModal loanId={openLoanId} onClose={() => setOpenLoanId(null)} onChanged={changed} />
      <NotificationsModal
        visible={showNotifications}
        notifications={notifications}
        onClose={() => setShowNotifications(false)}
        onOpenLoan={openLoanFromNotification}
      />
    </SafeAreaView>
  );
}

function TabButton({
  label,
  active,
  onPress,
  icon: Icon,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon: (p: { size?: number; color: string }) => React.ReactElement;
}) {
  const color = active ? colors.brand : colors.faint;
  return (
    <Pressable onPress={onPress} style={styles.tabBtn} accessibilityRole="tab" accessibilityState={{ selected: active }}>
      <Icon size={24} color={color} />
      <Text style={[styles.tabLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 10,
    minHeight: 50,
  },
  bell: { padding: 4 },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontFamily: fonts.heavy },
  fabWrap: { position: 'absolute', right: 20, bottom: 16 },
  fab: {
    borderRadius: 999,
    paddingHorizontal: 22,
    shadowColor: '#12261E',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  tabBtn: { flex: 1, alignItems: 'center', gap: 3 },
  tabLabel: { fontSize: 11.5, fontFamily: fonts.bold },
});
