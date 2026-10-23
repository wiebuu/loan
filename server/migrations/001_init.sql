-- Users log in with their phone number; the username is set right after the first login.
CREATE TABLE users (
  id          BIGSERIAL PRIMARY KEY,
  phone       TEXT NOT NULL UNIQUE,            -- 10-digit Indian mobile number
  username    TEXT,                            -- lowercase, set after first login
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_username_key ON users (username);

-- One pending code per phone. Only a hash is stored.
CREATE TABLE otp_codes (
  phone       TEXT PRIMARY KEY,
  code_hash   TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Login sessions. The app keeps the raw token; we keep its hash.
CREATE TABLE sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A loan always has a lender and a borrower. Either both are users of the app
-- ("linked", needs the other side to accept), or only the creator is, and the
-- other person is just a name ("personal", a reminder for yourself).
CREATE TABLE loans (
  id                 BIGSERIAL PRIMARY KEY,
  created_by         BIGINT NOT NULL REFERENCES users(id),
  lender_id          BIGINT REFERENCES users(id),
  borrower_id        BIGINT REFERENCES users(id),
  counterparty_name  TEXT,
  amount_paise       INTEGER NOT NULL CHECK (amount_paise > 0),
  due_date           DATE NOT NULL,
  note               TEXT,
  status             TEXT NOT NULL CHECK (status IN ('pending', 'active', 'declined', 'cancelled', 'paid_claimed', 'repaid')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at        TIMESTAMPTZ,
  repaid_at          TIMESTAMPTZ,
  last_reminder_at   TIMESTAMPTZ,
  CHECK (created_by = lender_id OR created_by = borrower_id),
  CHECK (lender_id IS DISTINCT FROM borrower_id),
  CHECK (
    (lender_id IS NOT NULL AND borrower_id IS NOT NULL AND counterparty_name IS NULL)
    OR ((lender_id IS NULL OR borrower_id IS NULL) AND counterparty_name IS NOT NULL)
  )
);
CREATE INDEX loans_lender_idx ON loans (lender_id);
CREATE INDEX loans_borrower_idx ON loans (borrower_id);

-- Everything that happens to a loan, in order. This is the loan's history.
CREATE TABLE loan_events (
  id          BIGSERIAL PRIMARY KEY,
  loan_id     BIGINT NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  actor_id    BIGINT NOT NULL REFERENCES users(id),
  type        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX loan_events_loan_idx ON loan_events (loan_id, created_at);

-- In-app inbox: invites, reminders, "I've paid" claims and confirmations.
CREATE TABLE notifications (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  loan_id     BIGINT REFERENCES loans(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at     TIMESTAMPTZ
);
CREATE INDEX notifications_user_idx ON notifications (user_id, created_at DESC);
