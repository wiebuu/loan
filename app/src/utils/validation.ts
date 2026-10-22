import { todayISO } from './format';

export function validatePhone(phone: string): string | null {
  if (!/^[6-9]\d{9}$/.test(phone)) return 'Enter a valid 10-digit mobile number';
  return null;
}

export function validateOtp(otp: string): string | null {
  if (!/^\d{6}$/.test(otp)) return 'OTP is 6 digits';
  return null;
}

export interface LoanFormErrors {
  friendName?: string;
  amount?: string;
  dueDate?: string;
}

export function validateLoanForm(input: {
  friendName: string;
  amount: string;
  dueDate: string;
}): LoanFormErrors {
  const errors: LoanFormErrors = {};

  const name = input.friendName.trim();
  if (!name) errors.friendName = "Enter your friend's name";
  else if (name.length > 60) errors.friendName = 'Keep the name under 60 characters';

  const amount = Number(input.amount);
  if (!input.amount.trim()) errors.amount = 'Enter an amount';
  else if (!/^\d+(\.\d{1,2})?$/.test(input.amount.trim()) || !Number.isFinite(amount))
    errors.amount = 'Use a number like 500 or 499.50';
  else if (amount <= 0) errors.amount = 'Amount must be more than 0';
  else if (amount > 10_000_000) errors.amount = 'That is more than ₹1 crore';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) errors.dueDate = 'Use the format YYYY-MM-DD';
  else if (!isRealDate(input.dueDate)) errors.dueDate = 'That date does not exist';
  else if (input.dueDate < todayISO()) errors.dueDate = 'Due date cannot be in the past';

  return errors;
}

function isRealDate(iso: string): boolean {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}
