# Loan

Track money you've lent to friends: who owes you, how much, and when it's due.

```
app/      React Native app (Expo, TypeScript)
server/   Node + TypeScript + PostgreSQL API   (step 2, not built yet)
```

## Status

- [x] **Step 1: App UI** with a mock API (in-memory data, resets when the app reloads)
- [ ] Step 2: Backend (Express + PostgreSQL, mock OTP printed in the server log)
- [ ] Step 3: Connect the app to the backend
- [ ] Bonus: receipt photo upload, tests

## Run the app

You need Node 20+ and the **Expo Go** app on your phone (same Wi-Fi as your computer).

```bash
git clone https://github.com/wiebuu/loan.git
cd loan/app
npm install
npx expo start
```

Scan the QR code with your phone's camera (iOS) or the Expo Go app (Android). Press `w` to open it in a browser instead.

**Logging in (mock mode):** enter any 10-digit mobile number starting with 6–9, tap *Send OTP*, then look in the terminal running `expo start` for a line like:

```
[mock] OTP for +919876543210: 482913
```

## How the app is organised

```
app/
  App.tsx                    Shows Login when logged out, Home when logged in
  src/
    api/index.ts             All backend calls. Mock for now; switches to fetch() in step 3
    screens/
      LoginScreen.tsx        Phone -> OTP, two steps on one screen
      HomeScreen.tsx         Summary card, "Add entry" button, list of entries
    components/
      SummaryCard.tsx        Still-to-get-back, total lent, repaid, overdue
      LoanItem.tsx           One entry; overdue ones get a red background and border
      AddLoanModal.tsx       Form: friend name, amount, due date (with quick-pick chips)
      Button.tsx, TextField.tsx
    utils/
      loans.ts               isOverdue, summarize, sortLoans (overdue first)
      validation.ts          Phone, OTP and loan-form validation
      format.ts              Rupee formatting and date helpers
    types.ts, theme.ts
```

An entry is **overdue** when it is not yet repaid and its due date is before today.
