import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, fonts, radius } from '../theme';
import { NewLoan } from '../types';
import { addDays, formatDate } from '../utils/format';
import { LoanFormErrors, validateLoanForm } from '../utils/validation';
import { Button } from './Button';
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

export function AddLoanModal({ visible, onClose, onSubmit }: Props) {
  const [friendName, setFriendName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(addDays(7));
  const [errors, setErrors] = useState<LoanFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() {
    setFriendName('');
    setAmount('');
    setDueDate(addDays(7));
    setErrors({});
    setSubmitError(null);
  }

  function close() {
    reset();
    onClose();
  }

  async function save() {
    const found = validateLoanForm({ friendName, amount, dueDate });
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setSubmitError(null);
    try {
      await onSubmit({ friendName: friendName.trim(), amount: Number(amount), dueDate });
      reset();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Could not save the loan');
    } finally {
      setSaving(false);
    }
  }

  const validDate = !errors.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(dueDate);

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
          <View style={[styles.amountCard, !!errors.amount && { borderColor: colors.danger }]}>
            <Text style={styles.amountLabel}>Amount lent</Text>
            <View style={styles.amountRow}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput
                value={amount}
                onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
                placeholder="0"
                placeholderTextColor="#C9D3CD"
                keyboardType="decimal-pad"
                style={styles.amountInput}
                autoFocus
              />
            </View>
            {errors.amount ? <Text style={styles.error}>{errors.amount}</Text> : null}
          </View>

          <TextField
            label="Lent to"
            placeholder="Friend's name"
            value={friendName}
            onChangeText={setFriendName}
            error={errors.friendName}
            autoCapitalize="words"
            maxLength={60}
          />

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
                  <Text style={[styles.chipText, active && { color: '#FFFFFF' }]}>{q.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {submitError ? <Text style={[styles.error, { marginTop: 16 }]}>{submitError}</Text> : null}
          <Button title="Save loan" onPress={save} loading={saving} style={{ marginTop: 28 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  body: { padding: 20 },
  amountCard: {
    backgroundColor: colors.goldSoft,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: '#F3DFAE',
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 22,
  },
  amountLabel: { fontSize: 13, fontFamily: fonts.bold, color: colors.goldInk, letterSpacing: 0.2 },
  amountRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  rupee: { fontSize: 38, fontFamily: fonts.heavy, color: colors.goldInk, marginRight: 6 },
  amountInput: { flex: 1, minWidth: 0, width: '100%', fontSize: 42, fontFamily: fonts.heavy, color: colors.ink, paddingVertical: 4 },
  chips: { flexDirection: 'row', gap: 8, marginTop: -4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
  },
  chipActive: { backgroundColor: colors.brand },
  chipText: { color: colors.brand, fontFamily: fonts.bold, fontSize: 13 },
  error: { color: colors.danger, fontSize: 13, fontFamily: fonts.semibold, marginTop: 6 },
});
