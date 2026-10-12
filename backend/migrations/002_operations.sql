CREATE TABLE users (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
 password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('passenger','agent','finance','boarding','admin')),
 active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
) STRICT;
CREATE TABLE auth_sessions (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at TEXT NOT NULL
) STRICT;
CREATE TABLE vehicles (id TEXT PRIMARY KEY, label TEXT NOT NULL, seats_json TEXT NOT NULL) STRICT;
CREATE TABLE departures (
 id TEXT PRIMARY KEY, trip_id INTEGER NOT NULL REFERENCES trips(id), travel_date TEXT NOT NULL,
 vehicle_id TEXT NOT NULL REFERENCES vehicles(id), departure_at TEXT NOT NULL, arrival_at TEXT NOT NULL,
 terminal_origin TEXT NOT NULL, terminal_destination TEXT NOT NULL,
 boarding_minutes INTEGER NOT NULL DEFAULT 30 CHECK(boarding_minutes BETWEEN 15 AND 120),
 status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','closed','departed','cancelled')),
 UNIQUE(trip_id, travel_date), CHECK(arrival_at > departure_at)
) STRICT;
CREATE INDEX departures_search ON departures(travel_date,status,departure_at);
ALTER TABLE reservations ADD COLUMN departure_id TEXT REFERENCES departures(id);
ALTER TABLE reservations ADD COLUMN passenger_count INTEGER NOT NULL DEFAULT 1 CHECK(passenger_count BETWEEN 1 AND 6);
ALTER TABLE reservations ADD COLUMN channel TEXT NOT NULL DEFAULT 'web';
ALTER TABLE reservations ADD COLUMN created_by TEXT REFERENCES users(id);
CREATE TABLE passengers (
 id TEXT PRIMARY KEY, reservation_code TEXT NOT NULL REFERENCES reservations(code), seat TEXT NOT NULL,
 name TEXT NOT NULL, document_type TEXT NOT NULL, document_number TEXT NOT NULL,
 birth_date TEXT NOT NULL, guardian TEXT, UNIQUE(reservation_code,seat)
) STRICT;
CREATE TABLE tickets (
 token TEXT PRIMARY KEY, passenger_id TEXT NOT NULL UNIQUE REFERENCES passengers(id),
 reservation_code TEXT NOT NULL REFERENCES reservations(code), issued_at TEXT NOT NULL,
 checked_in_at TEXT, checked_in_by TEXT REFERENCES users(id)
) STRICT;
CREATE TABLE access_tokens (
 hash TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('reservation','reset')),
 resource TEXT NOT NULL, expires_at TEXT NOT NULL, used_at TEXT, used_owner TEXT
) STRICT;
CREATE TABLE reservation_grants (
 reservation_code TEXT NOT NULL REFERENCES reservations(code), owner_hash TEXT NOT NULL,
 expires_at TEXT NOT NULL, PRIMARY KEY(reservation_code,owner_hash)
) STRICT;
CREATE TABLE payment_events (
 reference TEXT PRIMARY KEY, reservation_code TEXT REFERENCES reservations(code), supplied_code TEXT NOT NULL,
 amount_cents INTEGER NOT NULL CHECK(amount_cents > 0), occurred_at TEXT NOT NULL, received_at TEXT NOT NULL,
 mode TEXT NOT NULL CHECK(mode IN ('demo','provider','counter')),
 outcome TEXT NOT NULL CHECK(outcome IN ('applied','review','refund_pending'))
) STRICT;
CREATE TABLE financial_cases (
 id TEXT PRIMARY KEY, reservation_code TEXT REFERENCES reservations(code), payment_reference TEXT,
 reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','refund_pending','resolved')),
 response TEXT, refund_reference TEXT UNIQUE, refund_amount_cents INTEGER, resolved_by TEXT REFERENCES users(id),
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
) STRICT;
INSERT INTO payment_events(reference,reservation_code,supplied_code,amount_cents,occurred_at,received_at,mode,outcome)
 SELECT reference,reservation_code,reservation_code,amount_cents,recorded_at,recorded_at,mode,'applied' FROM payments;
CREATE TABLE service_requests (
 id TEXT PRIMARY KEY, reservation_code TEXT NOT NULL REFERENCES reservations(code), owner_hash TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('reprogram','refund','delay','complaint','privacy')),
 message TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_review','resolved','rejected')),
 response TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, resolved_by TEXT REFERENCES users(id)
) STRICT;
CREATE TABLE outbox (
 id TEXT PRIMARY KEY, owner_hash TEXT NOT NULL, reservation_code TEXT, recipient TEXT NOT NULL,
 subject TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending'
 CHECK(status IN ('pending','sending','delivered','failed')), attempts INTEGER NOT NULL DEFAULT 0,
 next_attempt_at TEXT NOT NULL, locked_until TEXT, last_error TEXT, created_at TEXT NOT NULL
) STRICT;
CREATE INDEX outbox_pending ON outbox(status,next_attempt_at);
CREATE TABLE audit_log (
 id INTEGER PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, resource TEXT NOT NULL,
 detail_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL
) STRICT;
CREATE TABLE operator_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;
CREATE TABLE privacy_acceptances (
 id INTEGER PRIMARY KEY, owner_hash TEXT NOT NULL, version TEXT NOT NULL, marketing INTEGER NOT NULL DEFAULT 0,
 accepted_at TEXT NOT NULL
) STRICT;
CREATE TABLE job_health (name TEXT PRIMARY KEY, last_success_at TEXT, last_error TEXT) STRICT;
INSERT INTO operator_settings VALUES ('policy','{"version":"2026-10-12","legalName":"","taxId":"","supportEmail":"","supportPhone":"","address":"","baggageKg":null,"offers":[],"retentionDays":null,"maxSeats":6,"maxActiveReservations":3,"boardingMinutes":30}');
