import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as api from '../api';
import { fonts, makeStyles, radius, useColors } from '../theme';
import { FoundUser, LoanRole, NewLoan } from '../types';
import { addDays, formatDate } from '../utils/format';
import { LoanFormErrors, validateLoanForm } from '../utils/validation';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { Segmented } from './Segmented';
import { TextField } from './TextField';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (loan: NewLoan) => Promise<void>;
}

const QUICK_DATES = [
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
];

type PersonMode = 'user' | 'name';

export function AddLoanModal({ visible, onClose, onSubmit }: Props) {
  const styles = useStyles();
  const colors = useColors();
  const [role, setRole] = useState<LoanRole>('lender');
  const [mode, setMode] = useState<PersonMode>('user');
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<FoundUser | null>(null);
  const [searching, setSearching] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(addDays(7));
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<LoanFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() {
    setRole('lender');
    setMode('user');
    setQuery('');
    setFound(null);
    setName('');
    setAmount('');
    setDueDate(addDays(7));
    setNote('');
    setErrors({});
    setSubmitError(null);
  }

  function close() {
    reset();
    onClose();
  }

  async function findUser() {
    const q = query.trim();
    if (!q) return setErrors((e) => ({ ...e, person: 'Type their username or phone number' }));
    setSearching(true);
    setErrors((e) => ({ ...e, person: undefined }));
    try {
      setFound(await api.lookupUser(q));
    } catch (e) {
      setFound(null);
      setErrors((err) => ({ ...err, person: e instanceof Error ? e.message : 'Could not search' }));
    } finally {
      setSearching(false);
    }
  }

  async function save() {
    const found_ = validateLoanForm({ amount, dueDate });
    if (mode === 'user' && !found) found_.person = 'Find the person first, or switch to "Just a name"';
    if (mode === 'name' && !name.trim()) found_.person = "Enter the person's name";
    setErrors(found_);
    if (Object.keys(found_).length > 0) return;

    setSaving(true);
    setSubmitError(null);
    try {
      await onSubmit({
        role,
        amount: Number(amount),
        dueDate,
        note: note.trim() || undefined,
        ...(mode === 'user' ? { counterpartyUserId: found!.id } : { counterpartyName: name.trim() }),
      });
      reset();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Could not save the loan');
    } finally {
      setSaving(false);
    }
  }

  const validDate = !errors.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(dueDate);
  const who = mode === 'user' ? (found ? `@${found.username}` : 'The other person') : name.trim() || 'The other person';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={styles.title}>New loan</Text>
          <Pressable onPress={close} hitSlop={10}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Segmented
            value={role}
            onChange={setRole}
            options={[
              { value: 'lender', label: 'I lent money' },
              { value: 'borrower', label: 'I borrowed money' },
            ]}
          />

          <View style={[styles.amountCard, !!errors.amount && { borderColor: colors.danger }]}>
            <Text style={styles.amountLabel}>{role === 'lender' ? 'Amount you lent' : 'Amount you borrowed'}</Text>
            <View style={styles.amountRow}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput
                value={amount}
                onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
                placeholder="0"
                placeholderTextColor={colors.faint}
                keyboardType="decimal-pad"
                style={styles.amountInput}
              />
            </View>
            {errors.amount ? <Text style={styles.error}>{errors.amount}</Text> : null}
          </View>

          <Text style={styles.label}>{role === 'lender' ? 'Who did you lend to?' : 'Who did you borrow from?'}</Text>
          <Segmented
            value={mode}
            onChange={(m) => {
              setMode(m);
              setErrors((e) => ({ ...e, person: undefined }));
            }}
            options={[
              { value: 'user', label: 'A Loan user' },
              { value: 'name', label: 'Just a name' },
            ]}
          />
          <View style={{ height: 12 }} />

          {mode === 'user' ? (
            found ? (
              <View style={styles.found}>
                <Avatar name={found.username} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.foundName}>@{found.username}</Text>
                  <Text style={styles.foundPhone}>+91 {found.phone}</Text>
                </View>
                <Pressable onPress={() => setFound(null)} hitSlop={8}>
                  <Text style={styles.link}>Change</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.searchRow}>
                <View style={{ flex: 1 }}>
                  <TextField
                    label="Username or phone number"
                    placeholder="@rahul or 9876543210"
                    value={query}
                    onChangeText={setQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                    error={errors.person}
                    onSubmitEditing={findUser}
                    returnKeyType="search"
                  />
                </View>
                <Pressable onPress={findUser} style={styles.findBtn} disabled={searching}>
                  {searching ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.findText}>Find</Text>}
                </Pressable>
              </View>
            )
          ) : (
            <TextField
              label="Their name"
              placeholder="e.g. Rahul"
              value={name}
              onChangeText={setName}
              error={errors.person}
              autoCapitalize="words"
              maxLength={60}
            />
          )}

          <TextField
            label="Due date"
            placeholder="YYYY-MM-DD"
            value={dueDate}
            onChangeText={setDueDate}
            error={errors.dueDate}
            hint={validDate ? `Due on ${formatDate(dueDate)}` : undefined}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
          <View style={styles.chips}>
            {QUICK_DATES.map((q) => {
              const value = addDays(q.days);
              const active = value === dueDate;
              return (
                <Pressable
                  key={q.label}
                  onPress={() => setDueDate(value)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && { color: colors.onBrand }]}>{q.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <TextField label="Note (optional)" placeholder="e.g. Goa trip" value={note} onChangeText={setNote} maxLength={200} />

          <View style={styles.explain}>
            <Text style={styles.explainText}>
              {mode === 'user'
                ? `${who} will get a request and has to accept it before it counts. You can then send reminders, and they can tell you when they've paid.`
                : `This is just for you. ${who} won't be told.`}
            </Text>
          </View>

          {submitError ? <Text style={[styles.error, { marginTop: 12 }]}>{submitError}</Text> : null}
          <Button
            title={mode === 'user' ? 'Send request' : 'Save loan'}
            onPress={save}
            loading={saving}
            style={{ marginTop: 18 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.card },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 8,
  },
  title: { fontSize: 24, fontFamily: fonts.heavy, color: colors.ink },
  cancel: { fontSize: 16, color: colors.brand, fontFamily: fonts.bold },
  body: { padding: 20, paddingBottom: 40 },
  amountCard: {
    backgroundColor: colors.goldSoft,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.goldLine,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginVertical: 20,
  },
  amountLabel: { fontSize: 13, fontFamily: fonts.bold, color: colors.goldInk, letterSpacing: 0.2 },
  amountRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  rupee: { fontSize: 36, fontFamily: fonts.heavy, color: colors.goldInk, marginRight: 6 },
  amountInput: { flex: 1, minWidth: 0, width: '100%', fontSize: 40, fontFamily: fonts.heavy, color: colors.ink, paddingVertical: 2 },
  label: { fontSize: 13, fontFamily: fonts.bold, color: colors.muted, marginBottom: 8, letterSpacing: 0.2 },
  searchRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  findBtn: {
    marginTop: 27,
    height: 54,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  findText: { color: colors.onBrand, fontFamily: fonts.bold, fontSize: 15 },
  found: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
    marginBottom: 18,
  },
  foundName: { fontSize: 16, fontFamily: fonts.bold, color: colors.ink },
  foundPhone: { fontSize: 13, fontFamily: fonts.regular, color: colors.muted },
  link: { color: colors.brand, fontFamily: fonts.bold, fontSize: 14 },
  chips: { flexDirection: 'row', gap: 8, marginTop: -4, marginBottom: 18 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.brandSoft },
  chipActive: { backgroundColor: colors.brand },
  chipText: { color: colors.brand, fontFamily: fonts.bold, fontSize: 13 },
  explain: { backgroundColor: colors.bg, borderRadius: radius.md, padding: 14 },
  explainText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 19 },
  error: { color: colors.danger, fontSize: 13, fontFamily: fonts.semibold, marginTop: 6 },
}));
