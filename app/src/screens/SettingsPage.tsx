import Constants from 'expo-constants';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as api from '../api';
import { Button } from '../components/Button';
import {
  AutoIcon,
  BellIcon,
  CheckIcon,
  ChevronIcon,
  DocIcon,
  HelpIcon,
  InfoIcon,
  LogoutIcon,
  MoonIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  TrashIcon,
  SearchIcon,
  ShieldIcon,
  SunIcon,
} from '../components/Icons';
import { LogoMark } from '../components/Logo';
import { Page } from '../components/Page';
import { TextField } from '../components/TextField';
import { fonts, makeStyles, radius, ThemePreference, useColors, useTheme } from '../theme';
import { User } from '../types';
import { confirm } from '../utils/confirm';
import { formatDate } from '../utils/format';
import { validateUsername } from '../utils/validation';

type Doc = 'privacy' | 'terms' | 'help';

interface Props {
  visible: boolean;
  user: User;
  onClose: () => void;
  onUserChange: (user: User) => void;
  onLogout: () => void;
  /** Sample loans were added, so lists should reload. */
  onDataChanged: () => void;
  /** Whether your account has the demo loans in it, so only the right option shows. */
  hasDemo: boolean;
  /** Open straight at a section, e.g. 'demo' from the link on an empty Home. */
  focus?: 'demo' | null;
}

const VERSION = Constants.expoConfig?.version ?? '1.0.0';

/**
 * Settings: account, appearance, privacy, help and about. Opened from the ⋯ on Profile.
 * A full page that slides in from the right over the app. Go back with the Back button, a
 * swipe from the left edge, or Android's back button.
 */
export function SettingsPage({ visible, user, onClose, onUserChange, onLogout, onDataChanged, hasDemo, focus }: Props) {
  const styles = useStyles();
  const colors = useColors();

  const { preference, setPreference } = useTheme();
  const [doc, setDoc] = useState<Doc | null>(null);
  // Keep the last article on screen while its page slides away.
  const [shownDoc, setShownDoc] = useState<Doc>('privacy');
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(user.username ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const demoY = useRef(0);
  const flash = useRef(new Animated.Value(0)).current;

  // Opened from the link on an empty Home: once the page has slid in, scroll to Demo data
  // and give it a quick pulse so it's obvious where to tap.
  useEffect(() => {
    if (!visible || focus !== 'demo') return;
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, demoY.current - 12), animated: true });
      Animated.sequence([
        Animated.delay(250),
        Animated.timing(flash, { toValue: 1, duration: 220, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(flash, { toValue: 0, duration: 220, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(flash, { toValue: 1, duration: 220, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(flash, { toValue: 0, duration: 260, useNativeDriver: Platform.OS !== 'web' }),
      ]).start();
    }, 420);
    return () => clearTimeout(t);
  }, [visible, focus, flash]);

  const [demo, setDemo] = useState<{ busy: 'add' | 'remove' | null; message: string | null; ok: boolean }>({
    busy: null,
    message: null,
    ok: false,
  });

  async function addDemo() {
    setDemo({ busy: 'add', message: null, ok: false });
    try {
      const r = await api.addSampleData();
      setDemo({ busy: null, ok: true, message: `Added ${r.loans} demo loans and ${r.notifications} notifications. Have a look on Home.` });
      onDataChanged();
    } catch (e) {
      setDemo({ busy: null, ok: false, message: e instanceof Error ? e.message : 'Could not add the demo data' });
    }
  }

  async function removeDemo() {
    const sure = await confirm(
      'Remove demo data?',
      'This deletes the demo loans and their notifications. Loans you added yourself stay.',
      'Remove',
      true,
    );
    if (!sure) return;
    setDemo({ busy: 'remove', message: null, ok: false });
    try {
      const r = await api.removeSampleData();
      setDemo({
        busy: null,
        ok: true,
        message: r.loans ? `Removed ${r.loans} demo loan${r.loans === 1 ? '' : 's'}.` : 'There was no demo data to remove.',
      });
      onDataChanged();
    } catch (e) {
      setDemo({ busy: null, ok: false, message: e instanceof Error ? e.message : 'Could not remove the demo data' });
    }
  }

  // Start from the top each time it opens.
  useEffect(() => {
    if (visible) {
      setDoc(null);
      setEditing(false);
      setUsername(user.username ?? '');
      setError(null);
    }
  }, [visible, user.username]);

  async function save() {
    const invalid = validateUsername(username);
    if (invalid) return setError(invalid);
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

  async function logout() {
    if (await confirm('Log out?', 'You can log back in any time with your phone number.', 'Log out', true)) {
      onLogout();
    }
  }

  const themes: { value: ThemePreference; label: string; hint: string; icon: ReactNode }[] = [
    { value: 'system', label: 'Automatic', hint: 'Follow your phone', icon: <AutoIcon color={colors.ink} /> },
    { value: 'light', label: 'Light', hint: 'Always light', icon: <SunIcon color={colors.ink} /> },
    { value: 'dark', label: 'Dark', hint: 'Always dark', icon: <MoonIcon color={colors.ink} /> },
  ];

  const openDoc = (d: Doc) => {
    setShownDoc(d);
    setDoc(d);
  };
  const article = DOCS[shownDoc];

  return (
    <>
    <Page visible={visible} onClose={onClose} title="Settings">
          <ScrollView ref={scrollRef} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Section title="Account">
              {editing ? (
                <View style={styles.editBox}>
                  <TextField
                    label="New username"
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
                    <Button
                      title="Cancel"
                      variant="secondary"
                      onPress={() => {
                        setEditing(false);
                        setUsername(user.username ?? '');
                        setError(null);
                      }}
                      style={{ flex: 1 }}
                    />
                    <Button title="Save" onPress={save} loading={saving} style={{ flex: 1 }} />
                  </View>
                </View>
              ) : (
                <Row icon={<PencilIcon color={colors.ink} />} label="Username" value={`@${user.username}`} onPress={() => setEditing(true)} />
              )}
              <Row icon={<PhoneIcon color={colors.ink} />} label="Phone number" value={`+91 ${user.phone}`} sub="You log in with this number" />
              <Row icon={<InfoIcon color={colors.ink} />} label="Member since" value={formatDate(user.createdAt.slice(0, 10))} last />
            </Section>

            <Section title="Appearance">
              {themes.map((t, i) => (
                <Row
                  key={t.value}
                  icon={t.icon}
                  label={t.label}
                  sub={t.hint}
                  onPress={() => setPreference(t.value)}
                  right={preference === t.value ? <CheckIcon size={20} color={colors.brand} /> : <View style={{ width: 20 }} />}
                  last={i === themes.length - 1}
                />
              ))}
            </Section>

            <Section title="Notifications">
              <Row
                icon={<BellIcon size={20} color={colors.ink} />}
                label="In-app notifications"
                sub="Loan requests, reminders and payment updates appear under the bell on Home. They arrive instantly while Loan is open, and drop in as a banner at the top."
                last
              />
            </Section>

            <Section title="Privacy and security">
              <Row
                icon={<SearchIcon color={colors.ink} />}
                label="Who can find you"
                sub={`Anyone on Loan who knows your username (@${user.username}) or your phone number can send you a loan request. Nothing happens until you accept it.`}
              />
              <Row icon={<ShieldIcon color={colors.ink} />} label="Privacy policy" onPress={() => openDoc('privacy')} />
              <Row icon={<DocIcon color={colors.ink} />} label="Terms of use" onPress={() => openDoc('terms')} last />
            </Section>

            <Section title="Help">
              <Row icon={<HelpIcon color={colors.ink} />} label="How Loan works" onPress={() => openDoc('help')} last />
            </Section>

            <View onLayout={(e) => (demoY.current = e.nativeEvent.layout.y)}>
              <Section title="Demo data">
                <Animated.View style={{ opacity: flash.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] }) }}>
                  {/* Only the option that applies: add it when you don't have it, remove it when you do. */}
                  {hasDemo ? (
                    <Row
                      icon={<TrashIcon size={20} color={colors.danger} />}
                      label={demo.busy === 'remove' ? 'Removing demo data…' : 'Remove demo data'}
                      danger
                      sub="Takes the demo loans and their notifications back out. Your own loans stay."
                      onPress={demo.busy ? undefined : removeDemo}
                      last
                    />
                  ) : (
                    <Row
                      icon={<PlusIcon size={20} color={colors.ink} />}
                      label={demo.busy === 'add' ? 'Adding demo data…' : 'Add demo data'}
                      sub="Example loans and notifications (overdue, waiting for you, repaid…) so you can see how everything looks. You can remove them again here."
                      onPress={demo.busy ? undefined : addDemo}
                      last
                    />
                  )}
                </Animated.View>
              </Section>
            </View>
            {demo.message ? (
              <Text style={[styles.demoNote, !demo.ok && { color: colors.danger }]} accessibilityLiveRegion="polite">
                {demo.message}
              </Text>
            ) : null}

            <View style={styles.about}>
              <LogoMark size={28} />
              <Text style={styles.aboutName}>Loan</Text>
              <Text style={styles.aboutVersion}>Version {VERSION}</Text>
            </View>

            <Button title="Log out" variant="danger" onPress={logout} icon={<LogoutIcon size={18} color={colors.danger} />} />
          </ScrollView>
    </Page>

    {/* Privacy, terms and help: their own page on top, so swiping back slides it away. */}
    <Page visible={visible && doc !== null} onClose={() => setDoc(null)} title={article.title}>
      <ScrollView key={shownDoc} contentContainerStyle={styles.article}>
        <Text style={styles.articleTitle}>{article.title}</Text>
        <Text style={styles.articleIntro}>{article.intro}</Text>
        {article.blocks.map((block, i) => (
          <View key={block.heading} style={styles.articleBlock}>
            <Text style={styles.articleNumber}>{String(i + 1).padStart(2, '0')}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.articleHeading}>{block.heading}</Text>
              <Text style={styles.articleText}>{block.text}</Text>
            </View>
          </View>
        ))}
        <Text style={styles.articleFoot}>Loan · Version {VERSION}</Text>
      </ScrollView>
    </Page>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={{ marginBottom: 22 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.group}>{children}</View>
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  sub,
  onPress,
  right,
  last,
  danger,
}: {
  icon: ReactNode;
  label: string;
  danger?: boolean;
  value?: string;
  sub?: string;
  onPress?: () => void;
  right?: ReactNode;
  last?: boolean;
}) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.sunken }]}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <View style={styles.rowIcon}>{icon}</View>
      <View style={[styles.rowMain, !last && styles.rowDivider]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.rowLabel, danger && { color: colors.danger }]}>{label}</Text>
          {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
        </View>
        {value ? (
          <Text style={styles.rowValue} numberOfLines={1}>
            {value}
          </Text>
        ) : null}
        {right ?? (onPress ? <ChevronIcon size={16} color={colors.faint} /> : null)}
      </View>
    </Pressable>
  );
}

const PRIVACY = [
  {
    heading: 'What Loan keeps',
    text: 'Your phone number and username, the loans you add (amount, due date, note and the other person), every step of each loan, your notifications, and any receipt photo or link you attach when you mark a loan as paid.',
  },
  {
    heading: 'Who sees it',
    text: 'A loan you share with another Loan user is visible to both of you, including its history and any receipt. A personal loan, where you only typed a name, is visible to you alone. Your phone number is shown to people who look you up by it.',
  },
  {
    heading: 'How it is protected',
    text: 'Login codes and session tokens are stored only as hashes, so they cannot be read back. Receipt photos are saved under long random names that cannot be guessed. On your phone, your login is kept in the secure Keychain or Keystore.',
  },
  {
    heading: 'What Loan does not do',
    text: 'Loan does not move money, read your contacts or messages, show ads, or sell or share your data with anyone.',
  },
  {
    heading: 'Your choices',
    text: 'You can change your username at any time in Settings. You can remove a personal loan, or a request that was declined, from its loan screen. Logging out removes your login from this device.',
  },
];

const TERMS = [
  {
    heading: 'A record, not a bank',
    text: 'Loan helps you remember money you lent or borrowed. It does not lend, collect or transfer money, and it is not a legal agreement between you and anyone else.',
  },
  {
    heading: 'Be accurate and fair',
    text: 'Only add loans that really happened, and only send requests to people you actually lent to or borrowed from. Do not use reminders to harass anyone.',
  },
  {
    heading: 'Your account',
    text: 'Your phone number is your login. Keep your phone safe, and log out on any device you no longer use.',
  },
  {
    heading: 'No guarantees',
    text: 'Loan is provided as it is. Always settle what is owed directly with the other person.',
  },
];

const HELP = [
  {
    heading: 'Add a loan',
    text: 'Tap "New loan", choose whether you lent or borrowed, and enter the amount and due date. Pick a Loan user to share it with them, or just type a name to keep a private reminder.',
  },
  {
    heading: 'Shared loans',
    text: 'The other person gets a request and has to accept it. After that the lender can send a reminder (at most once an hour), and the borrower can tap "I\'ve paid it back", say how they paid and add a receipt.',
  },
  {
    heading: 'Confirming payment',
    text: 'The lender sees the payment details and taps "Yes, I got the money", or "Not received yet" if it has not arrived.',
  },
  {
    heading: 'Overdue loans',
    text: 'Loans past their due date turn red and show how many days late they are. The Overdue filter on Home lists them all.',
  },
  {
    heading: 'Refreshing',
    text: 'Pull down on any list, or tap a tab in the bottom bar, to load the latest. A flipping coin shows while it updates.',
  },
];

const DOCS: Record<Doc, { title: string; intro: string; blocks: { heading: string; text: string }[] }> = {
  privacy: { title: 'Privacy policy', intro: 'What Loan keeps about you, who can see it, and how it is looked after.', blocks: PRIVACY },
  terms: { title: 'Terms of use', intro: 'The few ground rules for using Loan.', blocks: TERMS },
  help: { title: 'How Loan works', intro: 'Everything you can do in Loan, in five short steps.', blocks: HELP },
};

const useStyles = makeStyles((colors) => ({
  body: { padding: 16, paddingBottom: 48 },
  sectionTitle: {
    fontSize: 12.5,
    fontFamily: fonts.heavy,
    color: colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  group: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'stretch', paddingLeft: 14 },
  rowIcon: { width: 24, paddingTop: 15, alignItems: 'center' },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingLeft: 12, paddingRight: 14 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { fontSize: 15, fontFamily: fonts.bold, color: colors.ink },
  rowSub: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.muted, marginTop: 3, lineHeight: 17 },
  rowValue: { fontSize: 14, fontFamily: fonts.semibold, color: colors.muted, maxWidth: '55%' },
  editBox: { padding: 14, paddingBottom: 0, borderBottomWidth: 1, borderBottomColor: colors.border },
  editButtons: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  demoNote: { fontSize: 13, fontFamily: fonts.semibold, color: colors.brand, marginTop: -12, marginBottom: 22, paddingHorizontal: 4 },
  about: { alignItems: 'center', gap: 6, marginTop: 4, marginBottom: 22 },
  aboutName: { fontSize: 15, fontFamily: fonts.heavy, color: colors.ink, marginTop: 4 },
  aboutVersion: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.faint },
  // Articles: plain reading layout, numbered sections split by fine rules. No boxes.
  article: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 56 },
  articleTitle: { fontSize: 30, fontFamily: fonts.heavy, color: colors.ink, letterSpacing: -0.8 },
  articleIntro: { fontSize: 16, fontFamily: fonts.regular, color: colors.muted, lineHeight: 24, marginTop: 8, marginBottom: 12 },
  articleBlock: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderStrong,
  },
  articleNumber: { fontSize: 13, fontFamily: fonts.heavy, color: colors.brand, marginTop: 2, width: 22 },
  articleHeading: { fontSize: 17, fontFamily: fonts.bold, color: colors.ink, marginBottom: 6 },
  articleText: { fontSize: 15, fontFamily: fonts.regular, color: colors.muted, lineHeight: 23 },
  articleFoot: { fontSize: 12.5, fontFamily: fonts.semibold, color: colors.faint, marginTop: 24 },
}));
