-- 001_schema.sql
-- Esquema MySQL 8 consolidado para FOXBus. Reemplaza las migraciones SQLite
-- 001-005 conservando tablas, columnas, restricciones e índices equivalentes.
-- Las fechas de negocio se guardan como ISO-8601 en VARCHAR para mantener el
-- mismo orden lexicográfico y la misma API que la versión anterior.

CREATE TABLE IF NOT EXISTS trips (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  origin VARCHAR(100) NOT NULL,
  destination VARCHAR(100) NOT NULL,
  departure_time VARCHAR(5) NOT NULL,
  duration_minutes INT NOT NULL,
  price_cents INT NOT NULL,
  service VARCHAR(60) NOT NULL,
  service_description VARCHAR(1000) NOT NULL DEFAULT '',
  features_json VARCHAR(2000) NOT NULL DEFAULT '[]',
  CONSTRAINT trips_duration_positive CHECK (duration_minutes > 0),
  CONSTRAINT trips_price_positive CHECK (price_cents > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS vehicles (
  id VARCHAR(60) NOT NULL PRIMARY KEY,
  label VARCHAR(150) NOT NULL,
  seats_json TEXT NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(16) NOT NULL,
  active TINYINT NOT NULL DEFAULT 1,
  created_at VARCHAR(32) NOT NULL,
  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_role_valid CHECK (role IN ('passenger','agent','finance','boarding','admin'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS departures (
  id VARCHAR(60) NOT NULL PRIMARY KEY,
  trip_id INT NOT NULL,
  travel_date DATE NOT NULL,
  vehicle_id VARCHAR(60) NOT NULL,
  departure_at VARCHAR(32) NOT NULL,
  arrival_at VARCHAR(32) NOT NULL,
  terminal_origin VARCHAR(300) NOT NULL,
  terminal_destination VARCHAR(300) NOT NULL,
  boarding_minutes INT NOT NULL DEFAULT 30,
  status VARCHAR(16) NOT NULL DEFAULT 'scheduled',
  CONSTRAINT departures_trip_unique UNIQUE (trip_id, travel_date),
  INDEX departures_search (travel_date, status, departure_at),
  CONSTRAINT departures_trip_fk FOREIGN KEY (trip_id) REFERENCES trips(id),
  CONSTRAINT departures_vehicle_fk FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
  CONSTRAINT departures_boarding_range CHECK (boarding_minutes BETWEEN 15 AND 120),
  CONSTRAINT departures_status_valid CHECK (status IN ('scheduled','closed','departed','cancelled')),
  CONSTRAINT departures_time_order CHECK (arrival_at > departure_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reservations (
  code VARCHAR(80) NOT NULL PRIMARY KEY,
  owner_hash CHAR(64) NOT NULL,
  request_key VARCHAR(80) NOT NULL,
  trip_id INT NOT NULL,
  travel_date DATE NOT NULL,
  selected_seats VARCHAR(500) NOT NULL DEFAULT '[]',
  passenger_json TEXT NULL,
  total_cents INT NOT NULL DEFAULT 0,
  revision INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL,
  created_at VARCHAR(32) NOT NULL,
  session_expires_at VARCHAR(32) NOT NULL,
  confirmed_at VARCHAR(32) NULL,
  payment_deadline_at VARCHAR(32) NULL,
  paid_at VARCHAR(32) NULL,
  cancelled_at VARCHAR(32) NULL,
  cancellation_reason VARCHAR(80) NULL,
  departure_id VARCHAR(60) NULL,
  passenger_count INT NOT NULL DEFAULT 1,
  channel VARCHAR(16) NOT NULL DEFAULT 'web',
  created_by CHAR(36) NULL,
  CONSTRAINT reservations_owner_request_unique UNIQUE (owner_hash, request_key),
  INDEX active_session_expiration (status, session_expires_at),
  INDEX pending_payment_expiration (status, payment_deadline_at),
  INDEX reservations_by_owner (owner_hash),
  INDEX reservations_by_created (created_at),
  CONSTRAINT reservations_trip_fk FOREIGN KEY (trip_id) REFERENCES trips(id),
  CONSTRAINT reservations_departure_fk FOREIGN KEY (departure_id) REFERENCES departures(id),
  CONSTRAINT reservations_created_by_fk FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT reservations_status_valid CHECK (status IN ('active_session','pending_payment','paid','expired','cancelled')),
  CONSTRAINT reservations_passengers_range CHECK (passenger_count BETWEEN 1 AND 5),
  CONSTRAINT reservations_payment_deadline_required CHECK (status NOT IN ('pending_payment','paid') OR payment_deadline_at IS NOT NULL),
  CONSTRAINT reservations_paid_at_required CHECK (status <> 'paid' OR paid_at IS NOT NULL)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reservation_seats (
  trip_id INT NOT NULL,
  travel_date DATE NOT NULL,
  seat VARCHAR(8) NOT NULL,
  reservation_code VARCHAR(80) NOT NULL,
  PRIMARY KEY (trip_id, travel_date, seat),
  INDEX seats_by_reservation (reservation_code),
  CONSTRAINT reservation_seats_trip_fk FOREIGN KEY (trip_id) REFERENCES trips(id),
  CONSTRAINT reservation_seats_reservation_fk FOREIGN KEY (reservation_code) REFERENCES reservations(code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
  reference VARCHAR(150) NOT NULL PRIMARY KEY,
  reservation_code VARCHAR(80) NOT NULL,
  amount_cents INT NOT NULL,
  recorded_at VARCHAR(32) NOT NULL,
  mode VARCHAR(16) NOT NULL,
  CONSTRAINT payments_reservation_unique UNIQUE (reservation_code),
  CONSTRAINT payments_reservation_fk FOREIGN KEY (reservation_code) REFERENCES reservations(code),
  CONSTRAINT payments_mode_valid CHECK (mode IN ('demo','provider'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash CHAR(64) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  expires_at VARCHAR(32) NOT NULL,
  CONSTRAINT auth_sessions_user_fk FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS passengers (
  id CHAR(36) NOT NULL PRIMARY KEY,
  reservation_code VARCHAR(80) NOT NULL,
  seat VARCHAR(64) NOT NULL,
  name VARCHAR(150) NOT NULL,
  document_type VARCHAR(20) NOT NULL,
  document_number VARCHAR(40) NOT NULL,
  birth_date DATE NOT NULL,
  guardian VARCHAR(150) NULL,
  CONSTRAINT passengers_reservation_seat_unique UNIQUE (reservation_code, seat),
  CONSTRAINT passengers_reservation_fk FOREIGN KEY (reservation_code) REFERENCES reservations(code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tickets (
  token CHAR(48) NOT NULL PRIMARY KEY,
  passenger_id CHAR(36) NOT NULL,
  reservation_code VARCHAR(80) NOT NULL,
  issued_at VARCHAR(32) NOT NULL,
  checked_in_at VARCHAR(32) NULL,
  checked_in_by CHAR(36) NULL,
  CONSTRAINT tickets_passenger_unique UNIQUE (passenger_id),
  CONSTRAINT tickets_passenger_fk FOREIGN KEY (passenger_id) REFERENCES passengers(id),
  CONSTRAINT tickets_reservation_fk FOREIGN KEY (reservation_code) REFERENCES reservations(code),
  CONSTRAINT tickets_checked_by_fk FOREIGN KEY (checked_in_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS access_tokens (
  hash CHAR(64) NOT NULL PRIMARY KEY,
  kind VARCHAR(16) NOT NULL,
  resource VARCHAR(4000) NOT NULL,
  expires_at VARCHAR(32) NOT NULL,
  used_at VARCHAR(32) NULL,
  used_owner CHAR(64) NULL,
  CONSTRAINT access_tokens_kind_valid CHECK (kind IN ('reservation','reset'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reservation_grants (
  reservation_code VARCHAR(80) NOT NULL,
  owner_hash CHAR(64) NOT NULL,
  expires_at VARCHAR(32) NOT NULL,
  PRIMARY KEY (reservation_code, owner_hash),
  CONSTRAINT reservation_grants_reservation_fk FOREIGN KEY (reservation_code) REFERENCES reservations(code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payment_events (
  reference VARCHAR(150) NOT NULL PRIMARY KEY,
  reservation_code VARCHAR(80) NULL,
  supplied_code VARCHAR(80) NOT NULL,
  amount_cents INT NOT NULL,
  occurred_at VARCHAR(32) NOT NULL,
  received_at VARCHAR(32) NOT NULL,
  mode VARCHAR(16) NOT NULL,
  outcome VARCHAR(20) NOT NULL,
  CONSTRAINT payment_events_reservation_fk FOREIGN KEY (reservation_code) REFERENCES reservations(code),
  CONSTRAINT payment_events_amount_positive CHECK (amount_cents > 0),
  CONSTRAINT payment_events_mode_valid CHECK (mode IN ('demo','provider','counter')),
  CONSTRAINT payment_events_outcome_valid CHECK (outcome IN ('applied','review','refund_pending'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS financial_cases (
  id CHAR(36) NOT NULL PRIMARY KEY,
  reservation_code VARCHAR(80) NULL,
  payment_reference VARCHAR(150) NULL,
  reason VARCHAR(80) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  response VARCHAR(2000) NULL,
  refund_reference VARCHAR(150) NULL,
  refund_amount_cents INT NULL,
  resolved_by CHAR(36) NULL,
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL,
  expected_resolution_at VARCHAR(32) NULL,
  CONSTRAINT financial_cases_refund_unique UNIQUE (refund_reference),
  CONSTRAINT financial_cases_reservation_fk FOREIGN KEY (reservation_code) REFERENCES reservations(code),
  CONSTRAINT financial_cases_resolved_by_fk FOREIGN KEY (resolved_by) REFERENCES users(id),
  CONSTRAINT financial_cases_status_valid CHECK (status IN ('open','refund_pending','resolved'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS service_requests (
  id CHAR(36) NOT NULL PRIMARY KEY,
  reservation_code VARCHAR(80) NOT NULL,
  owner_hash CHAR(64) NOT NULL,
  kind VARCHAR(16) NOT NULL,
  message VARCHAR(2000) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'open',
  response VARCHAR(2000) NULL,
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL,
  resolved_by CHAR(36) NULL,
  response_due_at VARCHAR(32) NULL,
  CONSTRAINT service_requests_reservation_fk FOREIGN KEY (reservation_code) REFERENCES reservations(code),
  CONSTRAINT service_requests_resolved_by_fk FOREIGN KEY (resolved_by) REFERENCES users(id),
  CONSTRAINT service_requests_kind_valid CHECK (kind IN ('reprogram','refund','delay','complaint','privacy')),
  CONSTRAINT service_requests_status_valid CHECK (status IN ('open','in_review','resolved','rejected'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS outbox (
  id CHAR(36) NOT NULL PRIMARY KEY,
  owner_hash CHAR(64) NOT NULL,
  reservation_code VARCHAR(80) NULL,
  recipient VARCHAR(254) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  html MEDIUMTEXT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  next_attempt_at VARCHAR(32) NOT NULL,
  locked_until VARCHAR(32) NULL,
  last_error VARCHAR(200) NULL,
  created_at VARCHAR(32) NOT NULL,
  INDEX outbox_pending (status, next_attempt_at),
  CONSTRAINT outbox_status_valid CHECK (status IN ('pending','sending','delivered','failed'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  actor VARCHAR(80) NOT NULL,
  action VARCHAR(60) NOT NULL,
  resource VARCHAR(160) NOT NULL,
  detail_json TEXT NOT NULL,
  created_at VARCHAR(32) NOT NULL,
  INDEX audit_by_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS operator_settings (
  `key` VARCHAR(64) NOT NULL PRIMARY KEY,
  value TEXT NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS privacy_acceptances (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  owner_hash CHAR(64) NOT NULL,
  version VARCHAR(40) NOT NULL,
  marketing TINYINT NOT NULL DEFAULT 0,
  accepted_at VARCHAR(32) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS job_health (
  name VARCHAR(40) NOT NULL PRIMARY KEY,
  last_success_at VARCHAR(32) NULL,
  last_error VARCHAR(200) NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payment_checkouts (
  reservation_code VARCHAR(80) NOT NULL PRIMARY KEY,
  checkout_url VARCHAR(1000) NOT NULL,
  expires_at VARCHAR(32) NOT NULL,
  created_at VARCHAR(32) NOT NULL,
  CONSTRAINT payment_checkouts_reservation_fk FOREIGN KEY (reservation_code) REFERENCES reservations(code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS passenger_preferences (
  owner_hash CHAR(64) NOT NULL PRIMARY KEY,
  schedule VARCHAR(16) NOT NULL,
  service_type VARCHAR(16) NOT NULL,
  destination VARCHAR(100) NOT NULL,
  updated_at VARCHAR(32) NOT NULL,
  CONSTRAINT passenger_preferences_schedule_valid CHECK (schedule IN ('morning','afternoon','night')),
  CONSTRAINT passenger_preferences_service_valid CHECK (service_type IN ('economico','ejecutivo','cama'))
) ENGINE=InnoDB;


INSERT IGNORE INTO trips(id,origin,destination,departure_time,duration_minutes,price_cents,service) VALUES
 (1,'Lima','Trujillo','06:00',540,8500,'Cama'),
 (2,'Lima','Trujillo','10:00',540,8500,'Cama'),
 (3,'Lima','Trujillo','14:00',600,7000,'Económico'),
 (4,'Lima','Trujillo','22:00',540,9500,'Ejecutivo'),
 (5,'Lima','Chimbote','06:00',360,4500,'Económico'),
 (6,'Lima','Chimbote','15:00',360,5000,'Económico'),
 (7,'Lima','Chiclayo','08:00',720,9000,'Cama'),
 (8,'Lima','Chiclayo','21:30',720,11000,'Ejecutivo'),
 (9,'Lima','Piura','07:00',900,12000,'Cama'),
 (10,'Lima','Piura','20:30',900,14000,'Ejecutivo'),
 (11,'Lima','Cajamarca','09:00',840,10000,'Cama');

INSERT IGNORE INTO operator_settings(`key`,value) VALUES
 ('policy','{"version":"2026-10-12","legalName":"","taxId":"","supportEmail":"","supportPhone":"","address":"","baggageKg":null,"offers":[],"retentionDays":null,"maxSeats":5,"maxActiveReservations":3,"boardingMinutes":30}');
