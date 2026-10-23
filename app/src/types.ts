// Shapes returned by the Loan API (server/src). Amounts are in rupees.

export interface User {
  id: number;
  phone: string;
  username: string | null;
  createdAt: string;
}

export type LoanRole = 'lender' | 'borrower';
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

export interface Loan {
  id: number;
  /** Your side of the loan. */
  role: LoanRole;
  amount: number;
  /** Calendar date in YYYY-MM-DD form. */
  dueDate: string;
  note: string | null;
  status: LoanStatus;
  /** Both people are on Loan (true) or it's a personal reminder (false). */
  linked: boolean;
  createdByMe: boolean;
  counterparty: { userId: number | null; username: string | null; name: string };
  personKey: string;
  overdue: boolean;
  daysPastDue: number;
  createdAt: string;
  acceptedAt: string | null;
  repaidAt: string | null;
  lastReminderAt: string | null;
  canRemindAt: string | null;
  /** The buttons you can press on this loan right now. */
  actions: LoanAction[];
}

export interface LoanEvent {
  id: number;
  type: 'created' | LoanAction;
  createdAt: string;
  byMe: boolean;
  actorUsername: string;
}

export interface LoanDetail extends Loan {
  events: LoanEvent[];
}

export interface NewLoan {
  role: LoanRole;
  amount: number;
  dueDate: string;
  note?: string;
  counterpartyUserId?: number;
  counterpartyName?: string;
}

export interface Summary {
  totalLent: number;
  totalRepaid: number;
  overdueAmount: number;
  toReceive: number;
  totalBorrowed: number;
  totalPaidBack: number;
  toPay: number;
  youOweOverdue: number;
}

export interface Stats extends Summary {
  timesLent: number;
  timesBorrowed: number;
  people: number;
}

export interface Person {
  key: string;
  userId: number | null;
  username: string | null;
  name: string;
  timesLent: number;
  totalLent: number;
  owesYou: number;
  timesBorrowed: number;
  totalBorrowed: number;
  youOwe: number;
  hasOverdue: boolean;
  lastLoanAt: string;
}

export interface AppNotification {
  id: number;
  loanId: number | null;
  type: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface FoundUser {
  id: number;
  username: string;
  phone: string;
}
