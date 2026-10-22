import { Loan, Summary } from '../types';
import { todayISO } from './format';

/** A loan is overdue when it is still unpaid and its due date is before today. */
export function isOverdue(loan: Loan, today = todayISO()): boolean {
  return loan.status === 'pending' && loan.dueDate < today;
}

export function summarize(loans: Loan[]): Summary {
  const today = todayISO();
  let totalLent = 0;
  let totalRepaid = 0;
  let overdueAmount = 0;
  for (const loan of loans) {
    totalLent += loan.amount;
    if (loan.status === 'repaid') totalRepaid += loan.amount;
    if (isOverdue(loan, today)) overdueAmount += loan.amount;
  }
  return { totalLent, totalRepaid, overdueAmount };
}

/** Overdue first, then upcoming by due date, then repaid (most recent first). */
export function sortLoans(loans: Loan[]): Loan[] {
  const today = todayISO();
  const rank = (l: Loan) => (isOverdue(l, today) ? 0 : l.status === 'pending' ? 1 : 2);
  return [...loans].sort((a, b) => {
    const r = rank(a) - rank(b);
    if (r !== 0) return r;
    if (a.status === 'repaid') return (b.repaidAt ?? '').localeCompare(a.repaidAt ?? '');
    return a.dueDate.localeCompare(b.dueDate);
  });
}
