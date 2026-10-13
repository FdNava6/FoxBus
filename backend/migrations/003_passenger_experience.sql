ALTER TABLE trips ADD COLUMN service_description TEXT NOT NULL DEFAULT '';
ALTER TABLE trips ADD COLUMN features_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE service_requests ADD COLUMN response_due_at TEXT;
ALTER TABLE financial_cases ADD COLUMN expected_resolution_at TEXT;
CREATE TABLE payment_checkouts (
 reservation_code TEXT PRIMARY KEY REFERENCES reservations(code),
 checkout_url TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL
) STRICT;
