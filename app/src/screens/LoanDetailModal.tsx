import { useCallback, useEffect, useState } from 'react';
import { Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as api from '../api';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { CoinSpinner } from '../components/CoinSpinner';
import { LinkIcon, NoteIcon } from '../components/Icons';
import { PaidModal } from '../components/PaidModal';
import { StatusPill, statusInfo } from '../components/StatusPill';
import { fonts, lightColors, makeStyles, radius, useColors } from '../theme';
import { ClaimPaidInput, LoanAction, LoanDetail, LoanEvent, PaymentDetails } from '../types';
import { confirm } from '../utils/confirm';
import { formatDate, formatMoney } from '../utils/format';

interface Props {
  loanId: number | null;
  onClose: () => void;
  /** Something changed (accepted, paid, deleted...), so lists should reload. */
  onChanged: () => void;
}

export function LoanDetailModal({ loanId, onClose, onChanged }: Props) {
  const styles = useStyles();
  const colors = useColors();
  const [loan, setLoan] = useState<LoanDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<LoanAction | null>(null);
  const [paying, setPaying] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (loanId === null) return;
    try {
      setLoan(await api.getLoan(loanId));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this loan');
    }
  }, [loanId]);

  useEffect(() => {
    setLoan(null);
    setError(null);
    load();
  }, [load]);

  async function run(action: LoanAction) {
    if (!loan) return;
    // "I've paid" opens a form for how/where and a receipt instead of a yes/no question.
    if (action === 'claimPaid') return setPaying(true);
    const ok = await askFirst(action, loan);
    if (!ok) return;
    setBusy(action);
    setError(null);
    try {
      if (action === 'delete') {
        await api.deleteLoan(loan.id);
        onChanged();
        onClose();
        return;
      }
      await api.loanAction(loan.id, action as Exclude<LoanAction, 'delete' | 'claimPaid'>);
      await load();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not work. Try again');
    } finally {
      setBusy(null);
    }
  }

  async function submitPaid(input: ClaimPaidInput) {
    if (!loan) return;
    await api.claimPaid(loan.id, input); // errors show inside the form
    setPaying(false);
    await load();
    onChanged();
  }

  return (
    <Modal visible={loanId !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Loan</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.close}>Done</Text>
          </Pressable>
        </View>

        {!loan ? (
          <View style={styles.center}>
            {error ? <Text style={styles.error}>{error}</Text> : <CoinSpinner size={34} />}
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.body}>
            <View style={[styles.hero, loan.overdue && styles.heroOverdue]}>
              <Avatar name={loan.counterparty.name} size={56} />
              <Text style={styles.heroLine}>
                {loan.role === 'lender' ? 'You lent' : 'You borrowed from'}{' '}
                <Text style={styles.heroName}>{loan.counterparty.name}</Text>
              </Text>
              <Text style={[styles.heroAmount, loan.overdue && { color: colors.danger }]}>{formatMoney(loan.amount)}</Text>
              <StatusPill loan={loan} style={{ alignSelf: 'center' }} />
              <Text style={styles.heroHint}>{explain(loan)}</Text>
            </View>

            <View style={styles.facts}>
              <Fact label="Due date" value={formatDate(loan.dueDate)} alert={loan.overdue} />
              <Fact label="Added" value={formatDate(loan.createdAt.slice(0, 10))} />
              {loan.repaidAt ? <Fact label="Repaid" value={formatDate(loan.repaidAt.slice(0, 10))} /> : null}
              <View style={styles.factRow}>
                <Text style={styles.factLabel}>Type</Text>
                <View style={styles.typeValue}>
                  {loan.linked ? <LinkIcon color={colors.brand} /> : <NoteIcon color={colors.muted} />}
                  <Text style={styles.factValue}>{loan.linked ? 'Shared with them' : 'Just for you'}</Text>
                </View>
              </View>
              {loan.note ? <Fact label="Note" value={loan.note} /> : null}
            </View>

            {loan.payment ? (
              <PaymentCard
                payment={loan.payment}
                title={loan.role === 'lender' ? `${loan.counterparty.name} says they paid` : 'What you sent'}
                onViewPhoto={setViewing}
              />
            ) : null}

            {error ? <Text style={[styles.error, { marginBottom: 12 }]}>{error}</Text> : null}
            <Actions loan={loan} busy={busy} onRun={run} />

            {loan.events.length > 0 ? (
              <>
                <Text style={styles.section}>History</Text>
                <View style={styles.timeline}>
                  {loan.events.map((e, i) => (
                    <View key={e.id} style={styles.event}>
                      <View style={styles.dotCol}>
                        <View style={[styles.dot, i === loan.events.length - 1 && styles.dotLast]} />
                        {i < loan.events.length - 1 ? <View style={styles.line} /> : null}
                      </View>
                      <View style={{ flex: 1, paddingBottom: 16 }}>
                        <Text style={styles.eventText}>{eventText(e)}</Text>
                        {e.note ? <Text style={styles.eventNote}>“{e.note}”</Text> : null}
                        {e.receiptImage || e.receiptLink ? (
                          <Text style={styles.eventNote}>
                            {e.receiptImage && e.receiptLink ? 'Added a receipt photo and link' : e.receiptImage ? 'Added a receipt photo' : 'Added a receipt link'}
                          </Text>
                        ) : null}
                        <Text style={styles.eventTime}>{formatWhen(e.createdAt)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </ScrollView>
        )}

        {loan ? (
          <PaidModal
            visible={paying}
            amount={loan.amount}
            to={loan.counterparty.name}
            onClose={() => setPaying(false)}
            onSubmit={submitPaid}
          />
        ) : null}

        <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
          <Pressable style={styles.viewer} onPress={() => setViewing(null)} accessibilityLabel="Close photo">
            {viewing ? <Image source={{ uri: viewing }} style={styles.viewerImage} resizeMode="contain" /> : null}
            <Text style={styles.viewerHint}>Tap anywhere to close</Text>
          </Pressable>
        </Modal>
      </View>
    </Modal>
  );
}

/** How/where they paid, the receipt photo and the receipt link. */
function PaymentCard({
  payment,
  title,
  onViewPhoto,
}: {
  payment: PaymentDetails;
  title: string;
  onViewPhoto: (url: string) => void;
}) {
  const styles = useStyles();
  const colors = useColors();
  const photo = payment.receiptImage ? api.fileUrl(payment.receiptImage) : null;
  return (
    <View style={styles.payment}>
      <Text style={styles.paymentTitle}>{title}</Text>
      {payment.note ? <Text style={styles.paymentNote}>{payment.note}</Text> : null}
      {photo ? (
        <Pressable onPress={() => onViewPhoto(photo)} accessibilityLabel="View receipt photo">
          <Image source={{ uri: photo }} style={styles.receipt} resizeMode="cover" />
          <Text style={styles.receiptHint}>Tap to see the full receipt</Text>
        </Pressable>
      ) : null}
      {payment.receiptLink ? (
        <Pressable onPress={() => Linking.openURL(payment.receiptLink!)} style={styles.linkRow} hitSlop={6}>
          <LinkIcon color={colors.brand} />
          <Text style={styles.linkText} numberOfLines={1}>
            {payment.receiptLink}
          </Text>
        </Pressable>
      ) : null}
      <Text style={styles.paymentWhen}>Sent {formatWhen(payment.claimedAt)}</Text>
    </View>
  );
}

function Actions({ loan, busy, onRun }: { loan: LoanDetail; busy: LoanAction | null; onRun: (a: LoanAction) => void }) {
  const styles = useStyles();
  const has = (a: LoanAction) => loan.actions.includes(a);
  const remindWait = loan.canRemindAt ? Math.max(1, Math.ceil((Date.parse(loan.canRemindAt) - Date.now()) / 60_000)) : 0;

  return (
    <View style={styles.actions}>
      {has('accept') ? <Button title="Accept loan" onPress={() => onRun('accept')} loading={busy === 'accept'} /> : null}
      {has('decline') ? (
        <Button title="Decline" variant="danger" onPress={() => onRun('decline')} loading={busy === 'decline'} />
      ) : null}
      {has('confirmPaid') ? (
        <Button title="Yes, I got the money" onPress={() => onRun('confirmPaid')} loading={busy === 'confirmPaid'} />
      ) : null}
      {has('rejectPaid') ? (
        <Button title="Not received yet" variant="secondary" onPress={() => onRun('rejectPaid')} loading={busy === 'rejectPaid'} />
      ) : null}
      {has('claimPaid') ? (
        <Button title="I've paid it back" variant="gold" onPress={() => onRun('claimPaid')} loading={busy === 'claimPaid'} />
      ) : null}
      {has('remind') ? (
        <Button
          title={remindWait ? `Reminder sent · next in ${remindWait} min` : `Send reminder to ${loan.counterparty.name}`}
          variant="gold"
          onPress={() => onRun('remind')}
          loading={busy === 'remind'}
          disabled={remindWait > 0}
        />
      ) : null}
      {has('markRepaid') ? (
        <Button title="Mark as repaid" variant="secondary" onPress={() => onRun('markRepaid')} loading={busy === 'markRepaid'} />
      ) : null}
      {has('cancel') ? (
        <Button title="Withdraw request" variant="secondary" onPress={() => onRun('cancel')} loading={busy === 'cancel'} />
      ) : null}
      {has('delete') ? (
        <Button title="Delete" variant="danger" onPress={() => onRun('delete')} loading={busy === 'delete'} />
      ) : null}
    </View>
  );
}

function Fact({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View style={styles.factRow}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={[styles.factValue, alert && { color: colors.danger }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function askFirst(action: LoanAction, loan: LoanDetail): Promise<boolean> {
  const amount = formatMoney(loan.amount);
  const other = loan.counterparty.name;
  switch (action) {
    case 'decline':
      return confirm('Decline this loan?', `${other} will be told you declined ${amount}.`, 'Decline', true);
    case 'delete':
      return confirm('Delete this loan?', 'It will be removed for good.', 'Delete', true);
    case 'markRepaid':
      return confirm('Mark as repaid?', `${amount} will be marked as paid back.`, 'Mark repaid');
    case 'confirmPaid':
      return confirm('Got the money?', `This settles the ${amount} loan.`, 'Yes, settle it');
    default:
      return Promise.resolve(true);
  }
}

/** One sentence under the status saying what happens next. */
function explain(loan: LoanDetail): string {
  const other = loan.counterparty.name;
  if (!loan.linked) {
    return loan.status === 'repaid'
      ? 'Settled. This one was just for you.'
      : `Only you can see this. ${other} isn't on Loan or wasn't linked.`;
  }
  switch (loan.status) {
    case 'pending':
      return loan.createdByMe
        ? `${other} needs to accept before it counts.`
        : `${other} added this. Accept it if it's right.`;
    case 'active':
      return loan.role === 'lender'
        ? `You can remind ${other}. They'll tap "I've paid" when they pay you back.`
        : `When you pay ${other} back, tap "I've paid" so they can confirm.`;
    case 'paid_claimed':
      return loan.role === 'lender'
        ? `${other} says they paid. Confirm once you've got it.`
        : `Waiting for ${other} to confirm they got it.`;
    case 'declined':
      return `${other} declined this loan.`;
    case 'repaid':
      return 'Settled. Both of you agreed it was paid back.';
    default:
      return statusInfo(loan, lightColors).label; // only the words, so any palette will do
  }
}

function eventText(e: LoanEvent): string {
  const who = e.byMe ? 'You' : `@${e.actorUsername}`;
  switch (e.type) {
    case 'created':
      return `${who} added this loan`;
    case 'accept':
      return `${who} accepted it`;
    case 'decline':
      return `${who} declined it`;
    case 'cancel':
      return `${who} withdrew the request`;
    case 'remind':
      return `${who} sent a reminder`;
    case 'claimPaid':
      return `${who} said it's paid back`;
    case 'confirmPaid':
      return `${who} confirmed getting the money`;
    case 'rejectPaid':
      return `${who} said the money hasn't arrived`;
    case 'markRepaid':
      return `${who} marked it repaid`;
    default:
      return `${who}: ${e.type}`;
  }
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerTitle: { fontSize: 17, fontFamily: fonts.bold, color: colors.muted },
  close: { fontSize: 16, fontFamily: fonts.bold, color: colors.brand },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  body: { padding: 16, paddingBottom: 48 },
  hero: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroOverdue: { backgroundColor: colors.dangerSoft, borderColor: colors.dangerLine },
  heroLine: { fontSize: 15, fontFamily: fonts.semibold, color: colors.muted, marginTop: 4, textAlign: 'center' },
  heroName: { color: colors.ink, fontFamily: fonts.bold },
  heroAmount: { fontSize: 36, fontFamily: fonts.heavy, color: colors.ink, letterSpacing: -0.5 },
  heroHint: { fontSize: 13.5, fontFamily: fonts.regular, color: colors.muted, textAlign: 'center', lineHeight: 19, marginTop: 4 },
  facts: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  factRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  factLabel: { fontSize: 14, fontFamily: fonts.semibold, color: colors.muted },
  factValue: { fontSize: 14, fontFamily: fonts.bold, color: colors.ink, flexShrink: 1, textAlign: 'right' },
  typeValue: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actions: { gap: 10 },
  section: { fontSize: 15, fontFamily: fonts.heavy, color: colors.ink, marginTop: 28, marginBottom: 12 },
  timeline: { paddingLeft: 4 },
  event: { flexDirection: 'row', gap: 12 },
  dotCol: { alignItems: 'center', width: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.faint, marginTop: 5 },
  dotLast: { backgroundColor: colors.brand },
  line: { flex: 1, width: 2, backgroundColor: colors.border, marginTop: 2 },
  eventText: { fontSize: 14, fontFamily: fonts.semibold, color: colors.ink },
  eventTime: { fontSize: 12, fontFamily: fonts.regular, color: colors.faint, marginTop: 2 },
  eventNote: { fontSize: 13, fontFamily: fonts.regular, color: colors.muted, marginTop: 2 },
  payment: {
    backgroundColor: colors.goldSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.goldLine,
    padding: 16,
    marginBottom: 16,
    gap: 10,
  },
  paymentTitle: { fontSize: 13, fontFamily: fonts.heavy, color: colors.goldInk, letterSpacing: 0.3 },
  paymentNote: { fontSize: 16, fontFamily: fonts.bold, color: colors.ink },
  receipt: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.sm, backgroundColor: colors.card },
  receiptHint: { fontSize: 12, fontFamily: fonts.semibold, color: colors.goldInk, marginTop: 6 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  linkText: { flex: 1, fontSize: 14, fontFamily: fonts.bold, color: colors.brand, textDecorationLine: 'underline' },
  paymentWhen: { fontSize: 12, fontFamily: fonts.regular, color: colors.muted },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  viewerImage: { width: '100%', height: '80%' },
  viewerHint: { color: '#FFFFFF', fontFamily: fonts.semibold, marginTop: 16, opacity: 0.7 },
  error: { color: colors.danger, fontFamily: fonts.semibold, textAlign: 'center' },
}));
