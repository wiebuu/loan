/**
 * Every call the app makes to the Loan API (see server/src/routes).
 * The screens only use these functions, never fetch() directly.
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import {
  AppNotification,
  ClaimPaidInput,
  FoundUser,
  Loan,
  LoanAction,
  LoanDetail,
  NewLoan,
  Person,
  Stats,
  Summary,
  User,
} from '../types';

const API_PORT = 4000;

/**
 * Where the API is. On a phone, "localhost" is the phone itself, so we use the
 * same computer that serves the app to Expo Go (its Wi-Fi address), port 4000.
 * Set EXPO_PUBLIC_API_URL to point somewhere else.
 */
function apiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof location !== 'undefined') return `http://${location.hostname}:${API_PORT}`;
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host ?? 'localhost'}:${API_PORT}`;
}

export const API_URL = apiUrl();

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setToken(value: string | null) {
  token = value;
}

/** Called when the server says the session is over, so the app can go back to Login. */
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(`Can't reach the server at ${API_URL}. Is it running, and is your phone on the same Wi-Fi?`, 0);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized?.();
    throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status);
  }
  return data as T;
}

// Login

/** Sends the OTP. In demo mode the server also returns it so the app can fill it in. */
export const requestOtp = (phone: string) =>
  request<{ sent: true; devOtp?: string }>('POST', '/auth/request-otp', { phone });

export const verifyOtp = (phone: string, otp: string) =>
  request<{ token: string; user: User }>('POST', '/auth/verify-otp', { phone, otp });

export const logout = () => request<{ ok: true }>('POST', '/auth/logout');

// Profile

export const getMe = () => request<{ user: User }>('GET', '/me').then((r) => r.user);
export const setUsername = (username: string) =>
  request<{ user: User }>('PATCH', '/me', { username }).then((r) => r.user);
export const getStats = () => request<Stats>('GET', '/me/stats');
export const lookupUser = (q: string) =>
  request<{ user: FoundUser }>('GET', `/users/lookup?q=${encodeURIComponent(q)}`).then((r) => r.user);

// Loans

export const listLoans = () => request<{ loans: Loan[] }>('GET', '/loans').then((r) => r.loans);
export const getLoan = (id: number) => request<{ loan: LoanDetail }>('GET', `/loans/${id}`).then((r) => r.loan);
export const createLoan = (input: NewLoan) =>
  request<{ loan: Loan }>('POST', '/loans', input).then((r) => r.loan);
export const deleteLoan = (id: number) => request<{ ok: true }>('DELETE', `/loans/${id}`);

/** Full URL for a file the server stores, like a receipt photo. */
export const fileUrl = (path: string) => `${API_URL}${path}`;

/** Borrower says they paid: how/where, plus an optional receipt photo and/or link. */
export const claimPaid = (id: number, input: ClaimPaidInput) =>
  request<{ loan: Loan }>('POST', `/loans/${id}/claim-paid`, input).then((r) => r.loan);

const ACTION_PATHS: Record<Exclude<LoanAction, 'delete' | 'claimPaid'>, string> = {
  accept: 'accept',
  decline: 'decline',
  cancel: 'cancel',
  remind: 'remind',
  confirmPaid: 'confirm-paid',
  rejectPaid: 'reject-paid',
  markRepaid: 'mark-repaid',
};

export const loanAction = (id: number, action: Exclude<LoanAction, 'delete' | 'claimPaid'>) =>
  request<{ loan: Loan }>('POST', `/loans/${id}/${ACTION_PATHS[action]}`).then((r) => r.loan);

export const getSummary = () => request<Summary>('GET', '/summary');
export const getPeople = () => request<{ people: Person[] }>('GET', '/people').then((r) => r.people);

// Notifications

export const getNotifications = () =>
  request<{ notifications: AppNotification[]; unread: number }>('GET', '/notifications');
export const markNotificationsRead = () => request<{ ok: true }>('POST', '/notifications/read');
