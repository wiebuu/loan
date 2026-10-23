# Loan

Track money you've lent to friends, and money you've borrowed. Who owes whom, how much, and when it's due.

```
app/      React Native app (Expo SDK 57, TypeScript)
server/   Node + TypeScript + Express API on PostgreSQL
```

## What it does

- **Login with your phone number** and a 6-digit OTP. The OTP is a mock: the server prints it in its log. In demo mode it also sends it back to the app, which fills it in and logs you in by itself.
- **Pick a username** after your first login. Friends find you by `@username` or by phone number.
- **Add a loan** you lent or borrowed, with an amount, a due date and an optional note. Either:
  - **link it to another Loan user.** They get a request and have to **accept** it before it counts (or decline it). Then:
    - the lender can **send a reminder** (at most once an hour per loan),
    - the borrower taps **"I've paid it back"**,
    - the lender **confirms** ("Yes, I got the money") or says **"Not received yet"**,
    - the lender can also just mark it repaid.
  - or **keep it personal**: just type the person's name. It's a reminder only you can see. It's active right away and you mark it repaid yourself.
- **Summary card:** still to get back, total lent, total repaid, overdue amount, and what you owe others.
- **Overdue loans are highlighted** (red card, red stripe, "N days late"). Loans waiting on you are outlined and get their own "Needs you" filter.
- **People:** everyone you've lent to or borrowed from, how many times, the totals, and who owes whom now.
- **Profile:** your username (you can change it), phone number, and your numbers (times lent and borrowed, totals).
- **Notifications:** loan requests, reminders and payment updates. The app checks for new ones every 15 seconds.
- **History:** every step of every loan is saved, and shown on the loan's screen.

## Run it on a Mac

You need **Node 20+**, **PostgreSQL**, and the **Expo Go** app on your phone (on the same Wi-Fi as the Mac).

### 1. Create the database

```bash
createdb loan
```

If `createdb` isn't found:
- **Postgres.app:** use the full path, `/Applications/Postgres.app/Contents/Versions/latest/bin/createdb loan`.
- **Homebrew:** run `brew services start postgresql@16` first.

### 2. Start the API (terminal 1)

```bash
cd server
npm install
cp .env.example .env
npm run seed      # creates the tables and three demo users
npm run dev
```

`.env` starts with `DATABASE_URL=postgres://localhost:5432/loan`, which works for Homebrew and Postgres.app. If you installed Postgres with the EnterpriseDB installer, it has a `postgres` user with the password you chose. In that case use `postgres://postgres:YOUR_PASSWORD@localhost:5432/loan`.

The server prints its address, including the one your phone will use (`on your network: http://192.168.x.x:4000`). OTP codes appear in this terminal as `[otp] +919876543210 -> 482913`.

### 3. Start the app (terminal 2)

```bash
cd app
npm install
npx expo start
```

Scan the QR code with Expo Go. The app talks to the API on the same computer as the Expo server, on port 4000. Set `EXPO_PUBLIC_API_URL` to point it somewhere else.

If the phone says it can't reach the server, check two things: the phone and the Mac are on the same Wi-Fi, and macOS allowed incoming connections for `node` (System Settings → Network → Firewall).

### Try the two-person flow

The seed script creates three users you can log in as. Their OTP fills in by itself too.

| Username | Phone      |
| -------- | ---------- |
| @rahul   | 9000011111 |
| @priya   | 9000022222 |
| @aman    | 9000033333 |

1. Log in on your phone with your own number and pick a username.
2. Press `w` in the Expo terminal to open the app in a browser, and log in there as `9000011111` (@rahul).
3. On the phone, add a loan: *I lent money*, *A Loan user*, find `rahul`, then *Send request*.
4. In the browser, open the bell and tap the request, then *Accept loan*.
5. On the phone, open the loan and tap *Send reminder*. In the browser, tap *I've paid it back*. On the phone, tap *Yes, I got the money*.

### Tests

The API tests run against a separate database that they wipe each time:

```bash
createdb loan_test
cd server
TEST_DATABASE_URL=postgres://localhost:5432/loan_test npm test
```

They cover OTP login, usernames, personal loans, the full request → accept → remind → "I've paid" → confirm flow, who is allowed to press which button, the summary and People totals, and input validation.

## How it's built

### Database (`server/migrations/001_init.sql`)

| Table           | What's in it |
| --------------- | ------------ |
| `users`         | phone (unique; it's how you log in), username (unique, lowercase) |
| `otp_codes`     | one pending code per phone, **stored as a hash**, with expiry and attempt count |
| `sessions`      | login tokens, **stored as a hash** |
| `loans`         | `lender_id`, `borrower_id`, `created_by`, `amount_paise`, `due_date`, `status`, timestamps. For a personal loan one side is `NULL` and `counterparty_name` holds the name. |
| `loan_events`   | every action on a loan (created, accept, remind, claimPaid, confirmPaid, ...). This is the history. |
| `notifications` | the in-app inbox |

Money is stored as whole **paise** (integers), so there are no floating-point rounding errors. Dates are worked out in `APP_TIMEZONE` (default Asia/Kolkata), so "overdue" means overdue in India.

### Loan statuses

```
personal loan:  active ──(mark repaid)──> repaid

linked loan:    pending ──accept──> active ──"I've paid"──> paid_claimed ──confirm──> repaid
                   │                  │                        │
                   ├─decline─> declined                        └─"not received"─> active
                   └─cancel──> cancelled    (lender can also mark repaid from active)
```

The server decides which buttons each person gets (`actions` on every loan), and refuses anything else with `409`. The app just shows the buttons it's given.

### API

All responses are JSON. Everything except `/auth/*` needs `Authorization: Bearer <token>`.

| Method | Path | What it does |
| ------ | ---- | ------------ |
| POST | `/auth/request-otp` `{ phone }` | Creates a code, prints it in the log (and returns `devOtp` in demo mode) |
| POST | `/auth/verify-otp` `{ phone, otp }` | Returns `{ token, user }`; creates the user on first login |
| POST | `/auth/logout` | Ends the session |
| GET | `/me` | The logged-in user |
| PATCH | `/me` `{ username }` | Set or change your username |
| GET | `/me/stats` | Times lent and borrowed, people, totals |
| GET | `/users/lookup?q=` | Find a user by `@username` or phone |
| GET | `/loans` | Your loans, each with `role`, `status`, `overdue`, `actions` |
| POST | `/loans` | `{ role: 'lender' \| 'borrower', amount, dueDate, note?, counterpartyUserId? \| counterpartyName? }` |
| GET | `/loans/:id` | One loan with its `events` (history) |
| POST | `/loans/:id/accept` · `/decline` · `/cancel` | Respond to or withdraw a request |
| POST | `/loans/:id/remind` | Lender reminds the borrower (once per hour) |
| POST | `/loans/:id/claim-paid` | Borrower says they paid |
| POST | `/loans/:id/confirm-paid` · `/reject-paid` | Lender confirms, or says not received |
| POST | `/loans/:id/mark-repaid` | Lender (or owner of a personal loan) marks it repaid |
| DELETE | `/loans/:id` | Remove a personal loan, or a request that was declined |
| GET | `/summary` | `totalLent`, `totalRepaid`, `overdueAmount`, plus `toReceive`, `toPay`, ... |
| GET | `/people` | Everyone you've lent to or borrowed from, with counts and totals |
| GET | `/notifications` · POST `/notifications/read` | Inbox, and mark all as read |

### Server code (`server/src`)

```
index.ts          Starts the server (runs migrations first)
app.ts            Express app: routes and the error handler
config.ts         Settings from .env
db.ts             Postgres pool and a transaction() helper
migrate.ts        Runs migrations/*.sql in order, once each
auth.ts           OTP codes, sessions, the requireAuth middleware
loans.ts          The loan rules: who can do what, status changes, notifications, summary, people
validation.ts     Input rules (zod), shared by all routes
routes/           One file per group of endpoints
seed.ts           Demo users and loans
```

### App code (`app/src`)

```
App.tsx (in app/)        Loads fonts, restores the saved login, then shows Login → Username → Main
api/index.ts             Every call to the API. api/storage.ts keeps the login token in secure storage
screens/
  LoadingScreen.tsx      Animated logo while the app starts
  LoginScreen.tsx        Phone, then a 6-digit OTP (auto-filled in demo mode)
  UsernameScreen.tsx     Pick a username after the first login
  MainScreen.tsx         Bottom tabs, the bell, loads data and checks for updates every 15 s
  HomeScreen.tsx         Summary card, filters, list of loans
  PeopleScreen.tsx       Everyone you've lent to or borrowed from, and their loans
  ProfileScreen.tsx      Username, phone, your numbers, log out
  LoanDetailModal.tsx    One loan: what happens next, the buttons, the history
  NotificationsModal.tsx The inbox
components/              Logo, SummaryCard, LoanItem, StatusPill, AddLoanModal, OtpInput, ...
utils/                   Money and date formatting, validation, sorting
```
