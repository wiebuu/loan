/**
 * Everything the screens need from the backend goes through this file.
 *
 * Step 1 (now): an in-memory mock so the UI can be built and reviewed on its own.
 * Step 2: these same functions will call the Node + PostgreSQL API with fetch(),
 * so the screens will not need to change.
 */
import { Loan, NewLoan, Session, Summary } from '../types';
import { addDays } from '../utils/format';
import { summarize } from '../utils/loans';

const wait = (ms = 400) => new Promise((r) => setTimeout(r, ms));

const pendingOtps = new Map<string, string>();
let nextId = 1;
const newId = () => String(nextId++);

let loans: Loan[] = [
  seed('Rahul', 1500, addDays(-6)),
  seed('Priya', 800, addDays(3)),
  seed('Aman', 2500, addDays(-1)),
  seed('Sneha', 1200, addDays(10)),
  { ...seed('Karan', 600, addDays(-12)), status: 'repaid', repaidAt: new Date().toISOString() },
];

function seed(friendName: string, amount: number, dueDate: string): Loan {
  return {
    id: newId(),
    friendName,
    amount,
    dueDate,
    status: 'pending',
    repaidAt: null,
    createdAt: new Date().toISOString(),
  };
}

export async function requestOtp(phone: string): Promise<void> {
  await wait();
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  pendingOtps.set(phone, otp);
  // The real server will print this in its own log instead.
  console.log(`[mock] OTP for +91${phone}: ${otp}`);
}

export async function verifyOtp(phone: string, otp: string): Promise<Session> {
  await wait();
  if (pendingOtps.get(phone) !== otp) throw new Error('Incorrect OTP');
  pendingOtps.delete(phone);
  return { token: `mock-token-${phone}`, phone };
}

export async function listLoans(): Promise<Loan[]> {
  await wait();
  return loans.map((l) => ({ ...l }));
}

export async function createLoan(input: NewLoan): Promise<Loan> {
  await wait();
  const loan: Loan = {
    id: newId(),
    friendName: input.friendName.trim(),
    amount: input.amount,
    dueDate: input.dueDate,
    status: 'pending',
    repaidAt: null,
    createdAt: new Date().toISOString(),
  };
  loans = [loan, ...loans];
  return { ...loan };
}

export async function markRepaid(id: string): Promise<Loan> {
  await wait();
  const loan = loans.find((l) => l.id === id);
  if (!loan) throw new Error('Entry not found');
  loan.status = 'repaid';
  loan.repaidAt = new Date().toISOString();
  return { ...loan };
}

export async function getSummary(): Promise<Summary> {
  await wait(200);
  return summarize(loans);
}
