import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID, randomBytes } from "node:crypto";
import { POLICY_DEFAULTS } from "./passenger-experience.js";
import {
  BookingError,
  fail,
  iso,
  digest,
  ownerHash,
  validateDate,
  limaDate,
  contactData,
  travelersData,
} from "./domain.js";
export { BookingError, ownerHash };
export const SESSION_DURATION_MS = 10 * 60 * 1000;
export const PAYMENT_DURATION_MS = 2 * 60 * 60 * 1000;
export const ALL_SEATS = Array.from(
  { length: 40 },
  (_, i) => `${Math.floor(i / 4) + 1}${"ABCD"[i % 4]}`,
);

export class BookingStore {
  constructor(
    path = ":memory:",
    { clock = Date.now, publicUrl = "http://localhost:5173" } = {},
  ) {
    if (path !== ":memory:")
      mkdirSync(dirname(resolve(path)), { recursive: true });
    this.db = new DatabaseSync(path);
    this.clock = clock;
    this.publicUrl = publicUrl;
    this.db.exec(
      "PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;",
    );
    this.db.exec(
      "CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY) STRICT;",
    );
    for (const [version, file] of [
      [1, "001_booking_deadlines.sql"],
      [2, "002_operations.sql"],
      [3, "003_passenger_experience.sql"],
    ]) {
      if (
        this.db
          .prepare("SELECT version FROM schema_migrations WHERE version=?")
          .get(version)
      )
        continue;
      this.db.exec("BEGIN IMMEDIATE");
      try {
        this.db.exec(
          readFileSync(
            new URL("../migrations/" + file, import.meta.url),
            "utf8",
          ),
        );
        this.db
          .prepare("INSERT INTO schema_migrations VALUES (?)")
          .run(version);
        this.db.exec("COMMIT");
      } catch (error) {
        this.db.exec("ROLLBACK");
        throw error;
      }
    }
    this.pilotMode =
      this.db
        .prepare("SELECT value FROM operator_settings WHERE key='runtime_mode'")
        .get()?.value === "pilot";
  }
  close() {
    this.db.close();
  }
  policy() {
    return {
      ...POLICY_DEFAULTS,
      ...JSON.parse(
        this.db
          .prepare("SELECT value FROM operator_settings WHERE key='policy'")
          .get().value,
      ),
    };
  }
  audit(actor, action, resource, detail = {}) {
    this.db
      .prepare(
        "INSERT INTO audit_log(actor,action,resource,detail_json,created_at) VALUES (?,?,?,?,?)",
      )
      .run(actor, action, resource, JSON.stringify(detail), iso(this.clock()));
  }
  transaction(action) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const now = this.clock();
      this.expireInsideTransaction(now);
      this.db.exec("SAVEPOINT operation");
      try {
        const result = action(now);
        this.db.exec("RELEASE operation; COMMIT");
        return result;
      } catch (error) {
        if (error instanceof BookingError) {
          this.db.exec("ROLLBACK TO operation; RELEASE operation; COMMIT");
        } else this.db.exec("ROLLBACK");
        throw error;
      }
    } catch (error) {
      if (this.db.isTransaction) this.db.exec("ROLLBACK");
      throw error;
    }
  }
  notify(row, subject, body) {
    const contact = JSON.parse(row.passenger_json || "null");
    if (!contact?.email) return;
    this.queueMail(row.owner_hash, contact.email, subject, body, row.code);
  }
  queueMail(owner, email, subject, body, code = null) {
    const time = iso(this.clock());
    this.db
      .prepare(
        "INSERT INTO outbox(id,owner_hash,reservation_code,recipient,subject,body,next_attempt_at,created_at) VALUES (?,?,?,?,?,?,?,?)",
      )
      .run(randomUUID(), owner, code, email, subject, body, time, time);
  }
  expireInsideTransaction(now) {
    const time = iso(now);
    const rows = this.db
      .prepare(
        "SELECT * FROM reservations WHERE (status='active_session' AND session_expires_at<=?) OR (status='pending_payment' AND payment_deadline_at<=?)",
      )
      .all(time, time);
    let expiredSessions = 0,
      cancelledUnpaid = 0;
    for (const row of rows) {
      const active = row.status === "active_session";
      this.db
        .prepare(
          "UPDATE reservations SET status=?,revision=revision+1,cancelled_at=?,cancellation_reason=? WHERE code=?",
        )
        .run(
          active ? "expired" : "cancelled",
          time,
          active ? "session_timeout" : "payment_timeout",
          row.code,
        );
      this.db
        .prepare("DELETE FROM reservation_seats WHERE reservation_code=?")
        .run(row.code);
      if (active) expiredSessions++;
      else cancelledUnpaid++;
      this.notify(
        row,
        "Reserva vencida",
        `La reserva ${row.code} venció sin pago. Los asientos se liberaron. Consulta tus gestiones en ${this.publicUrl}/mis-viajes.`,
      );
      this.audit(
        "system",
        active ? "session_expired" : "payment_expired",
        row.code,
      );
    }
    this.db.prepare("DELETE FROM auth_sessions WHERE expires_at<=?").run(time);
    this.db
      .prepare(
        "UPDATE departures SET status='departed' WHERE status IN ('scheduled','closed') AND departure_at<=?",
      )
      .run(time);
    this.db
      .prepare(
        "INSERT INTO job_health VALUES ('expiration',?,NULL) ON CONFLICT(name) DO UPDATE SET last_success_at=excluded.last_success_at,last_error=NULL",
      )
      .run(time);
    return { expiredSessions, cancelledUnpaid };
  }
  expireReservations() {
    return this.runExpiration();
  }
  // Permite obtener contadores del job sin aplicar la limpieza dos veces.
  runExpiration() {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = this.expireInsideTransaction(this.clock());
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  seedDemoSchedule(startDate = limaDate(this.clock()), days = 7) {
    validateDate(startDate);
    const seats = ALL_SEATS.map((id, i) => ({
      id,
      row: Math.floor(i / 4) + 1,
      col: (i % 4) + 1,
      floor: 1,
      category: "Estándar",
      blocked: false,
    }));
    this.db
      .prepare("INSERT OR IGNORE INTO vehicles VALUES (?,?,?)")
      .run("demo-bus", "Bus de muestra · 40 asientos", JSON.stringify(seats));
    this.db.prepare("INSERT OR IGNORE INTO vehicles VALUES (?,?,?)").run(
      "demo-bus-2",
      "Bus de muestra · dos pisos",
      JSON.stringify(
        seats.map((s, i) => ({
          ...s,
          floor: i < 20 ? 1 : 2,
          row: Math.floor((i % 20) / 4) + 1,
        })),
      ),
    );
    for (let i = 0; i < days; i++) {
      const date = iso(Date.parse(startDate) + i * 86400000).slice(0, 10);
      for (const trip of this.db.prepare("SELECT * FROM trips").all()) {
        const vehicleId = "scheduled-demo-bus-" + trip.id;
        this.db
          .prepare("INSERT OR IGNORE INTO vehicles VALUES (?,?,?)")
          .run(vehicleId, "Bus de muestra " + trip.id, JSON.stringify(seats));
        const departureAt = `${date}T${trip.departure_time}:00-05:00`;
        this.db
          .prepare(
            "INSERT OR IGNORE INTO departures(id,trip_id,travel_date,vehicle_id,departure_at,arrival_at,terminal_origin,terminal_destination) VALUES (?,?,?,?,?,?,?,?)",
          )
          .run(
            "demo-" + trip.id + "-" + date,
            trip.id,
            date,
            vehicleId,
            iso(Date.parse(departureAt)),
            iso(Date.parse(departureAt) + trip.duration_minutes * 60000),
            "Terminal de muestra Lima · confirmar con operador",
            "Terminal de muestra Trujillo · confirmar con operador",
          );
      }
    }
  }
  tripRow(id) {
    if (!Number.isSafeInteger(Number(id)) || Number(id) < 1)
      fail(400, "INVALID_TRIP", "Selecciona un viaje válido.");
    const row = this.db
      .prepare("SELECT * FROM trips WHERE id=?")
      .get(Number(id));
    if (!row) fail(404, "TRIP_NOT_FOUND", "No existe el viaje.");
    return row;
  }
  departure(id, date) {
    validateDate(date);
    const row = this.db
      .prepare("SELECT * FROM departures WHERE trip_id=? AND travel_date=?")
      .get(Number(id), date);
    if (!row)
      fail(
        404,
        "DEPARTURE_NOT_FOUND",
        "No hay una salida programada en esa fecha.",
      );
    return row;
  }
  seatLayout(departure) {
    return JSON.parse(
      this.db
        .prepare("SELECT seats_json FROM vehicles WHERE id=?")
        .get(departure.vehicle_id).seats_json,
    );
  }
  salesClose(departure) {
    return (
      Date.parse(departure.departure_at) -
      SESSION_DURATION_MS -
      PAYMENT_DURATION_MS -
      departure.boarding_minutes * 60000
    );
  }
  requireSale(departure, now) {
    if (departure.status !== "scheduled" || now >= this.salesClose(departure))
      fail(
        409,
        "SALES_CLOSED",
        "La venta de esta salida está cerrada: ya no alcanza el plazo de reserva y pago antes del abordaje.",
      );
  }
  tripView(row, date) {
    const dep = this.db
      .prepare("SELECT * FROM departures WHERE trip_id=? AND travel_date=?")
      .get(row.id, date);
    if (!dep)
      return {
        id: row.id,
        origin: row.origin,
        destination: row.destination,
        date,
        departureTime: row.departure_time,
        durationMinutes: row.duration_minutes,
        price: row.price_cents / 100,
        service: row.service,
        seatsAvailable: 0,
        status: "legacy",
        seatLayout: [],
      };
    const toTime = (v) =>
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Lima",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(v));
    const layout = this.seatLayout(dep);
    const occupied = this.db
      .prepare(
        "SELECT COUNT(*) AS count FROM reservation_seats WHERE trip_id=? AND travel_date=?",
      )
      .get(row.id, date).count;
    return {
      id: row.id,
      departureId: dep.id,
      origin: row.origin,
      destination: row.destination,
      date,
      departureTime: toTime(dep.departure_at),
      arrivalTime: toTime(dep.arrival_at),
      departure_at: dep.departure_at,
      arrival_at: dep.arrival_at,
      status: dep.status,
      arrivalDayOffset: Math.round(
        (Date.parse(limaDate(Date.parse(dep.arrival_at))) - Date.parse(date)) /
          86400000,
      ),
      durationMinutes:
        (Date.parse(dep.arrival_at) - Date.parse(dep.departure_at)) / 60000,
      price: row.price_cents / 100,
      service: row.service,
      seatsAvailable: layout.filter((s) => !s.blocked).length - occupied,
      serviceDescription: row.service_description,
      features: JSON.parse(row.features_json),
      isDemo: dep.id.startsWith("demo-"),
      seatLayout: layout,
      vehicleId: dep.vehicle_id,
      terminalOrigin: dep.terminal_origin,
      terminalDestination: dep.terminal_destination,
      boarding_at: iso(
        Date.parse(dep.departure_at) - dep.boarding_minutes * 60000,
      ),
      sales_closes_at: iso(this.salesClose(dep)),
      policyVersion: this.policy().version,
    };
  }
  catalog() {
    return this.db
      .prepare(
        "SELECT DISTINCT t.origin,t.destination FROM departures d JOIN trips t ON t.id=d.trip_id WHERE d.status='scheduled' AND d.departure_at>?",
      )
      .all(iso(this.clock()));
  }
  searchTrips({ origin, destination, date, passengers = 1 }) {
    validateDate(date);
    if (date < limaDate(this.clock()))
      fail(400, "PAST_DATE", "No se pueden comprar viajes de fechas pasadas.");
    if (
      !Number.isInteger(Number(passengers)) ||
      Number(passengers) < 1 ||
      Number(passengers) > this.policy().maxSeats
    )
      fail(
        400,
        "INVALID_PASSENGERS",
        "Reserva entre 1 y 6 pasajeros por operación.",
      );
    return this.transaction((now) =>
      this.db
        .prepare(
          "SELECT t.* FROM trips t JOIN departures d ON d.trip_id=t.id WHERE t.origin=? COLLATE NOCASE AND t.destination=? COLLATE NOCASE AND d.travel_date=? AND d.status='scheduled'",
        )
        .all(origin || "", destination || "", date)
        .filter((t) => now < this.salesClose(this.departure(t.id, date)))
        .map((t) => this.tripView(t, date))
        .filter((t) => t.seatsAvailable >= Number(passengers)),
    );
  }
  getTrip(id, date) {
    validateDate(date);
    return this.transaction(() => this.tripView(this.tripRow(id), date));
  }
  getSeats(id, date) {
    return this.transaction(() => {
      this.departure(id, date);
      return this.db
        .prepare(
          "SELECT seat FROM reservation_seats WHERE trip_id=? AND travel_date=?",
        )
        .all(Number(id), date)
        .map((r) => r.seat);
    });
  }
  owned(code, owner) {
    const row = this.db
      .prepare(
        "SELECT * FROM reservations WHERE code=? AND (owner_hash=? OR EXISTS(SELECT 1 FROM reservation_grants g WHERE g.reservation_code=reservations.code AND g.owner_hash=? AND g.expires_at>?))",
      )
      .get(code, owner, owner, iso(this.clock()));
    if (!row)
      fail(
        404,
        "RESERVATION_NOT_FOUND",
        "No se encontró una reserva accesible para esta sesión.",
      );
    return row;
  }
  requireStatus(row, status) {
    if (["expired", "cancelled"].includes(row.status))
      fail(410, "RESERVATION_EXPIRED", "La reserva expiró o fue cancelada.");
    if (row.status !== status)
      fail(
        409,
        "INVALID_STATE",
        "Esta acción no corresponde al estado de la reserva.",
      );
  }
  view(row, now) {
    const trip = this.tripView(this.tripRow(row.trip_id), row.travel_date);
    const contact = JSON.parse(row.passenger_json || "null");
    return {
      code: row.code,
      status: row.status,
      revision: row.revision,
      trip,
      route: `${trip.origin} → ${trip.destination}`,
      date: row.travel_date,
      seats: JSON.parse(row.selected_seats),
      price: row.total_cents / 100,
      passengerCount: row.passenger_count,
      contact,
      travelers: this.db
        .prepare(
          "SELECT id,seat,name,document_type AS documentType,document_number AS documentNumber,birth_date AS birthDate,guardian FROM passengers WHERE reservation_code=?",
        )
        .all(row.code),
      session_expires_at: row.session_expires_at,
      payment_deadline_at: row.payment_deadline_at,
      confirmed_at: row.confirmed_at,
      paid_at: row.paid_at,
      cancellation_reason: row.cancellation_reason,
      serviceRequests: this.db
        .prepare(
          "SELECT id,kind,message,status,response,created_at,updated_at,response_due_at FROM service_requests WHERE reservation_code=? ORDER BY created_at DESC",
        )
        .all(row.code),
      financialCases: this.db
        .prepare(
          "SELECT id,reason,status,response,refund_reference,refund_amount_cents,expected_resolution_at FROM financial_cases WHERE reservation_code=?",
        )
        .all(row.code),
      channel: row.channel,
      confirmationEmailStatus:
        this.db
          .prepare(
            "SELECT status FROM outbox WHERE reservation_code=? AND subject='Reserva confirmada · pago pendiente' ORDER BY created_at DESC LIMIT 1",
          )
          .get(row.code)?.status || null,
      server_now: iso(now),
    };
  }
  startSession(
    owner,
    { tripId, date, requestKey, passengers = 1 },
    actor = null,
    channel = "web",
  ) {
    validateDate(date);
    if (!/^[a-zA-Z0-9-]{16,80}$/.test(requestKey || ""))
      fail(400, "INVALID_REQUEST_KEY", "Falta el identificador de sesión.");
    if (
      !Number.isInteger(passengers) ||
      passengers < 1 ||
      passengers > this.policy().maxSeats
    )
      fail(400, "INVALID_PASSENGERS", "Selecciona entre 1 y 6 pasajeros.");
    return this.transaction((now) => {
      this.tripRow(tripId);
      const dep = this.departure(tripId, date);
      const existing = this.db
        .prepare(
          "SELECT * FROM reservations WHERE owner_hash=? AND request_key=?",
        )
        .get(owner, requestKey);
      if (existing) {
        if (
          existing.trip_id !== Number(tripId) ||
          existing.travel_date !== date ||
          existing.passenger_count !== passengers
        )
          fail(409, "REQUEST_KEY_REUSED", "La clave pertenece a otra reserva.");
        return this.view(existing, now);
      }
      this.requireSale(dep, now);
      const count = this.db
        .prepare(
          "SELECT COUNT(*) AS n FROM reservations WHERE owner_hash=? AND status IN ('active_session','pending_payment')",
        )
        .get(owner).n;
      if (count >= this.policy().maxActiveReservations)
        fail(
          429,
          "RESERVATION_LIMIT",
          "Tienes demasiadas reservas pendientes. Completa o cancela una antes de continuar.",
        );
      const code = "FB-" + randomUUID();
      this.db
        .prepare(
          "INSERT INTO reservations(code,owner_hash,request_key,trip_id,travel_date,status,created_at,session_expires_at,departure_id,passenger_count,channel,created_by) VALUES (?,?,?,?,?,'active_session',?,?,?,?,?,?)",
        )
        .run(
          code,
          owner,
          requestKey,
          Number(tripId),
          date,
          iso(now),
          iso(now + SESSION_DURATION_MS),
          dep.id,
          passengers,
          channel,
          actor?.id || null,
        );
      this.audit(actor?.id || owner, "session_started", code, {
        channel,
        departure: dep.id,
      });
      return this.view(this.owned(code, owner), now);
    });
  }
  selectSeats(code, owner, seats) {
    if (!Array.isArray(seats) || new Set(seats).size !== seats.length)
      fail(400, "INVALID_SEATS", "Selecciona asientos sin duplicados.");
    return this.transaction((now) => {
      const row = this.owned(code, owner);
      this.requireStatus(row, "active_session");
      const dep = this.departure(row.trip_id, row.travel_date),
        valid = this.seatLayout(dep)
          .filter((s) => !s.blocked)
          .map((s) => s.id);
      if (
        seats.length > row.passenger_count ||
        seats.some((s) => !valid.includes(s))
      )
        fail(
          400,
          "INVALID_SEATS",
          "Selecciona asientos válidos, uno por pasajero.",
        );
      const occupied = this.db
        .prepare(
          "SELECT seat FROM reservation_seats WHERE trip_id=? AND travel_date=? AND reservation_code!=?",
        )
        .all(row.trip_id, row.travel_date, code);
      if (occupied.some((r) => seats.includes(r.seat)))
        fail(
          409,
          "SEAT_UNAVAILABLE",
          "Otro canal o pasajero ha reservado ese asiento.",
        );
      this.db
        .prepare("DELETE FROM reservation_seats WHERE reservation_code=?")
        .run(code);
      for (const seat of seats)
        this.db
          .prepare("INSERT INTO reservation_seats VALUES (?,?,?,?)")
          .run(row.trip_id, row.travel_date, seat, code);
      this.db
        .prepare(
          "UPDATE reservations SET selected_seats=?,total_cents=?,revision=revision+1 WHERE code=?",
        )
        .run(
          JSON.stringify(seats),
          seats.length * this.tripRow(row.trip_id).price_cents,
          code,
        );
      return this.view(this.owned(code, owner), now);
    });
  }
  confirm(code, owner, data) {
    return this.transaction((now) => {
      const row = this.owned(code, owner);
      if (row.status === "pending_payment") return this.view(row, now);
      this.requireStatus(row, "active_session");
      const dep = this.departure(row.trip_id, row.travel_date);
      if (
        dep.status !== "scheduled" ||
        now + PAYMENT_DURATION_MS >
          Date.parse(dep.departure_at) - dep.boarding_minutes * 60000
      )
        fail(
          409,
          "SALES_CLOSED",
          "No quedan 2 horas antes del cierre de abordaje.",
        );
      const seats = JSON.parse(row.selected_seats);
      if (seats.length !== row.passenger_count)
        fail(
          400,
          "SEATS_REQUIRED",
          "Selecciona exactamente un asiento por pasajero.",
        );
      const contact = contactData(data?.contact);
      const travelers = travelersData(data?.travelers, seats, row.travel_date);
      if (
        data?.acceptTerms !== true ||
        data?.policyVersion !== this.policy().version
      )
        fail(
          400,
          "TERMS_REQUIRED",
          "Lee y acepta las condiciones y el aviso de privacidad vigentes.",
        );
      this.db
        .prepare(
          "INSERT INTO privacy_acceptances(owner_hash,version,marketing,accepted_at) VALUES (?,?,?,?)",
        )
        .run(
          owner,
          this.policy().version,
          data.marketing === true ? 1 : 0,
          iso(now),
        );
      for (const p of travelers)
        this.db
          .prepare("INSERT INTO passengers VALUES (?,?,?,?,?,?,?,?)")
          .run(
            randomUUID(),
            code,
            p.seat,
            p.name,
            p.documentType,
            p.documentNumber,
            p.birthDate,
            p.guardian,
          );
      this.db
        .prepare(
          "UPDATE reservations SET status='pending_payment',revision=revision+1,passenger_json=?,confirmed_at=?,payment_deadline_at=? WHERE code=?",
        )
        .run(
          JSON.stringify(contact),
          iso(now),
          iso(now + PAYMENT_DURATION_MS),
          code,
        );
      const pending = this.owned(code, owner);
      this.notify(
        pending,
        "Reserva confirmada · pago pendiente",
        `Reserva ${code}. Límite de pago: ${iso(now + PAYMENT_DURATION_MS)}. Ruta ${this.tripRow(row.trip_id).origin} → ${this.tripRow(row.trip_id).destination}. Terminal: ${dep.terminal_origin}. Consulta ${this.publicUrl}/mis-viajes o recupera tu reserva desde esa pantalla.`,
      );
      this.audit(owner, "reservation_confirmed", code);
      return this.view(pending, now);
    });
  }
  getReservation(code, owner) {
    return this.transaction((now) => this.view(this.owned(code, owner), now));
  }
  getMine(owner) {
    return this.transaction((now) =>
      this.db
        .prepare(
          "SELECT * FROM reservations r WHERE (owner_hash=? OR EXISTS(SELECT 1 FROM reservation_grants g WHERE g.reservation_code=r.code AND g.owner_hash=? AND g.expires_at>?)) ORDER BY created_at DESC",
        )
        .all(owner, owner, iso(now))
        .map((r) => this.view(r, now)),
    );
  }
  cancel(code, owner) {
    return this.transaction((now) => {
      const row = this.owned(code, owner);
      if (["cancelled", "expired"].includes(row.status))
        return this.view(row, now);
      if (row.status === "paid")
        fail(
          409,
          "ALREADY_PAID",
          "Solicita una gestión de posventa para una reserva pagada.",
        );
      this.db
        .prepare(
          "UPDATE reservations SET status='cancelled',revision=revision+1,cancelled_at=?,cancellation_reason='user_cancelled' WHERE code=?",
        )
        .run(iso(now), code);
      this.db
        .prepare("DELETE FROM reservation_seats WHERE reservation_code=?")
        .run(code);
      this.notify(
        row,
        "Reserva cancelada",
        "Cancelaste la reserva " + code + ". No se realizó ningún cargo.",
      );
      this.audit(owner, "reservation_cancelled", code);
      return this.view(this.owned(code, owner), now);
    });
  }
  issueTickets(row, now) {
    for (const p of this.db
      .prepare("SELECT id FROM passengers WHERE reservation_code=?")
      .all(row.code)) {
      this.db
        .prepare(
          "INSERT OR IGNORE INTO tickets(token,passenger_id,reservation_code,issued_at) VALUES (?,?,?,?)",
        )
        .run(randomBytes(24).toString("hex"), p.id, row.code, iso(now));
    }
  }
  financialCase(row, reference, reason, status = "open") {
    const time = iso(this.clock()),
      id = randomUUID();
    this.db
      .prepare(
        "INSERT INTO financial_cases(id,reservation_code,payment_reference,reason,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?)",
      )
      .run(id, row?.code || null, reference, reason, status, time, time);
    if (row)
      this.notify(
        row,
        "Pago en revisión",
        `Registramos una incidencia de pago para ${row.code}: ${reason}. Estado: ${status}. Conserva tu comprobante. Seguimiento en Mis viajes.`,
      );
    return id;
  }
  recordPayment(
    code,
    { reference, amountCents, occurredAt, mode = "provider", owner = null },
  ) {
    if (this.pilotMode && mode !== "demo")
      fail(
        403,
        "PILOT_REAL_PAYMENTS_DISABLED",
        "El piloto solo registra pagos simulados.",
      );
    if (typeof code !== "string" || code.length > 80)
      fail(400, "INVALID_RESERVATION_CODE", "Código de reserva inválido.");
    if (
      typeof reference !== "string" ||
      reference.length < 8 ||
      reference.length > 150 ||
      !Number.isSafeInteger(amountCents) ||
      amountCents <= 0 ||
      !["demo", "provider", "counter"].includes(mode)
    )
      fail(400, "INVALID_PAYMENT", "Comprobante no válido.");
    return this.transaction((now) => {
      const row = owner
        ? this.owned(code, owner)
        : this.db.prepare("SELECT * FROM reservations WHERE code=?").get(code);
      const captured = occurredAt === undefined ? iso(now) : occurredAt;
      if (
        !Number.isFinite(Date.parse(captured)) ||
        Date.parse(captured) > now + 60000
      )
        fail(400, "INVALID_PAYMENT_TIME", "Fecha de pago no válida.");
      const previous = this.db
        .prepare("SELECT * FROM payment_events WHERE reference=?")
        .get(reference);
      if (previous) {
        if (
          previous.supplied_code !== code ||
          previous.amount_cents !== amountCents ||
          previous.mode !== mode
        )
          fail(
            409,
            "PAYMENT_REFERENCE_REUSED",
            "El comprobante ya se utilizó.",
          );
        return row
          ? { ...this.view(row, now), paymentOutcome: previous.outcome }
          : { paymentOutcome: previous.outcome };
      }
      if (mode === "demo") {
        if (!row) fail(404, "RESERVATION_NOT_FOUND", "Reserva no encontrada.");
        this.requireStatus(row, "pending_payment");
      }
      let outcome = "applied",
        reason;
      if (!row) reason = "unknown_reservation";
      else if (amountCents !== row.total_cents) reason = "amount_mismatch";
      else if (row.status === "paid") reason = "duplicate_payment";
      else if (
        !row.confirmed_at ||
        Date.parse(captured) < Date.parse(row.confirmed_at) ||
        Date.parse(captured) >= Date.parse(row.payment_deadline_at)
      )
        reason = "outside_payment_deadline";
      else if (
        !["pending_payment", "cancelled"].includes(row.status) ||
        (row.status === "cancelled" &&
          row.cancellation_reason !== "payment_timeout")
      )
        reason = "cancelled_reservation";
      else {
        const dep = this.departure(row.trip_id, row.travel_date);
        const seats = JSON.parse(row.selected_seats);
        const conflicts = this.db
          .prepare(
            "SELECT seat FROM reservation_seats WHERE trip_id=? AND travel_date=? AND reservation_code!=?",
          )
          .all(row.trip_id, row.travel_date, code);
        if (
          dep.status !== "scheduled" ||
          now >= Date.parse(dep.departure_at) - dep.boarding_minutes * 60000
        )
          reason = "boarding_closed";
        else if (conflicts.some((s) => seats.includes(s.seat)))
          reason = "seat_reassigned";
      }
      if (reason)
        outcome = ["amount_mismatch", "unknown_reservation"].includes(reason)
          ? "review"
          : "refund_pending";
      this.db
        .prepare("INSERT INTO payment_events VALUES (?,?,?,?,?,?,?,?)")
        .run(
          reference,
          row?.code || null,
          code,
          amountCents,
          iso(Date.parse(captured)),
          iso(now),
          mode,
          outcome,
        );
      if (reason)
        this.financialCase(
          row,
          reference,
          reason,
          outcome === "refund_pending" ? "refund_pending" : "open",
        );
      else {
        for (const seat of JSON.parse(row.selected_seats))
          this.db
            .prepare("INSERT OR IGNORE INTO reservation_seats VALUES (?,?,?,?)")
            .run(row.trip_id, row.travel_date, seat, code);
        this.db
          .prepare("INSERT INTO payments VALUES (?,?,?,?,?)")
          .run(
            reference,
            code,
            amountCents,
            iso(now),
            mode === "demo" ? "demo" : "provider",
          );
        this.db
          .prepare(
            "UPDATE reservations SET status='paid',revision=revision+1,paid_at=?,cancelled_at=NULL,cancellation_reason=NULL WHERE code=?",
          )
          .run(iso(Date.parse(captured)), code);
        this.issueTickets(row, now);
        this.notify(
          row,
          "Pago registrado · boletos disponibles",
          `Pago registrado para ${code}. Descarga tus boletos desde ${this.publicUrl}/mis-viajes. Presenta tu documento y boleto al abordar.`,
        );
      }
      this.audit(
        mode === "provider" ? "payment_provider" : owner || "counter",
        "payment_received",
        code,
        { reference, amountCents, outcome },
      );
      return row
        ? {
            ...this.view(
              this.db
                .prepare("SELECT * FROM reservations WHERE code=?")
                .get(code),
              now,
            ),
            paymentOutcome: outcome,
          }
        : { paymentOutcome: outcome };
    });
  }
}
