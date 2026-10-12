import { randomUUID, randomBytes } from "node:crypto";
import { BookingStore } from "./booking-store.js";
import { fail, iso, digest, validateDate, limaDate } from "./domain.js";

export class OperationsStore extends BookingStore {
  requestRecovery({ code, email }) {
    const row = this.db
      .prepare("SELECT * FROM reservations WHERE code=?")
      .get(typeof code === "string" ? code : "");
    const contact = JSON.parse(row?.passenger_json || "null");
    if (
      contact?.email ===
      String(email || "")
        .trim()
        .toLowerCase()
    ) {
      const token = randomBytes(32).toString("hex");
      this.db
        .prepare(
          "INSERT INTO access_tokens(hash,kind,resource,expires_at,used_at) VALUES (?,'reservation',?,?,NULL)",
        )
        .run(digest(token), row.code, iso(this.clock() + 30 * 60000));
      this.queueMail(
        row.owner_hash,
        contact.email,
        "Recuperar reserva",
        this.publicUrl + "/recuperar?token=" + token,
        row.code,
      );
    }
    return {
      message:
        "Si los datos coinciden, se registró el envío de un enlace de acceso. Revisa el correo del comprador.",
    };
  }
  redeemRecovery(token, owner) {
    return this.transaction((now) => {
      const hash = digest(String(token || ""));
      const row = this.db
        .prepare(
          "SELECT * FROM access_tokens WHERE hash=? AND kind='reservation' AND expires_at>?",
        )
        .get(hash, iso(now));
      if (!row) fail(410, "LINK_EXPIRED", "El enlace expiró o ya fue usado.");
      if (row.used_at) {
        if (row.used_owner !== owner)
          fail(410, "LINK_EXPIRED", "El enlace ya fue utilizado.");
        return this.view(this.owned(row.resource, owner), now);
      }
      this.db
        .prepare(
          "INSERT INTO reservation_grants VALUES (?,?,?) ON CONFLICT(reservation_code,owner_hash) DO UPDATE SET expires_at=excluded.expires_at",
        )
        .run(row.resource, owner, iso(now + 7 * 86400000));
      this.db
        .prepare("UPDATE access_tokens SET used_at=?,used_owner=? WHERE hash=?")
        .run(iso(now), owner, hash);
      this.audit(owner, "reservation_recovered", row.resource);
      return this.view(this.owned(row.resource, owner), now);
    });
  }
  ticketsFor(code, owner) {
    return this.transaction((now) => {
      const row = this.owned(code, owner);
      this.requireStatus(row, "paid");
      const travelerCount = this.db
        .prepare(
          "SELECT COUNT(*) AS n FROM passengers WHERE reservation_code=?",
        )
        .get(code).n;
      if (
        !row.departure_id ||
        travelerCount !== JSON.parse(row.selected_seats).length ||
        travelerCount === 0
      )
        fail(
          409,
          "LEGACY_DATA_REVIEW_REQUIRED",
          "Esta reserva anterior necesita revisión de salida y viajeros antes de emitir boletos.",
        );
      return this.db
        .prepare(
          "SELECT t.token,t.issued_at,t.checked_in_at,p.seat,p.name,p.document_type,p.document_number FROM tickets t JOIN passengers p ON p.id=t.passenger_id WHERE t.reservation_code=?",
        )
        .all(code)
        .map((t) => ({
          ...t,
          code,
          trip: this.view(row, now).trip,
          price: row.total_cents / 100,
          qrText: "FOXBUS:" + t.token,
        }));
    });
  }
  requestService(code, owner, { kind, message }) {
    if (
      !["reprogram", "refund", "delay", "complaint", "privacy"].includes(
        kind,
      ) ||
      typeof message !== "string" ||
      message.trim().length < 10 ||
      message.length > 2000
    )
      fail(
        400,
        "INVALID_REQUEST",
        "Describe tu solicitud con al menos 10 caracteres.",
      );
    return this.transaction((now) => {
      const row = this.owned(code, owner);
      if (["reprogram", "refund"].includes(kind) && row.status !== "paid")
        fail(
          409,
          "PAID_RESERVATION_REQUIRED",
          "Esta gestión requiere una reserva pagada.",
        );
      if (
        this.db
          .prepare(
            "SELECT id FROM service_requests WHERE reservation_code=? AND kind=? AND status IN ('open','in_review')",
          )
          .get(code, kind)
      )
        fail(
          409,
          "REQUEST_EXISTS",
          "Ya tienes una solicitud de este tipo en atención.",
        );
      const id = randomUUID(),
        time = iso(now);
      this.db
        .prepare(
          "INSERT INTO service_requests(id,reservation_code,owner_hash,kind,message,created_at,updated_at) VALUES (?,?,?,?,?,?,?)",
        )
        .run(id, code, owner, kind, message.trim(), time, time);
      this.notify(
        row,
        "Solicitud registrada",
        `Tu solicitud ${id} (${kind}) fue registrada. Consulta su estado en Mis viajes. El registro no confirma una devolución ni un cambio de fecha.`,
      );
      this.audit(owner, "service_requested", id, { kind });
      return this.view(this.owned(code, owner), now);
    });
  }
  staffReservations() {
    return this.transaction((now) =>
      this.db
        .prepare(
          "SELECT * FROM reservations ORDER BY created_at DESC LIMIT 500",
        )
        .all()
        .map((r) => this.view(r, now)),
    );
  }
  requests() {
    return this.db
      .prepare(
        "SELECT s.*,r.trip_id,r.travel_date FROM service_requests s JOIN reservations r ON r.code=s.reservation_code ORDER BY s.created_at DESC LIMIT 500",
      )
      .all();
  }
  financialCases() {
    return this.db
      .prepare(
        "SELECT * FROM financial_cases ORDER BY created_at DESC LIMIT 500",
      )
      .all();
  }
  resolveRequest(id, actor, { status, response, targetDepartureId, seatMap }) {
    if (
      !["in_review", "resolved", "rejected"].includes(status) ||
      typeof response !== "string" ||
      response.trim().length < 10 ||
      response.length > 2000
    )
      fail(
        400,
        "INVALID_RESPONSE",
        "Indica un estado y una respuesta de atención.",
      );
    return this.transaction((now) => {
      const req = this.db
        .prepare("SELECT * FROM service_requests WHERE id=?")
        .get(id);
      if (!req) fail(404, "NOT_FOUND", "Solicitud no encontrada.");
      if (["resolved", "rejected"].includes(req.status))
        fail(409, "REQUEST_CLOSED", "La solicitud ya fue cerrada.");
      const row = this.db
        .prepare("SELECT * FROM reservations WHERE code=?")
        .get(req.reservation_code);
      if (status === "resolved" && req.kind === "refund") {
        if (!["admin", "finance"].includes(actor.role))
          fail(
            403,
            "ROLE_REQUIRED",
            "La aprobación de devolución requiere Finanzas.",
          );
        this.requireStatus(row, "paid");
        this.financialCase(row, null, "approved_refund", "refund_pending");
        this.db
          .prepare(
            "UPDATE reservations SET status='cancelled',revision=revision+1,cancellation_reason='refund_approved',cancelled_at=? WHERE code=?",
          )
          .run(iso(now), row.code);
        this.db
          .prepare("DELETE FROM reservation_seats WHERE reservation_code=?")
          .run(row.code);
      }
      if (status === "resolved" && req.kind === "reprogram") {
        const dep = this.db
          .prepare("SELECT * FROM departures WHERE id=?")
          .get(targetDepartureId || "");
        if (!dep)
          fail(400, "TARGET_REQUIRED", "Selecciona la salida de destino.");
        this.requireSale(dep, now);
        this.requireStatus(row, "paid");
        const oldTrip = this.tripRow(row.trip_id),
          newTrip = this.tripRow(dep.trip_id);
        if (
          oldTrip.origin !== newTrip.origin ||
          oldTrip.destination !== newTrip.destination ||
          oldTrip.price_cents !== newTrip.price_cents
        )
          fail(
            409,
            "FARE_REVIEW_REQUIRED",
            "La ruta o tarifa cambió; requiere cotización y conciliación antes de reprogramar.",
          );
        this.moveSeats(row, dep, seatMap);
        this.db
          .prepare(
            "UPDATE reservations SET trip_id=?,travel_date=?,departure_id=?,revision=revision+1 WHERE code=?",
          )
          .run(dep.trip_id, dep.travel_date, dep.id, row.code);
      }
      this.db
        .prepare(
          "UPDATE service_requests SET status=?,response=?,updated_at=?,resolved_by=? WHERE id=?",
        )
        .run(status, response.trim(), iso(now), actor.id, id);
      this.notify(
        row,
        "Actualización de solicitud",
        `Solicitud ${id}: ${status}. ${response.trim()}`,
      );
      this.audit(actor.id, "service_updated", id, { status });
      return { status };
    });
  }
  moveSeats(row, dep, seatMap) {
    const old = JSON.parse(row.selected_seats),
      layout = this.seatLayout(dep)
        .filter((s) => !s.blocked)
        .map((s) => s.id);
    if (!seatMap || typeof seatMap !== "object")
      fail(
        400,
        "SEAT_MAPPING_REQUIRED",
        "Indica la correspondencia de cada asiento.",
      );
    const next = old.map((s) => seatMap[s]);
    const others = this.db
      .prepare(
        "SELECT seat FROM reservation_seats WHERE trip_id=? AND travel_date=? AND reservation_code!=?",
      )
      .all(dep.trip_id, dep.travel_date, row.code)
      .map((r) => r.seat);
    if (
      new Set(next).size !== old.length ||
      next.some((s) => !layout.includes(s) || others.includes(s))
    )
      fail(
        409,
        "INVALID_SEAT_MAPPING",
        "El mapa contiene asientos inválidos, duplicados u ocupados.",
      );
    this.db
      .prepare("DELETE FROM reservation_seats WHERE reservation_code=?")
      .run(row.code);
    // Libera también la restricción única de pasajeros antes de cambiar etiquetas.
    const passengers = this.db
      .prepare("SELECT id,seat FROM passengers WHERE reservation_code=?")
      .all(row.code);
    for (const p of passengers)
      this.db
        .prepare("UPDATE passengers SET seat=? WHERE id=?")
        .run("moving-" + p.id, p.id);
    for (const p of passengers)
      this.db
        .prepare("UPDATE passengers SET seat=? WHERE id=?")
        .run(seatMap[p.seat], p.id);
    for (const seat of next)
      this.db
        .prepare("INSERT INTO reservation_seats VALUES (?,?,?,?)")
        .run(dep.trip_id, dep.travel_date, seat, row.code);
    this.db
      .prepare("UPDATE reservations SET selected_seats=? WHERE code=?")
      .run(JSON.stringify(next), row.code);
  }
  checkIn(token, actor, documentNumber) {
    return this.transaction((now) => {
      const clean = String(token || "").replace(/^FOXBUS:/, "");
      const ticket = this.db
        .prepare("SELECT * FROM tickets WHERE token=?")
        .get(clean);
      if (!ticket) fail(404, "INVALID_TICKET", "Boleto no válido.");
      const row = this.db
        .prepare("SELECT * FROM reservations WHERE code=?")
        .get(ticket.reservation_code);
      this.requireStatus(row, "paid");
      const dep = this.departure(row.trip_id, row.travel_date);
      if (
        dep.status !== "scheduled" ||
        now < Date.parse(dep.departure_at) - 60 * 60000 ||
        now >= Date.parse(dep.departure_at)
      )
        fail(
          409,
          "BOARDING_CLOSED",
          "Abordaje disponible desde 60 minutos antes de la salida.",
        );
      if (ticket.checked_in_at)
        fail(
          409,
          "ALREADY_CHECKED_IN",
          "Este boleto ya fue utilizado para abordar.",
        );
      const p = this.db
        .prepare(
          "SELECT name,seat,document_type,document_number FROM passengers WHERE id=?",
        )
        .get(ticket.passenger_id);
      if (
        typeof documentNumber !== "string" ||
        documentNumber.trim().toUpperCase() !== p.document_number
      )
        fail(
          409,
          "DOCUMENT_MISMATCH",
          "El documento físico no coincide con el viajero del boleto.",
        );
      this.db
        .prepare(
          "UPDATE tickets SET checked_in_at=?,checked_in_by=? WHERE token=?",
        )
        .run(iso(now), actor.id, clean);
      this.audit(actor.id, "passenger_boarded", ticket.reservation_code);
      return { status: "boarded", passenger: p, checked_in_at: iso(now) };
    });
  }
  vehicles() {
    return this.db
      .prepare("SELECT * FROM vehicles")
      .all()
      .map((v) => ({
        id: v.id,
        label: v.label,
        seats: JSON.parse(v.seats_json),
      }));
  }
  departures() {
    return this.db
      .prepare(
        "SELECT d.*,t.origin,t.destination FROM departures d JOIN trips t ON t.id=d.trip_id ORDER BY departure_at",
      )
      .all();
  }
  saveVehicle({ id, label, seats }, actor) {
    if (
      typeof id !== "string" ||
      !id.match(/^[A-Za-z0-9-]{2,60}$/) ||
      typeof label !== "string" ||
      label.length < 3 ||
      label.length > 150 ||
      !Array.isArray(seats) ||
      seats.length < 1 ||
      seats.length > 80 ||
      new Set(seats.map((s) => s.id)).size !== seats.length ||
      new Set(seats.map((s) => s.floor + ":" + s.row + ":" + s.col)).size !==
        seats.length ||
      seats.some(
        (s) =>
          !s.id?.match(/^[A-Za-z0-9-]{1,8}$/) ||
          ![1, 2].includes(s.floor) ||
          !Number.isInteger(s.row) ||
          s.row < 1 ||
          s.row > 30 ||
          ![1, 2, 3, 4].includes(s.col),
      )
    )
      fail(
        400,
        "INVALID_VEHICLE",
        "Revisa el identificador, nombre y mapa del bus.",
      );
    if (
      this.db
        .prepare(
          "SELECT id FROM departures WHERE vehicle_id=? AND departure_at>?",
        )
        .get(id, iso(this.clock()))
    )
      fail(
        409,
        "VEHICLE_IN_USE",
        "Crea otra versión del bus; este mapa tiene salidas programadas.",
      );
    const clean = seats.map((s) => ({
      id: s.id,
      row: s.row,
      col: s.col,
      floor: s.floor,
      category: String(s.category || "Estándar").slice(0, 40),
      blocked: s.blocked === true,
    }));
    this.db
      .prepare(
        "INSERT INTO vehicles VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET label=excluded.label,seats_json=excluded.seats_json",
      )
      .run(id, label, JSON.stringify(clean));
    this.audit(actor.id, "vehicle_saved", id);
    return { id };
  }
  createDeparture(
    {
      tripId,
      date,
      vehicleId,
      departureAt,
      terminalOrigin,
      terminalDestination,
      boardingMinutes = 30,
    },
    actor,
  ) {
    validateDate(date);
    this.tripRow(tripId);
    if (
      !this.db
        .prepare("SELECT id FROM vehicles WHERE id=?")
        .get(vehicleId || "")
    )
      fail(400, "INVALID_VEHICLE", "Bus no encontrado.");
    const at = Date.parse(departureAt);
    if (Number.isFinite(at) && limaDate(at) !== date)
      fail(
        400,
        "DATE_MISMATCH",
        "La fecha debe coincidir con la salida en hora de Perú.",
      );
    if (
      !Number.isFinite(at) ||
      !Number.isInteger(boardingMinutes) ||
      boardingMinutes < 15 ||
      boardingMinutes > 120 ||
      typeof terminalOrigin !== "string" ||
      terminalOrigin.length < 5 ||
      terminalOrigin.length > 300 ||
      typeof terminalDestination !== "string" ||
      terminalDestination.length < 5 ||
      terminalDestination.length > 300
    )
      fail(400, "INVALID_DEPARTURE", "Revisa fecha, terminales y abordaje.");
    const dep = {
      departure_at: iso(at),
      boarding_minutes: boardingMinutes,
      status: "scheduled",
    };
    this.requireSale(dep, this.clock());
    this.requireVehicleAvailable(
      vehicleId,
      iso(at),
      iso(at + this.tripRow(tripId).duration_minutes * 60000),
    );
    if (
      this.db
        .prepare("SELECT id FROM departures WHERE trip_id=? AND travel_date=?")
        .get(Number(tripId), date)
    )
      fail(409, "DEPARTURE_EXISTS", "Ya existe esa salida en la fecha.");
    const id = randomUUID();
    this.db
      .prepare(
        "INSERT INTO departures(id,trip_id,travel_date,vehicle_id,departure_at,arrival_at,terminal_origin,terminal_destination,boarding_minutes) VALUES (?,?,?,?,?,?,?,?,?)",
      )
      .run(
        id,
        Number(tripId),
        date,
        vehicleId,
        iso(at),
        iso(at + this.tripRow(tripId).duration_minutes * 60000),
        terminalOrigin,
        terminalDestination,
        boardingMinutes,
      );
    this.audit(actor.id, "departure_created", id);
    return { id };
  }
  changeDeparture(id, actor, { status, vehicleId, seatMap, message }) {
    if (
      typeof message !== "string" ||
      message.trim().length < 10 ||
      message.length > 1000
    )
      fail(400, "REASON_REQUIRED", "Describe el motivo del cambio.");
    return this.transaction((now) => {
      const dep = this.db
        .prepare("SELECT * FROM departures WHERE id=?")
        .get(id);
      if (!dep) fail(404, "NOT_FOUND", "Salida no encontrada.");
      if (dep.status === "departed")
        fail(409, "DEPARTURE_FINISHED", "La salida ya partió.");
      const rows = this.db
        .prepare(
          "SELECT * FROM reservations WHERE departure_id=? AND status IN ('paid','active_session','pending_payment')",
        )
        .all(id);
      if (vehicleId) {
        this.requireVehicleAvailable(
          vehicleId,
          dep.departure_at,
          dep.arrival_at,
          id,
        );
        if (
          !this.db.prepare("SELECT id FROM vehicles WHERE id=?").get(vehicleId)
        )
          fail(400, "INVALID_VEHICLE", "Bus no encontrado.");
        // Se remapea el conjunto de asientos a la vez: evita intercambios parciales y colisiones.
        const newLayout = JSON.parse(
          this.db
            .prepare("SELECT seats_json FROM vehicles WHERE id=?")
            .get(vehicleId).seats_json,
        )
          .filter((s) => !s.blocked)
          .map((s) => s.id);
        const held = rows.flatMap((r) => JSON.parse(r.selected_seats));
        const next = held.map((s) => seatMap?.[s]);
        if (
          new Set(next).size !== held.length ||
          next.some((s) => !newLayout.includes(s))
        )
          fail(
            409,
            "INVALID_SEAT_MAPPING",
            "Se requiere un mapa completo de asientos sin duplicados.",
          );
        this.db
          .prepare(
            "DELETE FROM reservation_seats WHERE trip_id=? AND travel_date=?",
          )
          .run(dep.trip_id, dep.travel_date);
        this.db
          .prepare("UPDATE departures SET vehicle_id=? WHERE id=?")
          .run(vehicleId, id);
        for (const row of rows) {
          this.moveSeats(row, { ...dep, vehicle_id: vehicleId }, seatMap);
          this.db
            .prepare("UPDATE reservations SET revision=revision+1 WHERE code=?")
            .run(row.code);
          this.notify(row, "Cambio de bus", message);
        }
      }
      if (status) {
        if (!["scheduled", "closed", "cancelled"].includes(status))
          fail(400, "INVALID_STATE", "Estado de salida inválido.");
        this.db
          .prepare("UPDATE departures SET status=? WHERE id=?")
          .run(status, id);
        if (status === "cancelled")
          for (const row of rows) {
            if (row.status === "paid")
              this.financialCase(
                row,
                null,
                "operator_cancelled_departure",
                "refund_pending",
              );
            this.db
              .prepare(
                "UPDATE reservations SET status='cancelled',revision=revision+1,cancellation_reason='operator_cancelled_departure',cancelled_at=? WHERE code=?",
              )
              .run(iso(now), row.code);
            this.db
              .prepare("DELETE FROM reservation_seats WHERE reservation_code=?")
              .run(row.code);
            this.notify(
              row,
              "Salida cancelada",
              message + " La devolución, si corresponde, queda en seguimiento.",
            );
          }
      }
      this.audit(actor.id, "departure_updated", id, {
        status: status || null,
        vehicleId: vehicleId || null,
        message,
      });
      return { id, status: status || dep.status };
    });
  }
  resolveFinancialCase(id, { reference, amountCents, response }, actor) {
    if (
      typeof reference !== "string" ||
      reference.length < 8 ||
      reference.length > 150 ||
      typeof response !== "string" ||
      response.length < 10 ||
      !Number.isSafeInteger(amountCents) ||
      amountCents <= 0
    )
      fail(
        400,
        "INVALID_REFUND",
        "Registra un comprobante e importe de devolución válidos.",
      );
    return this.transaction((now) => {
      const item = this.db
        .prepare("SELECT * FROM financial_cases WHERE id=?")
        .get(id);
      if (!item) fail(404, "NOT_FOUND", "Caso no encontrado.");
      if (item.status === "resolved")
        fail(409, "CASE_CLOSED", "El caso ya se cerró.");
      const event = item.payment_reference
        ? this.db
            .prepare(
              "SELECT amount_cents FROM payment_events WHERE reference=?",
            )
            .get(item.payment_reference)
        : null;
      const reservation = item.reservation_code
        ? this.db
            .prepare("SELECT * FROM reservations WHERE code=?")
            .get(item.reservation_code)
        : null;
      if (amountCents !== (event?.amount_cents || reservation?.total_cents))
        fail(
          400,
          "REFUND_AMOUNT_MISMATCH",
          "El importe no coincide con el dinero pendiente.",
        );
      if (
        this.db
          .prepare("SELECT id FROM financial_cases WHERE refund_reference=?")
          .get(reference)
      )
        fail(409, "REFUND_REFERENCE_REUSED", "Comprobante ya usado.");
      this.db
        .prepare(
          "UPDATE financial_cases SET status='resolved',response=?,refund_reference=?,refund_amount_cents=?,resolved_by=?,updated_at=? WHERE id=?",
        )
        .run(response, reference, amountCents, actor.id, iso(now), id);
      if (reservation)
        this.notify(
          reservation,
          "Devolución registrada",
          `Devolución de S/ ${(amountCents / 100).toFixed(2)}. Referencia: ${reference}. ${response}`,
        );
      this.audit(actor.id, "refund_recorded", id, { reference, amountCents });
      return { status: "resolved" };
    });
  }
  requireVehicleAvailable(vehicleId, start, end, exceptId = "") {
    const conflict = this.db
      .prepare(
        "SELECT id FROM departures WHERE vehicle_id=? AND id!=? AND status!='cancelled' AND departure_at<? AND arrival_at>?",
      )
      .get(
        vehicleId,
        exceptId,
        iso(Date.parse(end) + 30 * 60000),
        iso(Date.parse(start) - 30 * 60000),
      );
    if (conflict)
      fail(
        409,
        "VEHICLE_SCHEDULE_CONFLICT",
        "El vehículo ya tiene otra salida o no cumple el margen de preparación de 30 minutos.",
      );
  }
  setPolicy(policy, actor) {
    const old = this.policy(),
      allowed = [
        "legalName",
        "taxId",
        "supportEmail",
        "supportPhone",
        "address",
        "baggageKg",
        "retentionDays",
        "offers",
      ];
    const next = { ...old, version: iso(this.clock()) };
    for (const key of allowed)
      if (Object.hasOwn(policy, key)) next[key] = policy[key];
    if (
      typeof next.legalName !== "string" ||
      next.legalName.length > 200 ||
      typeof next.taxId !== "string" ||
      (next.taxId && !/^\d{11}$/.test(next.taxId)) ||
      typeof next.supportEmail !== "string" ||
      (next.supportEmail &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.supportEmail)) ||
      typeof next.supportPhone !== "string" ||
      next.supportPhone.length > 30 ||
      typeof next.address !== "string" ||
      next.address.length > 300 ||
      (next.baggageKg !== null &&
        (!Number.isInteger(next.baggageKg) ||
          next.baggageKg < 0 ||
          next.baggageKg > 50)) ||
      (next.retentionDays !== null &&
        (!Number.isInteger(next.retentionDays) ||
          next.retentionDays < 30 ||
          next.retentionDays > 3650)) ||
      !Array.isArray(next.offers) ||
      next.offers.length > 10 ||
      next.offers.some((o) => typeof o !== "string" || o.length > 200)
    )
      fail(400, "INVALID_POLICY", "Revisa las políticas del operador.");
    this.db
      .prepare("UPDATE operator_settings SET value=? WHERE key='policy'")
      .run(JSON.stringify(next));
    this.audit(actor.id, "policy_updated", "operator", {
      version: next.version,
    });
    return next;
  }
  chatbot(message) {
    const p = this.policy(),
      m = String(message || "").toLowerCase();
    if (m.includes("equipaje"))
      return {
        message:
          p.baggageKg === null
            ? "El operador todavía debe publicar su política de equipaje. Confírmala con atención al cliente antes de comprar."
            : `La franquicia publicada es de ${p.baggageKg} kg. Consulta cargos adicionales con el operador.`,
      };
    if (m.includes("oferta"))
      return {
        message: p.offers.length
          ? p.offers.join(" · ")
          : "No hay promociones publicadas actualmente.",
      };
    if (m.includes("horario"))
      return {
        message:
          "Los horarios y disponibilidad se consultan en Buscar viajes. Solo se muestran salidas programadas que aún admiten reservas.",
      };
    if (m.includes("devol") || m.includes("reprogram") || m.includes("retras"))
      return {
        message:
          "Registra tu solicitud en Mis viajes. Recibirás un número de seguimiento y una respuesta del personal. Una solicitud no equivale a aprobación ni a devolución bancaria.",
      };
    return {
      message:
        "Puedes buscar salidas, consultar reservas, recuperar acceso y registrar solicitudes en Mis viajes. " +
        (p.supportPhone
          ? "Atención: " + p.supportPhone
          : "El canal de atención del operador todavía debe configurarse."),
    };
  }
  routes() {
    return this.db
      .prepare(
        "SELECT id,origin,destination,departure_time AS departureTime,duration_minutes AS durationMinutes,price_cents AS priceCents,service FROM trips",
      )
      .all();
  }
  createRoute(
    {
      origin,
      destination,
      durationMinutes,
      priceCents,
      service,
      departureTime = "06:00",
    },
    actor,
  ) {
    origin = typeof origin === "string" ? origin.trim() : origin;
    destination =
      typeof destination === "string" ? destination.trim() : destination;
    service = typeof service === "string" ? service.trim() : service;
    if (
      typeof origin !== "string" ||
      typeof destination !== "string" ||
      origin.length < 2 ||
      destination.length < 2 ||
      origin.length > 100 ||
      destination.length > 100 ||
      origin.toLowerCase() === destination.toLowerCase() ||
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 15 ||
      durationMinutes > 4320 ||
      !Number.isSafeInteger(priceCents) ||
      priceCents < 1 ||
      typeof service !== "string" ||
      service.length < 3 ||
      service.length > 60 ||
      !/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(departureTime)
    )
      fail(400, "INVALID_ROUTE", "Revisa ruta, duración, tarifa y servicio.");
    const row = this.db
      .prepare(
        "INSERT INTO trips(origin,destination,departure_time,duration_minutes,price_cents,service) VALUES (?,?,?,?,?,?)",
      )
      .run(
        origin.trim(),
        destination.trim(),
        departureTime,
        durationMinutes,
        priceCents,
        service.trim(),
      );
    this.audit(actor.id, "route_created", String(row.lastInsertRowid));
    return { id: Number(row.lastInsertRowid) };
  }
}
