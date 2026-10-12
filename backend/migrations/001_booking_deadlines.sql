CREATE TABLE IF NOT EXISTS trips (
  id INTEGER PRIMARY KEY,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  departure_time TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  service TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS reservations (
  code TEXT PRIMARY KEY,
  owner_hash TEXT NOT NULL,
  request_key TEXT NOT NULL,
  trip_id INTEGER NOT NULL REFERENCES trips(id),
  travel_date TEXT NOT NULL,
  selected_seats TEXT NOT NULL DEFAULT '[]',
  passenger_json TEXT,
  total_cents INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('active_session','pending_payment','paid','expired','cancelled')),
  created_at TEXT NOT NULL,
  session_expires_at TEXT NOT NULL,
  confirmed_at TEXT,
  payment_deadline_at TEXT,
  paid_at TEXT,
  cancelled_at TEXT,
  cancellation_reason TEXT,
  UNIQUE (owner_hash, request_key),
  CHECK (status NOT IN ('pending_payment','paid') OR payment_deadline_at IS NOT NULL),
  CHECK (status != 'paid' OR paid_at IS NOT NULL)
) STRICT;

-- Solo contiene asientos retenidos o vendidos. La selección histórica queda en reservations.
CREATE TABLE IF NOT EXISTS reservation_seats (
  trip_id INTEGER NOT NULL REFERENCES trips(id),
  travel_date TEXT NOT NULL,
  seat TEXT NOT NULL,
  reservation_code TEXT NOT NULL REFERENCES reservations(code),
  PRIMARY KEY (trip_id, travel_date, seat)
) STRICT;
CREATE INDEX IF NOT EXISTS seats_by_reservation ON reservation_seats(reservation_code);
CREATE INDEX IF NOT EXISTS active_session_expiration ON reservations(session_expires_at) WHERE status = 'active_session';
CREATE INDEX IF NOT EXISTS pending_payment_expiration ON reservations(payment_deadline_at) WHERE status = 'pending_payment';
CREATE INDEX IF NOT EXISTS reservations_by_owner ON reservations(owner_hash);

CREATE TABLE IF NOT EXISTS payments (
  reference TEXT PRIMARY KEY,
  reservation_code TEXT NOT NULL UNIQUE REFERENCES reservations(code),
  amount_cents INTEGER NOT NULL,
  recorded_at TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('demo','provider'))
) STRICT;

-- Horarios y precios de muestra para el piloto, no una oferta comercial real.
INSERT OR IGNORE INTO trips VALUES (1,'Lima','Trujillo','06:00',540,8500,'Premium');
INSERT OR IGNORE INTO trips VALUES (2,'Lima','Trujillo','10:00',540,8500,'Premium');
INSERT OR IGNORE INTO trips VALUES (3,'Lima','Trujillo','14:00',600,7000,'Económico');
INSERT OR IGNORE INTO trips VALUES (4,'Lima','Trujillo','22:00',540,9500,'Ejecutivo');
