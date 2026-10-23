import { Router } from 'express';
import { requireAuth, requireUsername } from '../auth.js';
import { badRequest } from '../errors.js';
import { act, createLoan, getLoan, type LoanAction, listLoans, people, summary } from '../loans.js';
import { claimPaidSchema, createLoanSchema, parse } from '../validation.js';

export const loansRouter = Router();
/** Every loan route needs a logged-in user with a username. */
const guard = [requireAuth, requireUsername];

const loanId = (raw: unknown) => {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw badRequest('Bad loan id');
  return id;
};

// GET /loans -> every loan you're part of
loansRouter.get('/loans', ...guard, async (req, res) => {
  res.json({ loans: await listLoans(req.user!.id) });
});

// POST /loans { role, amount, dueDate, note?, counterpartyUserId? | counterpartyName? }
loansRouter.post('/loans', ...guard, async (req, res) => {
  const input = parse(createLoanSchema, req.body);
  res.status(201).json({ loan: await createLoan(req.user!, input) });
});

// GET /loans/:id -> one loan with its history
loansRouter.get('/loans/:id', ...guard, async (req, res) => {
  res.json({ loan: await getLoan(req.user!.id, loanId(req.params.id)) });
});

// The buttons on a loan. Each one is its own endpoint so the URL says what happens.
const ACTIONS: Record<string, LoanAction> = {
  accept: 'accept',
  decline: 'decline',
  cancel: 'cancel',
  remind: 'remind',
  'confirm-paid': 'confirmPaid',
  'reject-paid': 'rejectPaid',
  'mark-repaid': 'markRepaid',
};

for (const [path, action] of Object.entries(ACTIONS)) {
  loansRouter.post(`/loans/:id/${path}`, ...guard, async (req, res) => {
    res.json({ loan: await act(req.user!, loanId(req.params.id), action) });
  });
}

// POST /loans/:id/claim-paid { note, receiptLink?, receiptImage? } -> borrower says they paid
loansRouter.post('/loans/:id/claim-paid', ...guard, async (req, res) => {
  const details = parse(claimPaidSchema, req.body ?? {});
  res.json({ loan: await act(req.user!, loanId(req.params.id), 'claimPaid', details) });
});

// DELETE /loans/:id -> remove a personal loan, or a declined request you made
loansRouter.delete('/loans/:id', ...guard, async (req, res) => {
  await act(req.user!, loanId(req.params.id), 'delete');
  res.json({ ok: true });
});

// GET /summary -> total lent, total repaid, overdue amount (plus the borrowing side)
loansRouter.get('/summary', ...guard, async (req, res) => {
  res.json(await summary(req.user!.id));
});

// GET /people -> everyone you've lent to or borrowed from
loansRouter.get('/people', ...guard, async (req, res) => {
  res.json({ people: await people(req.user!.id) });
});
