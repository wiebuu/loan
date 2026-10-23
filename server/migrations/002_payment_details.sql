-- When a borrower says "I've paid", they say how/where, and can add a receipt
-- (a photo, a link, or both). Kept on the event so every claim stays in the history.
ALTER TABLE loan_events
  ADD COLUMN note          TEXT,
  ADD COLUMN receipt_link  TEXT,
  ADD COLUMN receipt_image TEXT;  -- path under /uploads, e.g. /uploads/3f9c....jpg
