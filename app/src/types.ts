export type LoanStatus = 'pending' | 'repaid';

export interface Loan {
  id: string;
  friendName: string;
  /** Amount in rupees. */
  amount: number;
  /** Calendar date in YYYY-MM-DD form. */
  dueDate: string;
  status: LoanStatus;
  repaidAt: string | null;
  createdAt: string;
}

export interface NewLoan {
  friendName: string;
  amount: number;
  dueDate: string;
}

export interface Summary {
  totalLent: number;
  totalRepaid: number;
  overdueAmount: number;
}

export interface Session {
  token: string;
  phone: string;
}
