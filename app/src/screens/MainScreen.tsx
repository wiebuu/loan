import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as api from '../api';
import { subscribeLive } from '../api/live';
import { AddLoanModal } from '../components/AddLoanModal';
import { Button } from '../components/Button';
import { Header, HeaderButton } from '../components/Header';
import { BellIcon, HomeIcon, PeopleIcon, PlusIcon, UserIcon } from '../components/Icons';
import { LiveBanner } from '../components/LiveBanner';
import { Logo } from '../components/Logo';
import { RefreshMode } from '../components/Refresh';
import { fonts, makeStyles, useColors } from '../theme';
import { AppNotification, Loan, NewLoan, Person, Summary, User } from '../types';
import { HomeScreen } from './HomeScreen';
import { ListKind, ListPage } from './ListPage';
import { LoanDetailModal } from './LoanDetailModal';
import { NotificationsPage } from './NotificationsPage';
import { PeopleScreen } from './PeopleScreen';
import { ProfileScreen } from './ProfileScreen';
import { SettingsPage } from './SettingsPage';

type Tab = 'home' | 'people' | 'profile';

/** How often to check for new requests, reminders and payment updates while the app is open. */
/** A slow safety-net check. Changes normally arrive instantly over the live stream. */
const POLL_MS = 30_000;

interface Props {
  user: User;
  onUserChange: (user: User) => void;
  onLogout: () => void;
}

/** The logged-in app: three tabs, plus the sheets that open on top (new loan, loan, notifications). */
export function MainScreen({ user, onUserChange, onLogout }: Props) {
  const styles = useStyles();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('home');
  const [loans, setLoans] = useState<Loan[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMode, setRefreshMode] = useState<RefreshMode>('pull');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsFocus, setSettingsFocus] = useState<'demo' | null>(null);
  /** Bumps on every manual refresh, so the Profile numbers reload too. */
  const [refreshCount, setRefreshCount] = useState(0);
  const refreshingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [adding, setAdding] = useState(false);
  const [openLoanId, setOpenLoanId] = useState<number | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [banner, setBanner] = useState<AppNotification | null>(null);
  const [listKind, setListKind] = useState<ListKind | null>(null);
  /** A person to open on the People tab (picked from a list on Profile). */
  const [focusPerson, setFocusPerson] = useState<string | null>(null);
  /** Notification ids already seen, so only genuinely new ones pop up as a banner. */
  const knownIds = useRef<Set<number> | null>(null);
  const notificationsOpen = useRef(false);
  notificationsOpen.current = showNotifications;

  const load = useCallback(async () => {
    try {
      const [l, s, p, n] = await Promise.all([api.listLoans(), api.getSummary(), api.getPeople(), api.getNotifications()]);
      setLoans(l);
      setSummary(s);
      setPeople(p);
      setNotifications(n.notifications);
      setUnread(n.unread);
      // Anything new and unread since the last check drops in as a live banner (not on the
      // first load, and not while the notifications page is open: it's right there).
      if (knownIds.current === null) {
        knownIds.current = new Set(n.notifications.map((x) => x.id));
      } else {
        const fresh = n.notifications.filter((x) => !knownIds.current!.has(x.id));
        fresh.forEach((x) => knownIds.current!.add(x.id));
        const newest = fresh.find((x) => !x.read);
        if (newest && !notificationsOpen.current) setBanner(newest);
      }
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

  // Live updates: the server tells us the moment something changes (a request, a reminder,
  // a payment), and we reload. A short pause folds a burst of changes into one reload.
  useEffect(() => {
    let pending: ReturnType<typeof setTimeout> | null = null;
    const stop = subscribeLive(() => {
      if (pending) clearTimeout(pending);
      pending = setTimeout(() => load(), 250);
    });
    return () => {
      if (pending) clearTimeout(pending);
      stop();
    };
  }, [load]);

  const changed = () => setVersion((v) => v + 1);

  async function refresh(mode: RefreshMode = 'pull') {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshMode(mode);
    setRefreshing(true);
    setRefreshCount((c) => c + 1);
    // Keep the coin up long enough to see, even when the server answers instantly.
    await Promise.all([load(), new Promise((r) => setTimeout(r, 900))]);
    refreshingRef.current = false;
    setRefreshing(false);
  }

  /** Tapping a tab opens it. Tapping the tab you're already on reloads it. */
  function openTab(next: Tab) {
    if (next === tab) refresh('tap');
    else setTab(next);
  }

  async function addLoan(input: NewLoan) {
    const loan = await api.createLoan(input);
    setAdding(false);
    changed();
    setTab('home');
    // Show what was just created.
    setTimeout(() => setOpenLoanId(loan.id), 450);
  }

  function markRead(id: number) {
    const n = notifications.find((x) => x.id === id);
    if (!n || n.read) return;
    setNotifications((list) => list.map((x) => (x.id === id ? { ...x, read: true } : x)));
    setUnread((u) => Math.max(0, u - 1));
    api.markNotificationRead(id).catch(() => undefined);
  }

  function markAllRead() {
    setNotifications((list) => list.map((x) => ({ ...x, read: true })));
    setUnread(0);
    api.markNotificationsRead().catch(() => undefined);
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.root} edges={['top']}>
        {tab === 'home' ? (
          <Header
            left={<Logo height={24} />}
            right={
              <Pressable onPress={() => setShowNotifications(true)} hitSlop={6} accessibilityLabel={`Notifications, ${unread} unread`}>
                <HeaderButton>
                  <BellIcon size={25} color={colors.ink} />
                </HeaderButton>
                {unread > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
                  </View>
                ) : null}
              </Pressable>
            }
          />
        ) : tab === 'people' ? (
          <Header title="People" />
        ) : null}

        <View style={{ flex: 1 }}>
          {tab === 'home' ? (
            <HomeScreen
              loans={loans}
              summary={summary}
              loading={loading}
              refreshing={refreshing}
              refreshMode={refreshMode}
              error={error}
              bottomInset={0}
              onRefresh={() => refresh('pull')}
              onOpenLoan={(l) => setOpenLoanId(l.id)}
              onOpenDemo={() => {
                setSettingsFocus('demo');
                setSettingsOpen(true);
              }}
            />
          ) : tab === 'people' ? (
            <PeopleScreen
              people={people}
              loans={loans}
              refreshing={refreshing}
              refreshMode={refreshMode}
              onRefresh={() => refresh('pull')}
              onOpenLoan={(l) => setOpenLoanId(l.id)}
              focusPersonKey={focusPerson}
              onFocusDone={() => setFocusPerson(null)}
            />
          ) : (
            <ProfileScreen
              user={user}
              version={version + refreshCount}
              refreshing={refreshing}
              refreshMode={refreshMode}
              onRefresh={() => refresh('pull')}
              onOpenSettings={() => setSettingsOpen(true)}
            onUserChange={onUserChange}
            onOpenList={setListKind}
            />
          )}

          {tab !== 'profile' ? (
            <View style={styles.fabWrap}>
              <Button
                title="New loan"
                variant="primary"
                onPress={() => setAdding(true)}
                icon={<PlusIcon size={20} color={colors.onBrand} />}
                style={styles.fab}
              />
            </View>
          ) : null}
        </View>

        <View style={[styles.tabBar, { paddingBottom: insets.bottom > 0 ? Math.max(insets.bottom - 12, 6) : 8 }]}>
          <TabButton label="Loans" active={tab === 'home'} onPress={() => openTab('home')} icon={HomeIcon} />
          <TabButton label="People" active={tab === 'people'} onPress={() => openTab('people')} icon={PeopleIcon} />
          <TabButton label="Profile" active={tab === 'profile'} onPress={() => openTab('profile')} icon={UserIcon} />
        </View>

        <AddLoanModal visible={adding} onClose={() => setAdding(false)} onSubmit={addLoan} />
        <LoanDetailModal loanId={openLoanId} onClose={() => setOpenLoanId(null)} onChanged={changed} />
      </SafeAreaView>

      <LiveBanner
        notification={banner}
        onHide={() => setBanner(null)}
        onPress={(n) => {
          markRead(n.id);
          if (n.loanId) setOpenLoanId(n.loanId);
          else setShowNotifications(true);
        }}
      />

      {/* Full pages that slide in over the tabs. */}
      <NotificationsPage
        visible={showNotifications}
        notifications={notifications}
        onClose={() => setShowNotifications(false)}
        onOpenLoan={(id) => setOpenLoanId(id)}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
        refreshing={refreshing}
        refreshMode={refreshMode}
        onRefresh={() => refresh('pull')}
      />
      <ListPage
        kind={listKind}
        loans={loans}
        people={people}
        onClose={() => setListKind(null)}
        onOpenLoan={(l) => setOpenLoanId(l.id)}
        onOpenPerson={(p) => {
          setListKind(null);
          setTab('people');
          setFocusPerson(p.key);
        }}
      />
      <SettingsPage
        visible={settingsOpen}
        user={user}
        onClose={() => {
          setSettingsOpen(false);
          setSettingsFocus(null);
        }}
        onUserChange={onUserChange}
        onLogout={onLogout}
        onDataChanged={changed}
        hasDemo={loans.some((l) => l.isDemo)}
        focus={settingsFocus}
      />
    </View>
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
  const styles = useStyles();
  const colors = useColors();
  return (
    <Pressable onPress={onPress} style={styles.tabBtn} accessibilityRole="tab" accessibilityState={{ selected: active }}>
      <View style={[styles.tabIcon, active && styles.tabIconActive]}>
        <Icon size={22} color={active ? colors.brand : colors.faint} />
      </View>
      <Text style={[styles.tabLabel, { color: active ? colors.ink : colors.faint }]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.bg },
  badge: {
    position: 'absolute',
    top: 3,
    right: 3,
    minWidth: 19,
    height: 19,
    borderRadius: 10,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontFamily: fonts.heavy },
  fabWrap: { position: 'absolute', right: 18, bottom: 18 },
  fab: {
    height: 56,
    borderRadius: 999,
    paddingHorizontal: 22,
    shadowColor: colors.shadow,
    shadowOpacity: colors.scheme === 'dark' ? 0.5 : 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  tabBtn: { flex: 1, alignItems: 'center', gap: 2 },
  tabIcon: { width: 56, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tabIconActive: { backgroundColor: colors.brandSoft },
  tabLabel: { fontSize: 11, fontFamily: fonts.bold },
}));
