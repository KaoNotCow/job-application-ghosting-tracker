-- One row per application. No names, emails, roles, IPs or exact dates.
CREATE TABLE IF NOT EXISTS responses (
  row_key     TEXT PRIMARY KEY,   -- salted-style hash of the application, used only to skip duplicates
  company_key TEXT NOT NULL,      -- lowercase letters and numbers, for grouping
  company     TEXT NOT NULL,      -- display name as first submitted
  outcome     TEXT NOT NULL CHECK (outcome IN ('rejected','interview','no_reply')),
  days        REAL,               -- days from applying to first reply (null if no reply)
  waited      INTEGER,            -- days of silence so far (only for no_reply)
  month       TEXT NOT NULL,      -- month applied, like 2026-09
  received    TEXT NOT NULL       -- day received, like 2026-10-16
);
CREATE INDEX IF NOT EXISTS idx_responses_company ON responses (company_key);

-- Daily totals. Doubles as your "how many people used the share button" counter
-- and as a flood guard that protects the free tier.
CREATE TABLE IF NOT EXISTS daily (
  day         TEXT PRIMARY KEY,
  submissions INTEGER NOT NULL DEFAULT 0,
  rows        INTEGER NOT NULL DEFAULT 0
);
