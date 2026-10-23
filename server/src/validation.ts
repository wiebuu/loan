import { z } from 'zod';
import { badRequest } from './errors.js';

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number');

export const otpSchema = z.string().trim().regex(/^\d{6}$/, 'OTP is 6 digits');

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z][a-z0-9_]{2,19}$/, 'Use 3-20 letters, numbers or _, starting with a letter');

/** Rupees with at most 2 decimals, converted to whole paise so money is never a float. */
export const amountSchema = z
  .number({ error: 'Enter an amount' })
  .positive('Amount must be more than 0')
  .max(10_000_000, 'That is more than ₹1 crore')
  .refine((n) => Math.abs(Math.round(n * 100) - n * 100) < 1e-6, 'Use at most 2 decimal places')
  .transform((n) => Math.round(n * 100));

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
  .refine((s) => {
    const [y, m, d] = s.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }, 'That date does not exist');

export const createLoanSchema = z
  .object({
    /** From the creator's side: did they lend the money or borrow it? */
    role: z.enum(['lender', 'borrower']),
    amount: amountSchema,
    dueDate: dateSchema,
    note: z.string().trim().max(200).optional(),
    /** Link the loan to another user (by username or phone)... */
    counterpartyUserId: z.number().int().positive().optional(),
    /** ...or just give their name and keep it as a personal reminder. */
    counterpartyName: z.string().trim().min(1, "Enter the person's name").max(60).optional(),
  })
  .refine((v) => !!v.counterpartyUserId !== !!v.counterpartyName, {
    message: 'Pick a Loan user or type a name',
    path: ['counterpartyName'],
  });

/** Parse request input, turning the first validation problem into a 400 with a readable message. */
export function parse<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw badRequest(issue?.message ?? 'Invalid input');
  }
  return result.data;
}
