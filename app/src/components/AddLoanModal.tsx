import { ComponentRef, useRef, useState } from 'react';
import { BottomSheet, SheetScrollView } from './BottomSheet';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
} from 'react-native';
import * as api from '../api';
import { fonts, makeStyles, radius, useColors } from '../theme';
import { FoundUser, LoanRole, NewLoan } from '../types';
import { addDays, formatDate } from '../utils/format';
import { InputRef, useFormScroll } from '../utils/formScroll';
import { PickedPhoto, pickReceipt } from '../utils/receipt';
import { LoanFormErrors, validateLoanForm } from '../utils/validation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { CameraIcon, CloseIcon, ImageIcon, SearchIcon } from './Icons';
import { CoinSpinner } from './Refresh';
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
  const insets = useSafeAreaInsets();
  const amountRef = useRef<ComponentRef<typeof TextInput>>(null);
  const searchRef = useRef<InputRef>(null);
  const nameRef = useRef<InputRef>(null);
  const dueRef = useRef<InputRef>(null);
  const form = useFormScroll(['amount', 'person', 'dueDate'] as const);
  const [amountWidth, setAmountWidth] = useState(32);
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
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

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
    setPhoto(null);
    setPhotoError(null);
  }

  async function pick(from: 'library' | 'camera') {
    setPhotoError(null);
    const r = await pickReceipt(from);
    if (r?.error) setPhotoError(r.error);
    else if (r?.photo) setPhoto(r.photo);
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
    if (Object.keys(found_).length > 0) {
      // Take them to the first field that needs fixing, not just a red note somewhere below.
      form.reveal(Object.keys(found_), { amount: amountRef, person: mode === 'user' ? searchRef : nameRef, dueDate: dueRef });
      return;
    }

    setSaving(true);
    setSubmitError(null);
    try {
      await onSubmit({
        role,
        amount: Number(amount),
        dueDate,
        note: note.trim() || undefined,
        ...(mode === 'user' ? { counterpartyUserId: found!.id } : { counterpartyName: name.trim() }),
        ...(role === 'lender' && photo ? { receiptImage: photo.base64 } : {}),
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

  const lending = role === 'lender';

  return (
    <BottomSheet
      visible={visible}
      onClose={close}
      header={
        <View style={styles.header}>
          <Text style={styles.title}>New loan</Text>
          <Pressable onPress={close} hitSlop={10} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
            <CloseIcon size={18} color={colors.muted} />
          </Pressable>
        </View>
      }
    >
      <SheetScrollView ref={form.scrollRef} style={{ flex: 1 }} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Segmented
          value={role}
          onChange={setRole}
          options={[
            { value: 'lender', label: 'I lent' },
            { value: 'borrower', label: 'I borrowed' },
          ]}
        />

        {/* The amount, big and centred: the field is sized to its digits, measured off-screen. */}
        <View style={styles.amountBlock} onLayout={form.at('amount')}>
          <Text style={styles.measure} onLayout={(e) => setAmountWidth(e.nativeEvent.layout.width)} aria-hidden>
            {amount || '0'}
          </Text>
          <Pressable style={styles.amountRow} onPress={() => amountRef.current?.focus()} accessible={false}>
            <Text style={[styles.rupee, !!amount && { color: colors.ink }]}>₹</Text>
            <TextInput
              ref={amountRef}
              value={amount}
              onChangeText={(t) => {
                setAmount(t.replace(/[^0-9.]/g, ''));
                setErrors((e) => ({ ...e, amount: undefined }));
              }}
              placeholder="0"
              placeholderTextColor={colors.faint}
              keyboardType="decimal-pad"
              style={[styles.amountInput, { width: amountWidth + 6 }]}
              accessibilityLabel={lending ? 'Amount you lent' : 'Amount you borrowed'}
            />
          </Pressable>
          <Text style={[styles.amountHint, !!errors.amount && { color: colors.danger }]}>
            {errors.amount ?? (lending ? 'How much you lent' : 'How much you borrowed')}
          </Text>
        </View>

        <Text style={styles.section} onLayout={form.at('person')}>
          {lending ? 'Lent to' : 'Borrowed from'}
        </Text>
        <View style={styles.card}>
          <Segmented
            value={mode}
            onChange={(m) => {
              setMode(m);
              setErrors((e) => ({ ...e, person: undefined }));
            }}
            options={[
              { value: 'user', label: 'Loan user' },
              { value: 'name', label: 'Just a name' },
            ]}
          />
          <View style={{ height: 14 }} />
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
              <>
                <View style={[styles.search, !!errors.person && { borderColor: colors.danger }]}>
                  <SearchIcon size={18} color={colors.faint} />
                  <TextInput
                    ref={searchRef}
                    value={query}
                    onChangeText={(t) => {
                      setQuery(t);
                      setErrors((e) => ({ ...e, person: undefined }));
                    }}
                    placeholder="Username or phone number"
                    placeholderTextColor={colors.faint}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                    onSubmitEditing={findUser}
                    style={styles.searchInput}
                    accessibilityLabel="Username or phone number"
                  />
                  {query.trim() ? (
                    <Pressable onPress={findUser} disabled={searching} style={styles.searchGo} accessibilityRole="button" accessibilityLabel="Find">
                      {searching ? <CoinSpinner size={20} /> : <Text style={styles.searchGoText}>Find</Text>}
                    </Pressable>
                  ) : null}
                </View>
                <Text style={[styles.searchHint, !!errors.person && { color: colors.danger }]}>
                  {errors.person ?? 'Their @username, or the 10-digit number they log in with'}
                </Text>
              </>
            )
          ) : (
            <TextField
              ref={nameRef}
              label="Their name"
              placeholder="e.g. Rahul"
              value={name}
              onChangeText={setName}
              error={errors.person}
              autoCapitalize="words"
              maxLength={60}
            />
          )}
        </View>

        <Text style={styles.section} onLayout={form.at('dueDate')}>
          Due
        </Text>
        <View style={styles.card}>
          <View style={styles.chips}>
            {QUICK_DATES.map((q) => {
              const value = addDays(q.days);
              const active = value === dueDate;
              return (
                <Pressable key={q.label} onPress={() => setDueDate(value)} style={[styles.chip, active && styles.chipActive]}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{q.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <TextField
            ref={dueRef}
            label="Or pick a date"
            placeholder="YYYY-MM-DD"
            value={dueDate}
            onChangeText={setDueDate}
            error={errors.dueDate}
            hint={validDate ? `Due on ${formatDate(dueDate)}` : undefined}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
        </View>

        <Text style={styles.section}>Note</Text>
        <View style={styles.card}>
          <TextField label="What was it for? (optional)" placeholder="e.g. Goa trip" value={note} onChangeText={setNote} maxLength={200} />
        </View>

        {lending ? (
          <>
            <Text style={styles.section}>Proof of payment</Text>
            <View style={[styles.card, { paddingBottom: 12 }]}>
              {photo ? (
                <View style={styles.photoRow}>
                  <Image source={{ uri: photo.uri }} style={styles.photoThumb} resizeMode="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.photoTitle}>Receipt added</Text>
                    <Text style={styles.photoSub}>{mode === 'user' ? `${who} will see it with the loan` : 'Kept with the loan'}</Text>
                  </View>
                  <Pressable onPress={() => setPhoto(null)} hitSlop={8}>
                    <Text style={styles.link}>Remove</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <Text style={styles.photoHint}>Optional. Add the payment screenshot or receipt, so there's proof you sent it.</Text>
                  <View style={styles.photoButtons}>
                    <Pressable onPress={() => pick('library')} style={styles.photoBtn} accessibilityRole="button">
                      <ImageIcon size={18} color={colors.ink} />
                      <Text style={styles.photoBtnText}>Choose photo</Text>
                    </Pressable>
                    {Platform.OS !== 'web' ? (
                      <Pressable onPress={() => pick('camera')} style={styles.photoBtn} accessibilityRole="button">
                        <CameraIcon size={18} color={colors.ink} />
                        <Text style={styles.photoBtnText}>Take photo</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </>
              )}
              {photoError ? <Text style={[styles.searchHint, { color: colors.danger, marginBottom: 0 }]}>{photoError}</Text> : null}
            </View>
          </>
        ) : null}

        <Text style={styles.explainText}>
          {mode === 'user'
            ? `${who} gets a request and has to accept it before it counts.`
            : `Only you can see this. ${who} won't be told.`}
        </Text>
      </SheetScrollView>

      {/* Always in view, just above the keyboard. */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 18 }]}>
        {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}
        <Button title={mode === 'user' ? 'Send request' : 'Save loan'} onPress={save} loading={saving} />
      </View>
    </BottomSheet>
  );
}

const useStyles = makeStyles((colors) => ({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 2,
    paddingBottom: 10,
  },
  title: { fontSize: 22, fontFamily: fonts.heavy, color: colors.ink, letterSpacing: -0.4 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.sunken, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 },
  amountBlock: { alignItems: 'center', paddingTop: 26, paddingBottom: 18 },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  measure: { position: 'absolute', opacity: 0, fontSize: 52, fontFamily: fonts.heavy, letterSpacing: -1.5 },
  rupee: { fontSize: 40, fontFamily: fonts.heavy, color: colors.faint, marginRight: 4 },
  amountInput: {
    maxWidth: 300,
    textAlign: 'center',
    // No browser focus ring in the web preview; the big number is the focus.
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null),
    fontSize: 52,
    fontFamily: fonts.heavy,
    color: colors.ink,
    letterSpacing: -1.5,
    paddingVertical: 0,
  },
  amountHint: { fontSize: 13, fontFamily: fonts.semibold, color: colors.muted, marginTop: 4 },
  section: { fontSize: 13, fontFamily: fonts.bold, color: colors.ink, marginTop: 18, marginBottom: 8, paddingHorizontal: 4 },
  card: { backgroundColor: colors.sunken, borderRadius: radius.lg - 4, padding: 12, paddingBottom: 0 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    paddingLeft: 14,
    paddingRight: 6,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 15.5,
    fontFamily: fonts.semibold,
    color: colors.ink,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null),
  },
  searchGo: {
    height: 40,
    minWidth: 64,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchGoText: { color: colors.onBrand, fontFamily: fonts.bold, fontSize: 14 },
  searchHint: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.muted, marginTop: 8, marginBottom: 14, paddingHorizontal: 2 },
  found: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    marginBottom: 12,
  },
  foundName: { fontSize: 16, fontFamily: fonts.bold, color: colors.ink },
  foundPhone: { fontSize: 13, fontFamily: fonts.regular, color: colors.muted },
  link: { color: colors.brand, fontFamily: fonts.bold, fontSize: 14 },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  chip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.brandSoft, borderColor: colors.brand },
  chipText: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 13.5 },
  chipTextActive: { color: colors.brand, fontFamily: fonts.bold },
  photoHint: { fontSize: 13, fontFamily: fonts.regular, color: colors.muted, lineHeight: 18, marginBottom: 12, paddingHorizontal: 2 },
  photoButtons: { flexDirection: 'row', gap: 8 },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoBtnText: { fontSize: 14, fontFamily: fonts.bold, color: colors.ink },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  photoThumb: { width: 52, height: 52, borderRadius: radius.sm, backgroundColor: colors.card },
  photoTitle: { fontSize: 14.5, fontFamily: fonts.bold, color: colors.ink },
  photoSub: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.muted, marginTop: 2 },
  explainText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, marginTop: 16, paddingHorizontal: 4 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  submitError: { color: colors.danger, fontSize: 13, fontFamily: fonts.semibold, marginBottom: 10 },
}));
