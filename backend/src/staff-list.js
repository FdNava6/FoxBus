import { fail, validateDate } from "./domain.js";

export function staffList(db, kind, params, present = (row) => row) {
  const specs = {
    reservations: {
      from: "reservations r JOIN trips t ON t.id=r.trip_id",
      select: "r.*",
      key: "r.code",
      status: "r.status",
      states: [
        "active_session",
        "pending_payment",
        "paid",
        "cancelled",
        "expired",
      ],
      date: "r.travel_date",
      search: [
        "r.code",
        "json_extract(r.passenger_json,'$.name')",
        "json_extract(r.passenger_json,'$.email')",
        "t.origin || ' ' || t.destination",
      ],
      order: "r.created_at DESC,r.code DESC",
    },
    requests: {
      from: "service_requests s JOIN reservations r ON r.code=s.reservation_code JOIN trips t ON t.id=r.trip_id",
      select: "s.*,r.trip_id,r.travel_date,t.origin,t.destination",
      key: "s.id",
      status: "s.status",
      states: ["open", "in_review", "resolved", "rejected"],
      date: "r.travel_date",
      search: [
        "s.id",
        "s.reservation_code",
        "s.message",
        "json_extract(r.passenger_json,'$.name')",
        "t.origin || ' ' || t.destination",
      ],
      order: "s.created_at DESC,s.id DESC",
    },
    financial: {
      from: "financial_cases f LEFT JOIN reservations r ON r.code=f.reservation_code LEFT JOIN trips t ON t.id=r.trip_id",
      select: "f.*,r.travel_date,t.origin,t.destination",
      key: "f.id",
      status: "f.status",
      states: ["open", "refund_pending", "resolved"],
      date: "r.travel_date",
      search: [
        "f.id",
        "f.reservation_code",
        "f.payment_reference",
        "f.refund_reference",
        "json_extract(r.passenger_json,'$.name')",
        "json_extract(r.passenger_json,'$.email')",
        "t.origin || ' ' || t.destination",
      ],
      order: "f.created_at DESC,f.id DESC",
    },
  };
  const spec = specs[kind];
  if (!spec) fail(400, "INVALID_LIST", "Listado no disponible.");
  const number = (value, fallback, max) => {
    if (value === undefined || value === "") return fallback;
    if (
      !/^\d+$/.test(String(value)) ||
      Number(value) < 1 ||
      Number(value) > max
    )
      fail(400, "INVALID_PAGE", "Página o tamaño de página inválido.");
    return Number(value);
  };
  let page = number(params.page, 1, 1000000);
  const pageSize = number(params.pageSize, 25, 100),
    where = [],
    values = [];
  if (params.status) {
    if (!spec.states.includes(params.status))
      fail(400, "INVALID_STATUS", "Estado de filtro inválido.");
    where.push(spec.status + "=?");
    values.push(params.status);
  }
  for (const [name, operator] of [
    ["from", ">="],
    ["to", "<="],
  ]) {
    if (params[name]) {
      validateDate(params[name]);
      where.push(spec.date + operator + "?");
      values.push(params[name]);
    }
  }
  if (params.from && params.to && params.from > params.to)
    fail(
      400,
      "INVALID_DATE_RANGE",
      "La fecha inicial no puede superar la final.",
    );
  if (params.channel) {
    if (kind !== "reservations" || !["web", "counter"].includes(params.channel))
      fail(400, "INVALID_CHANNEL", "Canal de filtro inválido.");
    where.push("r.channel=?");
    values.push(params.channel);
  }
  const search = String(params.search || "").trim();
  if (search.length > 120)
    fail(400, "SEARCH_TOO_LONG", "Usa una búsqueda de hasta 120 caracteres.");
  if (search) {
    const escaped =
      "%" + search.replace(/[\\%_]/g, (value) => "\\" + value) + "%";
    where.push(
      "(" +
        spec.search
          .map((column) => column + " LIKE ? ESCAPE '\\'")
          .join(" OR ") +
        ")",
    );
    values.push(...spec.search.map(() => escaped));
  }
  const filter = where.length ? " WHERE " + where.join(" AND ") : "";
  const total = db
    .prepare("SELECT COUNT(*) AS total FROM " + spec.from + filter)
    .get(...values).total;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  page = Math.min(page, totalPages);
  const rows = db
    .prepare(
      "SELECT " +
        spec.select +
        " FROM " +
        spec.from +
        filter +
        " ORDER BY " +
        spec.order +
        " LIMIT ? OFFSET ?",
    )
    .all(...values, pageSize, (page - 1) * pageSize);
  return { items: rows.map(present), total, page, pageSize, totalPages };
}
