import { createHash } from "node:crypto";
export class BookingError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export const fail = (status, code, message) => {
  throw new BookingError(status, code, message);
};
export const iso = (ms) => new Date(ms).toISOString();
export const digest = (value) =>
  createHash("sha256").update(value).digest("hex");
export function ownerHash(client) {
  if (!/^[a-f0-9]{64}$/.test(client || ""))
    fail(401, "CLIENT_REQUIRED", "Falta la credencial de este navegador.");
  return digest(client);
}
export const accountOwner = (id) => digest("account:" + id);
export function validateDate(date) {
  if (
    typeof date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    iso(Date.parse(date)).slice(0, 10) !== date
  )
    fail(400, "INVALID_DATE", "Indica una fecha válida.");
}
export const limaDate = (ms) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
export function contactData(data) {
  if (
    !data ||
    typeof data.name !== "string" ||
    !data.name.trim() ||
    data.name.length > 150 ||
    typeof data.phone !== "string" ||
    !/^\+?[\d\s-]{7,20}$/.test(data.phone) ||
    typeof data.email !== "string" ||
    data.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
  ) {
    fail(
      400,
      "INVALID_CONTACT",
      "Revisa nombre del comprador, teléfono y correo.",
    );
  }
  return {
    name: data.name.trim(),
    phone: data.phone.trim(),
    email: data.email.toLowerCase().trim(),
  };
}
export function travelersData(data, seats, departureDate) {
  if (
    !Array.isArray(data) ||
    data.length !== seats.length ||
    new Set(data.map((p) => p?.seat)).size !== seats.length
  )
    fail(
      400,
      "PASSENGERS_REQUIRED",
      "Ingresa los datos de un pasajero por cada asiento.",
    );
  const travelers = data.map((p) => {
    const patterns = {
      DNI: /^\d{8}$/,
      CE: /^[A-Z0-9]{6,15}$/,
      PASSPORT: /^[A-Z0-9]{5,20}$/,
    };
    const document = String(p.documentNumber || "").toUpperCase();
    if (
      !seats.includes(p.seat) ||
      typeof p.name !== "string" ||
      !p.name.trim() ||
      p.name.length > 150 ||
      !patterns[p.documentType]?.test(document)
    )
      fail(
        400,
        "INVALID_PASSENGER",
        "Revisa pasajero, asiento y documento (DNI, CE o pasaporte).",
      );
    validateDate(p.birthDate);
    if (p.birthDate > departureDate || p.birthDate < "1900-01-01")
      fail(400, "INVALID_BIRTH_DATE", "Revisa la fecha de nacimiento.");
    const [y, m, d] = departureDate.split("-").map(Number),
      [by, bm, bd] = p.birthDate.split("-").map(Number);
    const age = y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
    if (
      age < 18 &&
      (typeof p.guardian !== "string" ||
        p.guardian.trim().length < 3 ||
        p.guardian.length > 150)
    )
      fail(
        400,
        "GUARDIAN_REQUIRED",
        "Indica el adulto responsable del pasajero menor de edad.",
      );
    return {
      seat: p.seat,
      name: p.name.trim(),
      documentType: p.documentType,
      documentNumber: document,
      birthDate: p.birthDate,
      guardian: age < 18 ? p.guardian.trim() : null,
    };
  });
  if (
    new Set(travelers.map((p) => p.documentType + ":" + p.documentNumber))
      .size !== travelers.length
  )
    fail(
      400,
      "DUPLICATE_DOCUMENT",
      "Un mismo documento no puede ocupar varios asientos.",
    );
  return travelers;
}
