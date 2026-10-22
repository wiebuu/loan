import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, radius } from '../theme';
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
      setSubmitError(e instanceof Error ? e.message : 'Could not save the entry');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={styles.title}>New entry</Text>
          <Pressable onPress={close} hitSlop={10}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <TextField
            label="Friend's name"
            placeholder="e.g. Rahul"
            value={friendName}
            onChangeText={setFriendName}
            error={errors.friendName}
            autoCapitalize="words"
            maxLength={60}
          />
          <TextField
            label="Amount"
            prefix="₹"
            placeholder="0"
            value={amount}
            onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
            error={errors.amount}
            keyboardType="decimal-pad"
          />
          <TextField
            label="Due date"
            placeholder="YYYY-MM-DD"
            value={dueDate}
            onChangeText={setDueDate}
            error={errors.dueDate}
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
                  <Text style={[styles.chipText, active && { color: '#fff' }]}>{q.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {!errors.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? (
            <Text style={styles.hint}>Due on {formatDate(dueDate)}</Text>
          ) : null}

          {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}
          <Button title="Save entry" onPress={save} loading={saving} style={{ marginTop: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.ink },
  cancel: { fontSize: 16, color: colors.primary, fontWeight: '600' },
  body: { padding: 20 },
  chips: { flexDirection: 'row', gap: 8, marginTop: -6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  hint: { color: colors.muted, fontSize: 13, marginTop: 10 },
  submitError: { color: colors.danger, marginTop: 16 },
});
