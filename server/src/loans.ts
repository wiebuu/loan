import type { PoolClient } from 'pg';
import type { User } from './auth.js';
import { config } from './config.js';
import { afterCommit, type Db, pool, transaction } from './db.js';
import { publish } from './events.js';
import { conflict, HttpError, notFound } from './errors.js';
import { formatDay, formatPaise, paiseToRupees } from './money.js';
import { saveReceiptImage } from './uploads.js';
import type { ClaimPaidInput } from './validation.js';

/**
 * Loan statuses:
 *   pending       linked loan waiting for the other person to accept
 *   active        money is owed
 *   paid_claimed  borrower says they paid, lender hasn't confirmed yet
 *   repaid        settled
 *   declined      the other person said no
 *   cancelled     the creator withdrew a pending request (hidden everywhere)
 */
export type LoanStatus = 'pending' | 'active' | 'declined' | 'cancelled' | 'paid_claimed' | 'repaid';

export type LoanAction =
  | 'accept'
  | 'decline'
  | 'cancel'
  | 'remind'
  | 'claimPaid'
  | 'confirmPaid'
  | 'rejectPaid'
  | 'markRepaid'
  | 'delete';

export interface LoanRow {
  id: number;
  created_by: number;
  lender_id: number | null;
  borrower_id: number | null;
  counterparty_name: string | null;
  amount_paise: number;
  due_date: string;
  note: string | null;
  status: LoanStatus;
  /** Added by "Add demo data" (missing until migration 003 has run). */
  is_demo?: boolean;
  created_at: Date;
  accepted_at: Date | null;
  repaid_at: Date | null;
  last_reminder_at: Date | null;
  lender_username: string | null;
  borrower_username: string | null;
  overdue: boolean;
  days_past_due: number;
  claim_note: string | null;
  claim_link: string | null;
  claim_image: string | null;
  claim_at: Date | null;
}

/**
 * Loans with both people's usernames, whether they're overdue (worked out in the database),
 * and the details from the latest "I've paid" (how/where, receipt link, receipt photo).
 */
export const LOAN_SELECT = `
  SELECT l.*,
         lu.username AS lender_username,
         bu.username AS borrower_username,
         (l.status IN ('active', 'paid_claimed') AND l.due_date < CURRENT_DATE) AS overdue,
         (CURRENT_DATE - l.due_date) AS days_past_due,
         pc.note AS claim_note,
         pc.receipt_link AS claim_link,
         pc.receipt_image AS claim_image,
         pc.created_at AS claim_at
  FROM loans l
  LEFT JOIN users lu ON lu.id = l.lender_id
  LEFT JOIN users bu ON bu.id = l.borrower_id
  LEFT JOIN LATERAL (
    SELECT e.note, e.receipt_link, e.receipt_image, e.created_at
    FROM loan_events e
    WHERE e.loan_id = l.id AND e.type = 'claimPaid'
    ORDER BY e.created_at DESC, e.id DESC
    LIMIT 1
  ) pc ON true`;

const isLinked = (l: LoanRow) => l.lender_id !== null && l.borrower_id !== null;
const roleOf = (l: LoanRow, userId: number) => (l.lender_id === userId ? 'lender' : 'borrower');
const otherId = (l: LoanRow, userId: number) => (l.lender_id === userId ? l.borrower_id : l.lender_id);
const otherUsername = (l: LoanRow, userId: number) =>
  l.lender_id === userId ? l.borrower_username : l.lender_username;

/** What this user may do to this loan right now. The app shows a button for each. */
export function allowedActions(l: LoanRow, userId: number): LoanAction[] {
  const isCreator = l.created_by === userId;
  const role = roleOf(l, userId);

  if (!isLinked(l)) {
    // Personal loan: only the creator is involved.
    if (l.status === 'active') return ['markRepaid', 'delete'];
    return ['delete'];
  }

  switch (l.status) {
    case 'pending':
      return isCreator ? ['cancel'] : ['accept', 'decline'];
    case 'active':
      return role === 'lender' ? ['remind', 'markRepaid'] : ['claimPaid'];
    case 'paid_claimed':
      return role === 'lender' ? ['confirmPaid', 'rejectPaid'] : [];
    case 'declined':
      return isCreator ? ['delete'] : [];
    default:
      return [];
  }
}

/** The loan as one user sees it ("you lent" / "you borrowed", who the other person is). */
export function toView(l: LoanRow, userId: number) {
  const linked = isLinked(l);
  const other = otherId(l, userId);
  const reminderReadyAt =
    l.last_reminder_at && new Date(l.last_reminder_at.getTime() + config.reminderCooldownMinutes * 60_000);

  return {
    id: l.id,
    role: roleOf(l, userId),
    amount: paiseToRupees(l.amount_paise),
    dueDate: l.due_date,
    note: l.note,
    status: l.status,
    linked,
    createdByMe: l.created_by === userId,
    counterparty: linked
      ? { userId: other, username: otherUsername(l, userId), name: `@${otherUsername(l, userId)}` }
      : { userId: null, username: null, name: l.counterparty_name! },
    /** Groups loans by person on the People screen. */
    personKey: linked ? `u${other}` : `n${l.counterparty_name!.trim().toLowerCase()}`,
    overdue: l.overdue,
    daysPastDue: l.days_past_due,
    createdAt: l.created_at,
    acceptedAt: l.accepted_at,
    repaidAt: l.repaid_at,
    lastReminderAt: l.last_reminder_at,
    canRemindAt: reminderReadyAt && reminderReadyAt > new Date() ? reminderReadyAt : null,
    /** What the borrower said when they marked it paid. Shown while it's waiting and once it's settled. */
    payment:
      l.claim_at && (l.status === 'paid_claimed' || l.status === 'repaid')
        ? { note: l.claim_note, receiptLink: l.claim_link, receiptImage: l.claim_image, claimedAt: l.claim_at }
        : null,
    actions: allowedActions(l, userId),
    /** Added by "Add demo data", so "Remove demo data" can take it out. */
    isDemo: !!l.is_demo,
  };
}

export type LoanView = ReturnType<typeof toView>;

async function loadLoan(db: Db, id: number, lock = false): Promise<LoanRow | undefined> {
  const sql = `${LOAN_SELECT} WHERE l.id = $1${lock ? ' FOR UPDATE OF l' : ''}`;
  return (await db.query(sql, [id])).rows[0];
}

/** Loans this user is part of. Cancelled ones, and ones the user declined, are left out. */
export async function listLoans(userId: number): Promise<LoanView[]> {
  const rows: LoanRow[] = (
    await pool.query(
      `${LOAN_SELECT}
       WHERE (l.lender_id = $1 OR l.borrower_id = $1)
         AND l.status <> 'cancelled'
         AND NOT (l.status = 'declined' AND l.created_by <> $1)
       ORDER BY l.created_at DESC`,
      [userId],
    )
  ).rows;
  return rows.map((r) => toView(r, userId));
}

export async function getLoan(userId: number, id: number) {
  const row = await loadLoan(pool, id);
  if (!row || (row.lender_id !== userId && row.borrower_id !== userId)) throw notFound('Loan not found');
  const events = (
    await pool.query(
      `SELECT e.id, e.type, e.created_at AS "createdAt", e.actor_id = $2 AS "byMe", u.username AS "actorUsername",
              e.note, e.receipt_link AS "receiptLink", e.receipt_image AS "receiptImage"
       FROM loan_events e JOIN users u ON u.id = e.actor_id
       WHERE e.loan_id = $1 ORDER BY e.created_at, e.id`,
      [id, userId],
    )
  ).rows;
  return { ...toView(row, userId), events };
}

export interface NewLoanInput {
  role: 'lender' | 'borrower';
  amount: number; // paise
  dueDate: string;
  note?: string;
  counterpartyUserId?: number;
  counterpartyName?: string;
  /** Base64 photo of the payment, e.g. the UPI screen, as proof the money went out. */
  receiptImage?: string;
}

export async function createLoan(me: User, input: NewLoanInput): Promise<LoanView> {
  if (input.counterpartyUserId === me.id) throw new HttpError(400, "You can't add a loan with yourself");
  // Checked and saved before the transaction, so a bad photo never leaves a half-made loan.
  const receiptImage = input.receiptImage ? await saveReceiptImage(input.receiptImage) : null;

  return transaction(async (db) => {
    let other: User | undefined;
    if (input.counterpartyUserId) {
      other = (await db.query('SELECT * FROM users WHERE id = $1', [input.counterpartyUserId])).rows[0];
      if (!other?.username) throw notFound('That person is not on Loan');
    }

    const lenderId = input.role === 'lender' ? me.id : (other?.id ?? null);
    const borrowerId = input.role === 'borrower' ? me.id : (other?.id ?? null);
    // A loan with another user waits for them to accept; a personal one is active straight away.
    const status: LoanStatus = other ? 'pending' : 'active';

    const id = (
      await db.query(
        `INSERT INTO loans (created_by, lender_id, borrower_id, counterparty_name, amount_paise, due_date, note, status, accepted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [
          me.id,
          lenderId,
          borrowerId,
          other ? null : input.counterpartyName,
          input.amount,
          input.dueDate,
          input.note || null,
          status,
          other ? null : new Date(),
        ],
      )
    ).rows[0].id as number;

    await addEvent(db, id, me.id, 'created', { receiptImage });
    if (other) {
      const what =
        input.role === 'lender'
          ? `says they lent you ${formatPaise(input.amount)}`
          : `says they borrowed ${formatPaise(input.amount)} from you`;
      await notify(db, other.id, id, 'loan_request', `@${me.username} ${what}, due ${formatDay(input.dueDate)}. Accept it to add it to your loans.`);
    }
    return toView((await loadLoan(db, id))!, me.id);
  });
}

/** Run one of the loan buttons (accept, remind, "I've paid", ...) for this user. */
export async function act(
  me: User,
  loanId: number,
  action: LoanAction,
  details?: ClaimPaidInput,
): Promise<LoanView | null> {
  return transaction(async (db) => {
    const loan = await loadLoan(db, loanId, true);
    if (!loan || (loan.lender_id !== me.id && loan.borrower_id !== me.id)) throw notFound('Loan not found');
    if (!allowedActions(loan, me.id).includes(action)) {
      throw conflict(`This loan can't be ${ACTION_PAST[action]} right now`);
    }

    const other = otherId(loan, me.id);
    const amount = formatPaise(loan.amount_paise);
    const by = `@${me.username}`;
    const tell = (type: string, message: string) => (other ? notify(db, other, loanId, type, message) : undefined);
    const set = (sql: string) => db.query(`UPDATE loans SET ${sql} WHERE id = $1`, [loanId]);
    let extra: EventDetails = {};

    switch (action) {
      case 'accept':
        await set(`status = 'active', accepted_at = now()`);
        await tell('accepted', `${by} accepted the ${amount} loan.`);
        break;
      case 'decline':
        await set(`status = 'declined'`);
        await tell('declined', `${by} declined the ${amount} loan.`);
        break;
      case 'cancel':
        await set(`status = 'cancelled'`);
        await tell('cancelled', `${by} withdrew the ${amount} loan request.`);
        break;
      case 'remind': {
        if (loan.last_reminder_at) {
          const waitMs = loan.last_reminder_at.getTime() + config.reminderCooldownMinutes * 60_000 - Date.now();
          if (waitMs > 0) {
            throw new HttpError(429, `You already sent a reminder. You can send another in ${Math.ceil(waitMs / 60_000)} min`);
          }
        }
        await set(`last_reminder_at = now()`);
        const when = loan.overdue ? `was due ${formatDay(loan.due_date)}` : `due ${formatDay(loan.due_date)}`;
        await tell('reminder', `${by} is reminding you to pay back ${amount} (${when}).`);
        break;
      }
      case 'claimPaid': {
        const note = details?.note ?? null;
        extra = {
          note,
          receiptLink: details?.receiptLink || null,
          receiptImage: details?.receiptImage ? await saveReceiptImage(details.receiptImage) : null,
        };
        await set(`status = 'paid_claimed'`);
        const how = note ? ` (${note})` : '';
        const proof = extra.receiptImage || extra.receiptLink ? ' and added a receipt' : '';
        await tell('paid_claimed', `${by} says they paid back ${amount}${how}${proof}. Confirm once you've got it.`);
        break;
      }
      case 'confirmPaid':
        await set(`status = 'repaid', repaid_at = now()`);
        await tell('paid_confirmed', `${by} confirmed they got your ${amount}. All settled.`);
        break;
      case 'rejectPaid':
        await set(`status = 'active'`);
        await tell('paid_rejected', `${by} says they haven't received your ${amount} yet.`);
        break;
      case 'markRepaid':
        await set(`status = 'repaid', repaid_at = now()`);
        await tell('marked_repaid', `${by} marked your ${amount} loan as repaid.`);
        break;
      case 'delete':
        await db.query('DELETE FROM loans WHERE id = $1', [loanId]);
        return null;
    }

    await addEvent(db, loanId, me.id, action, extra);
    return toView((await loadLoan(db, loanId))!, me.id);
  });
}

const ACTION_PAST: Record<LoanAction, string> = {
  accept: 'accepted',
  decline: 'declined',
  cancel: 'cancelled',
  remind: 'reminded about',
  claimPaid: 'marked as paid',
  confirmPaid: 'confirmed',
  rejectPaid: 'sent back',
  markRepaid: 'marked repaid',
  delete: 'deleted',
};

interface EventDetails {
  note?: string | null;
  receiptLink?: string | null;
  receiptImage?: string | null;
}

async function addEvent(db: PoolClient, loanId: number, actorId: number, type: string, d: EventDetails = {}) {
  await db.query(
    `INSERT INTO loan_events (loan_id, actor_id, type, note, receipt_link, receipt_image)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [loanId, actorId, type, d.note ?? null, d.receiptLink ?? null, d.receiptImage ?? null],
  );
}

async function notify(db: PoolClient, userId: number, loanId: number, type: string, message: string) {
  await db.query('INSERT INTO notifications (user_id, loan_id, type, message) VALUES ($1, $2, $3, $4)', [
    userId,
    loanId,
    type,
    message,
  ]);
  // Let their app know right away, once this is saved.
  afterCommit(db, () => publish(userId));
}

/** Totals for the summary card. Only loans both sides agreed to (or personal ones) count. */
export async function summary(userId: number) {
  const r = (
    await pool.query(
      `SELECT
         COALESCE(SUM(amount_paise) FILTER (WHERE lender_id = $1), 0) AS lent,
         COALESCE(SUM(amount_paise) FILTER (WHERE lender_id = $1 AND status = 'repaid'), 0) AS repaid,
         COALESCE(SUM(amount_paise) FILTER (WHERE lender_id = $1 AND status <> 'repaid' AND due_date < CURRENT_DATE), 0) AS overdue,
         COALESCE(SUM(amount_paise) FILTER (WHERE borrower_id = $1), 0) AS borrowed,
         COALESCE(SUM(amount_paise) FILTER (WHERE borrower_id = $1 AND status = 'repaid'), 0) AS paid_back,
         COALESCE(SUM(amount_paise) FILTER (WHERE borrower_id = $1 AND status <> 'repaid' AND due_date < CURRENT_DATE), 0) AS you_owe_overdue
       FROM loans
       WHERE (lender_id = $1 OR borrower_id = $1) AND status IN ('active', 'paid_claimed', 'repaid')`,
      [userId],
    )
  ).rows[0];
  const n = (k: string) => paiseToRupees(Number(r[k]));
  return {
    totalLent: n('lent'),
    totalRepaid: n('repaid'),
    overdueAmount: n('overdue'),
    toReceive: n('lent') - n('repaid'),
    totalBorrowed: n('borrowed'),
    totalPaidBack: n('paid_back'),
    toPay: n('borrowed') - n('paid_back'),
    youOweOverdue: n('you_owe_overdue'),
  };
}

/** Everyone this user has lent to or borrowed from, with totals and how many times. */
export async function people(userId: number) {
  const rows = (
    await pool.query(
      `WITH mine AS (
         SELECT l.*,
                COALESCE(l.lender_id = $1, false) AS i_lent, -- lender_id is NULL when you borrowed from a typed-in name
                CASE WHEN l.lender_id = $1 THEN l.borrower_id ELSE l.lender_id END AS other_id
         FROM loans l
         WHERE (l.lender_id = $1 OR l.borrower_id = $1) AND l.status IN ('active', 'paid_claimed', 'repaid')
       )
       SELECT
         COALESCE('u' || m.other_id, 'n' || lower(trim(m.counterparty_name))) AS key,
         m.other_id AS "userId",
         MAX(u.username) AS username,
         (ARRAY_AGG(m.counterparty_name ORDER BY m.created_at DESC))[1] AS name,
         COUNT(*) FILTER (WHERE m.i_lent) AS "timesLent",
         COALESCE(SUM(m.amount_paise) FILTER (WHERE m.i_lent), 0) AS lent,
         COALESCE(SUM(m.amount_paise) FILTER (WHERE m.i_lent AND m.status <> 'repaid'), 0) AS owes_you,
         COUNT(*) FILTER (WHERE NOT m.i_lent) AS "timesBorrowed",
         COALESCE(SUM(m.amount_paise) FILTER (WHERE NOT m.i_lent), 0) AS borrowed,
         COALESCE(SUM(m.amount_paise) FILTER (WHERE NOT m.i_lent AND m.status <> 'repaid'), 0) AS you_owe,
         BOOL_OR(m.status <> 'repaid' AND m.due_date < CURRENT_DATE) AS "hasOverdue",
         MAX(m.created_at) AS "lastLoanAt"
       FROM mine m
       LEFT JOIN users u ON u.id = m.other_id
       GROUP BY 1, 2
       ORDER BY "lastLoanAt" DESC`,
      [userId],
    )
  ).rows;

  return rows.map((r) => ({
    key: r.key as string,
    userId: r.userId as number | null,
    username: r.username as string | null,
    name: r.username ? `@${r.username}` : (r.name as string),
    timesLent: Number(r.timesLent),
    totalLent: paiseToRupees(Number(r.lent)),
    owesYou: paiseToRupees(Number(r.owes_you)),
    timesBorrowed: Number(r.timesBorrowed),
    totalBorrowed: paiseToRupees(Number(r.borrowed)),
    youOwe: paiseToRupees(Number(r.you_owe)),
    hasOverdue: r.hasOverdue as boolean,
    lastLoanAt: r.lastLoanAt as Date,
  }));
}
