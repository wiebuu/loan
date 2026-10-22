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
  App.tsx                    Loads fonts, shows the loading screen, then Login or Home
  assets/                    App icon, Android icons, splash image, favicon (all from the logo)
  src/
    api/index.ts             All backend calls. Mock for now; switches to fetch() in step 3
    screens/
      LoadingScreen.tsx      Animated logo while the app starts
      LoginScreen.tsx        Phone -> 6-digit OTP, with a resend countdown
      HomeScreen.tsx         Summary card, filter tabs, list of loans, "New loan" button
    components/
      Logo.tsx               The wordmark: the o is a rupee coin, the a is an open palm
      SummaryCard.tsx        Still to get back, progress bar, total lent / repaid / overdue
      LoanItem.tsx           One loan; overdue ones get a red tint, a red stripe and a "N days late" pill
      AddLoanModal.tsx       Form: amount, friend's name, due date (with quick-pick chips)
      OtpInput.tsx           Six boxes over one hidden input (paste and SMS auto-fill still work)
      Button.tsx, TextField.tsx, Icons.tsx
    utils/
      loans.ts               isOverdue, summarize, sortLoans (overdue first)
      validation.ts          Phone, OTP and loan-form validation
      format.ts              Rupee formatting and date helpers
    types.ts, theme.ts       Shared types; colours and fonts
```

A loan is **overdue** when it is not yet repaid and its due date is before today.
