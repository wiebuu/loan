-- Loans added by "Add demo data" in Settings are marked, so "Remove demo data" takes away
-- exactly those and nothing you added yourself.
ALTER TABLE loans ADD COLUMN is_demo BOOLEAN NOT NULL DEFAULT false;

-- Mark the sample loans added before this column existed (same notes, with the demo people).
UPDATE loans SET is_demo = true
WHERE note IN ('Goa trip, hotel share', 'Movie and snacks', 'Concert tickets', 'Lunch at college', 'Laptop repair',
               'Electricity bill', 'Auto fare', 'Pizza night', 'Books')
  AND (
    counterparty_name IN ('Rohan (roommate)', 'Kabir')
    OR lender_id IN (SELECT id FROM users WHERE phone IN ('9000011111', '9000022222', '9000033333', '9000044444', '9000055555'))
    OR borrower_id IN (SELECT id FROM users WHERE phone IN ('9000011111', '9000022222', '9000033333', '9000044444', '9000055555'))
  );
