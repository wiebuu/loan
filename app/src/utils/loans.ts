import { Loan, LoanAction } from '../types';

/** Buttons that mean "the other person is waiting on you". */
const NEEDS_YOU: LoanAction[] = ['accept', 'confirmPaid'];

export function needsMyAction(loan: Loan): boolean {
  return loan.actions.some((a) => NEEDS_YOU.includes(a));
}

/** Still owed: accepted (or personal) and not yet settled. */
export function isOpen(loan: Loan): boolean {
  return loan.status === 'active' || loan.status === 'paid_claimed';
}

/** Needs-you first, then overdue, then open loans by due date, then pending, then settled. */
export function sortLoans(loans: Loan[]): Loan[] {
  const rank = (l: Loan) => {
    if (needsMyAction(l)) return 0;
    if (l.overdue) return 1;
    if (isOpen(l)) return 2;
    if (l.status === 'pending') return 3;
    if (l.status === 'declined') return 4;
    return 5;
  };
  return [...loans].sort((a, b) => {
    const r = rank(a) - rank(b);
    if (r !== 0) return r;
    if (a.status === 'repaid') return (b.repaidAt ?? '').localeCompare(a.repaidAt ?? '');
    return a.dueDate.localeCompare(b.dueDate);
  });
}

/** "You lent @ravi" / "Rahul owes you" style one-liner for the loan. */
export function directionText(loan: Loan): string {
  return loan.role === 'lender' ? `You lent ${loan.counterparty.name}` : `You borrowed from ${loan.counterparty.name}`;
}
