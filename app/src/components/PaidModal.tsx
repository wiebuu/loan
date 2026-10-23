import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { fonts, makeStyles, radius, useColors } from '../theme';
import { ClaimPaidInput } from '../types';
import { formatMoney } from '../utils/format';
import { Button } from './Button';
import { TextField } from './TextField';

interface Props {
  visible: boolean;
  amount: number;
  /** Who you paid, e.g. "@rahul". */
  to: string;
  onClose: () => void;
  onSubmit: (input: ClaimPaidInput) => Promise<void>;
}

const METHODS = ['UPI', 'Cash', 'Bank transfer', 'Card'];

interface Picked {
  uri: string;
  base64: string;
}

/** The form behind "I've paid it back": how/where you paid, plus an optional receipt photo or link. */
export function PaidModal({ visible, amount, to, onClose, onSubmit }: Props) {
  const styles = useStyles();
  const colors = useColors();
  const [note, setNote] = useState('');
  const [link, setLink] = useState('');
  const [photo, setPhoto] = useState<Picked | null>(null);
  const [errors, setErrors] = useState<{ note?: string; link?: string; photo?: string; submit?: string }>({});
  const [sending, setSending] = useState(false);

  function reset() {
    setNote('');
    setLink('');
    setPhoto(null);
    setErrors({});
  }

  function close() {
    reset();
    onClose();
  }

  async function pick(from: 'library' | 'camera') {
    setErrors((e) => ({ ...e, photo: undefined }));
    if (from === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setErrors((e) => ({ ...e, photo: 'Allow camera access in Settings to take a photo' }));
        return;
      }
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.5, base64: true };
    const result =
      from === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    // On web the picker gives a data: URI instead of a separate base64 string.
    const base64 = asset.base64 ?? (asset.uri.startsWith('data:') ? asset.uri.split(',')[1] : null);
    if (!base64) {
      setErrors((e) => ({ ...e, photo: 'Could not read that photo. Try another one' }));
      return;
    }
    if (base64.length * 0.75 > 5 * 1024 * 1024) {
      setErrors((e) => ({ ...e, photo: 'That photo is too big. Pick one under 5 MB' }));
      return;
    }
    setPhoto({ uri: asset.uri, base64 });
  }

  function addMethod(method: string) {
    setNote((n) => (n.trim() ? n : method));
    setErrors((e) => ({ ...e, note: undefined }));
  }

  async function send() {
    const found: typeof errors = {};
    if (!note.trim()) found.note = 'Say how or where you paid';
    if (link.trim() && !/^https?:\/\/\S+$/i.test(link.trim())) found.link = 'Use a link that starts with http:// or https://';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSending(true);
    try {
      await onSubmit({
        note: note.trim(),
        receiptLink: link.trim() || undefined,
        receiptImage: photo?.base64,
      });
      reset();
    } catch (e) {
      setErrors({ submit: e instanceof Error ? e.message : 'Could not send. Try again' });
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={styles.title}>You paid {to}</Text>
          <Pressable onPress={close} hitSlop={10}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>Paid back</Text>
            <Text style={styles.amount}>{formatMoney(amount)}</Text>
          </View>

          <TextField
            label="How or where did you pay?"
            placeholder="e.g. GPay to their number, cash at college"
            value={note}
            onChangeText={(t) => {
              setNote(t);
              setErrors((e) => ({ ...e, note: undefined }));
            }}
            error={errors.note}
            maxLength={200}
          />
          <View style={styles.chips}>
            {METHODS.map((m) => (
              <Pressable key={m} onPress={() => addMethod(m)} style={[styles.chip, note === m && styles.chipActive]}>
                <Text style={[styles.chipText, note === m && { color: colors.onBrand }]}>{m}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Receipt (optional)</Text>
          {photo ? (
            <View style={styles.preview}>
              <Image source={{ uri: photo.uri }} style={styles.previewImage} resizeMode="cover" />
              <Pressable onPress={() => setPhoto(null)} style={styles.remove} hitSlop={8}>
                <Text style={styles.removeText}>Remove photo</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.photoButtons}>
              <Button title="Choose photo" variant="secondary" onPress={() => pick('library')} style={{ flex: 1 }} />
              {Platform.OS !== 'web' ? (
                <Button title="Take photo" variant="secondary" onPress={() => pick('camera')} style={{ flex: 1 }} />
              ) : null}
            </View>
          )}
          {errors.photo ? <Text style={styles.error}>{errors.photo}</Text> : null}

          <View style={{ height: 16 }} />
          <TextField
            label="Or a link to the receipt"
            placeholder="https://..."
            value={link}
            onChangeText={(t) => {
              setLink(t);
              setErrors((e) => ({ ...e, link: undefined }));
            }}
            error={errors.link}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            maxLength={500}
          />

          <Text style={styles.explain}>
            {to} will see this and confirm once they've got the money.
          </Text>
          {errors.submit ? <Text style={[styles.error, { marginTop: 12 }]}>{errors.submit}</Text> : null}
          <Button title={`Send to ${to}`} variant="gold" onPress={send} loading={sending} style={{ marginTop: 16 }} />
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
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 8,
  },
  title: { flex: 1, fontSize: 22, fontFamily: fonts.heavy, color: colors.ink },
  cancel: { fontSize: 16, color: colors.brand, fontFamily: fonts.bold },
  body: { padding: 20, paddingBottom: 40 },
  amountCard: {
    backgroundColor: colors.goldSoft,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.goldLine,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  amountLabel: { fontSize: 13, fontFamily: fonts.bold, color: colors.goldInk },
  amount: { fontSize: 32, fontFamily: fonts.heavy, color: colors.ink, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -6, marginBottom: 22 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.brandSoft },
  chipActive: { backgroundColor: colors.brand },
  chipText: { color: colors.brand, fontFamily: fonts.bold, fontSize: 13 },
  label: { fontSize: 13, fontFamily: fonts.bold, color: colors.muted, marginBottom: 8, letterSpacing: 0.2 },
  photoButtons: { flexDirection: 'row', gap: 8 },
  preview: { borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  previewImage: { width: '100%', aspectRatio: 4 / 3, backgroundColor: colors.bg },
  remove: { padding: 12, alignItems: 'center', backgroundColor: colors.card },
  removeText: { color: colors.danger, fontFamily: fonts.bold, fontSize: 14 },
  explain: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 19, marginTop: 4 },
  error: { color: colors.danger, fontSize: 13, fontFamily: fonts.semibold, marginTop: 8 },
}));
