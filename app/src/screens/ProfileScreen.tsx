import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as api from '../api';
import { Avatar } from '../components/Avatar';
import { Header, HeaderButton } from '../components/Header';
import { Button } from '../components/Button';
import { ArrowInIcon, ArrowOutIcon, ChevronIcon, ClockIcon, DotsIcon, PencilIcon, PeopleIcon } from '../components/Icons';
import { CoinRefresh, RefreshMode, ThemedRefreshControl, useScrollY } from '../components/Refresh';
import { TextField } from '../components/TextField';
import { fonts, makeStyles, radius, useColors } from '../theme';
import { Stats, User } from '../types';
import { formatDate, formatMoney } from '../utils/format';
import { validateUsername } from '../utils/validation';
import { ListKind } from './ListPage';

interface Props {
  user: User;
  /** Bumps whenever loans change or the user refreshes, so the numbers reload. */
  version: number;
  refreshing: boolean;
  refreshMode: RefreshMode;
  onRefresh: () => void;
  onOpenSettings: () => void;
  onUserChange: (user: User) => void;
  /** Open the list behind one of the figures (the loans you lent, borrowed, ...). */
  onOpenList: (kind: ListKind) => void;
}

export function ProfileScreen({ user, version, refreshing, refreshMode, onRefresh, onOpenSettings, onUserChange, onOpenList }: Props) {
  const styles = useStyles();
  const colors = useColors();
  const [stats, setStats] = useState<Stats | null>(null);
  const { scrollY, onScroll } = useScrollY();
  const scrollRef = useRef<ScrollView>(null);
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(user.username ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setUsername(user.username ?? '');
    setError(null);
    setEditing(true);
  }

  async function save() {
    const invalid = validateUsername(username);
    if (invalid) return setError(invalid);
    if (username === user.username) return setEditing(false);
    setSaving(true);
    setError(null);
    try {
      onUserChange(await api.setUsername(username));
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  // A tap on the Profile tab while here: go back to the top so the coin can be seen.
  useEffect(() => {
    if (refreshing && refreshMode === 'tap') scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [refreshing, refreshMode]);

  useEffect(() => {
    api.getStats().then(setStats).catch(() => undefined);
  }, [version]);

  return (
    <View style={{ flex: 1 }}>
      <Header
        title="Profile"
        right={
          <Pressable onPress={onOpenSettings} hitSlop={8} accessibilityLabel="Settings">
            <HeaderButton>
              <DotsIcon size={26} color={colors.ink} />
            </HeaderButton>
          </Pressable>
        }
      />

      <CoinRefresh refreshing={refreshing} mode={refreshMode} scrollY={scrollY}>
      <Animated.ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={<ThemedRefreshControl refreshing={refreshing && refreshMode === 'pull'} onRefresh={onRefresh} />}
      >
        <View style={styles.card}>
          <View style={styles.idRow}>
            <Avatar name={user.username ?? '?'} size={64} />
            <View style={{ flex: 1, minWidth: 0 }}>
              {editing ? (
                <Text style={styles.username}>Edit username</Text>
              ) : (
                <Pressable onPress={startEdit} hitSlop={8} style={styles.nameRow} accessibilityRole="button" accessibilityLabel="Edit username">
                  <Text style={styles.username} numberOfLines={1}>
                    @{user.username}
                  </Text>
                  <PencilIcon size={16} color={colors.muted} />
                </Pressable>
              )}
              <Text style={styles.phone}>+91 {user.phone}</Text>
              <Text style={styles.since}>On Loan since {formatDate(user.createdAt.slice(0, 10))}</Text>
            </View>
          </View>

          {editing ? (
            <View style={styles.edit}>
              <TextField
                label="Username"
                prefix="@"
                value={username}
                onChangeText={(t) => {
                  setUsername(t.replace(/\s/g, '').toLowerCase());
                  setError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
                error={error}
                hint="3-20 letters, numbers or _, starting with a letter"
                autoFocus
                onSubmitEditing={save}
              />
              <View style={styles.editButtons}>
                <Button title="Cancel" variant="secondary" onPress={() => setEditing(false)} style={{ flex: 1 }} />
                <Button title="Save" onPress={save} loading={saving} style={{ flex: 1 }} />
              </View>
            </View>
          ) : null}
        </View>

        {/* Two headline figures side by side, then the rest as a plain list. */}
        <View style={styles.figures}>
          <Figure label="You lent" value={stats ? formatMoney(stats.totalLent) : '—'} sub={stats ? `${formatMoney(stats.totalRepaid)} back` : ' '} onPress={() => onOpenList('lent')} />
          <View style={styles.vline} />
          <Figure
            right
            label="You borrowed"
            value={stats ? formatMoney(stats.totalBorrowed) : '—'}
            sub={stats ? `${formatMoney(stats.totalPaidBack)} paid back` : ' '}
            onPress={() => onOpenList('borrowed')}
          />
        </View>

        {/* Four figures as softly tinted tiles in a 2 × 2 grid. Each opens its list. */}
        <View style={styles.grid}>
          <View style={styles.gridRow}>
            <Cell tone="lent" icon={ArrowOutIcon} label="Times you lent" value={stats ? String(stats.timesLent) : '—'} onPress={() => onOpenList('lent')} />
            <Cell tone="borrowed" icon={ArrowInIcon} label="Times you borrowed" value={stats ? String(stats.timesBorrowed) : '—'} onPress={() => onOpenList('borrowed')} />
          </View>
          <View style={styles.gridRow}>
            <Cell tone="people" icon={PeopleIcon} label="People" value={stats ? String(stats.people) : '—'} onPress={() => onOpenList('people')} />
            <Cell
              tone={stats?.overdueAmount ? 'overdue' : 'people'}
              icon={ClockIcon}
              label="Overdue to you"
              value={stats ? formatMoney(stats.overdueAmount) : '—'}
              alert={!!stats?.overdueAmount}
              onPress={() => onOpenList('overdue')}
            />
          </View>
        </View>

        <Text style={styles.footer}>
          Your phone number is how you log in. Friends can find you by @{user.username} or your number.
        </Text>
      </Animated.ScrollView>
      </CoinRefresh>
    </View>
  );
}

function Figure({ label, value, sub, onPress, right }: { label: string; value: string; sub: string; onPress: () => void; right?: boolean }) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flex: 1, paddingLeft: right ? 16 : 4 }, pressed && { opacity: 0.6 }]} accessibilityRole="button" accessibilityHint="Shows these loans">
      <View style={styles.figHead}>
        <Text style={styles.figLabel}>{label}</Text>
        <ChevronIcon size={13} color={colors.faint} />
      </View>
      <Text style={styles.figValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.figSub}>{sub}</Text>
    </Pressable>
  );
}

type Tone = 'lent' | 'borrowed' | 'people' | 'overdue';

function Cell({
  icon: Icon,
  label,
  value,
  alert,
  onPress,
  tone,
}: {
  icon: (p: { size?: number; color: string }) => React.ReactElement;
  label: string;
  value: string;
  alert?: boolean;
  onPress: () => void;
  tone: Tone;
}) {
  const styles = useStyles();
  const colors = useColors();
  const look: Record<Tone, { bg: string; fg: string }> = {
    lent: { bg: colors.brandSoft, fg: colors.brand },
    borrowed: { bg: colors.goldSoft, fg: colors.goldInk },
    people: { bg: colors.sunken, fg: colors.muted },
    overdue: { bg: colors.dangerSoft, fg: colors.danger },
  };
  const { bg, fg } = look[tone];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.cell, { backgroundColor: bg }, pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }]}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
    >
      <View style={styles.cellTop}>
        <View style={styles.cellIcon}>
          <Icon size={16} color={fg} />
        </View>
        <ChevronIcon size={14} color={fg} />
      </View>
      <Text style={[styles.cellValue, alert && { color: colors.danger }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.cellLabel}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  body: { padding: 16, paddingTop: 0, paddingBottom: 48 },
  // Who you are, straight on the page: avatar beside your name.
  card: { paddingHorizontal: 4, paddingTop: 4, paddingBottom: 8 },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  username: { fontSize: 22, fontFamily: fonts.heavy, color: colors.ink, letterSpacing: -0.4, flexShrink: 1 },
  phone: { fontSize: 14.5, fontFamily: fonts.semibold, color: colors.muted, marginTop: 2 },
  since: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.faint, marginTop: 2 },
  edit: { alignSelf: 'stretch', marginTop: 18 },
  editButtons: { flexDirection: 'row', gap: 10 },
  figures: {
    flexDirection: 'row',
    marginTop: 22,
    paddingVertical: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  vline: { width: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong },
  figLabel: { fontSize: 12.5, fontFamily: fonts.semibold, color: colors.muted },
  figValue: { fontSize: 26, fontFamily: fonts.heavy, color: colors.ink, letterSpacing: -0.6, marginTop: 2 },
  figSub: { fontSize: 12.5, fontFamily: fonts.semibold, color: colors.brand, marginTop: 2 },
  figHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  grid: { gap: 10, marginTop: 16 },
  gridRow: { flexDirection: 'row', gap: 10 },
  cell: { flex: 1, borderRadius: radius.lg - 4, padding: 14 },
  cellTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cellIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.scheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.85)',
  },
  cellValue: { fontSize: 24, fontFamily: fonts.heavy, color: colors.ink, letterSpacing: -0.5, marginTop: 12 },
  cellLabel: { fontSize: 13, fontFamily: fonts.semibold, color: colors.muted, marginTop: 2 },
  footer: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.faint, textAlign: 'center', marginTop: 20, lineHeight: 18, paddingHorizontal: 12 },
}));
