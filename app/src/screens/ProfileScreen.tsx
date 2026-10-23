import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import * as api from '../api';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { LogoutIcon } from '../components/Icons';
import { TextField } from '../components/TextField';
import { colors, fonts, radius } from '../theme';
import { Stats, User } from '../types';
import { formatDate, formatMoney } from '../utils/format';
import { validateUsername } from '../utils/validation';

interface Props {
  user: User;
  /** Bumps whenever loans change, so the numbers reload. */
  version: number;
  onUserChange: (user: User) => void;
  onLogout: () => void;
}

export function ProfileScreen({ user, version, onUserChange, onLogout }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(user.username ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getStats().then(setStats).catch(() => undefined);
  }, [version]);

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

  return (
    <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Avatar name={user.username ?? '?'} size={72} />
        <Text style={styles.username}>@{user.username}</Text>
        <Text style={styles.phone}>+91 {user.phone}</Text>
        <Text style={styles.since}>On Loan since {formatDate(user.createdAt.slice(0, 10))}</Text>

        {editing ? (
          <View style={styles.edit}>
            <TextField
              label="Username"
              prefix="@"
              value={username}
              onChangeText={(t) => setUsername(t.replace(/\s/g, '').toLowerCase())}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
              error={error}
              autoFocus
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
          <Button title="Change username" variant="secondary" onPress={() => setEditing(true)} style={styles.changeBtn} />
        )}
      </View>

      <Text style={styles.section}>Your numbers</Text>
      <View style={styles.grid}>
        <Tile label="Times you lent" value={stats ? String(stats.timesLent) : '—'} />
        <Tile label="Times you borrowed" value={stats ? String(stats.timesBorrowed) : '—'} />
        <Tile label="Total lent" value={stats ? formatMoney(stats.totalLent) : '—'} />
        <Tile label="Got back" value={stats ? formatMoney(stats.totalRepaid) : '—'} />
        <Tile label="Total borrowed" value={stats ? formatMoney(stats.totalBorrowed) : '—'} />
        <Tile label="Paid back" value={stats ? formatMoney(stats.totalPaidBack) : '—'} />
        <Tile label="People" value={stats ? String(stats.people) : '—'} />
        <Tile label="Overdue to you" value={stats ? formatMoney(stats.overdueAmount) : '—'} alert={!!stats?.overdueAmount} />
      </View>

      <Button
        title="Log out"
        variant="danger"
        onPress={onLogout}
        icon={<LogoutIcon size={18} color={colors.danger} />}
        style={{ marginTop: 28 }}
      />
      <Text style={styles.footer}>Your phone number is how you log in. Friends can find you by @{user.username} or your number.</Text>
    </ScrollView>
  );
}

function Tile({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <View style={[styles.tile, alert && { backgroundColor: colors.dangerSoft, borderColor: colors.dangerLine }]}>
      <Text style={[styles.tileValue, alert && { color: colors.danger }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 48 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  username: { fontSize: 24, fontFamily: fonts.heavy, color: colors.ink, marginTop: 12 },
  phone: { fontSize: 15, fontFamily: fonts.semibold, color: colors.muted, marginTop: 2 },
  since: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.faint, marginTop: 6 },
  changeBtn: { marginTop: 18, alignSelf: 'stretch' },
  edit: { alignSelf: 'stretch', marginTop: 18 },
  editButtons: { flexDirection: 'row', gap: 10 },
  section: { fontSize: 15, fontFamily: fonts.heavy, color: colors.ink, marginTop: 24, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileValue: { fontSize: 19, fontFamily: fonts.heavy, color: colors.ink },
  tileLabel: { fontSize: 12, fontFamily: fonts.semibold, color: colors.muted, marginTop: 2 },
  footer: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.faint, textAlign: 'center', marginTop: 14, lineHeight: 18 },
});
