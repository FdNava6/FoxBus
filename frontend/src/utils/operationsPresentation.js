export const operationLabels = {
  active_session: "Por confirmar",
  pending_payment: "Pago pendiente",
  paid: "Pagado",
  cancelled: "Cancelada",
  expired: "Sesión vencida",
  scheduled: "Programada",
  closed: "Venta cerrada",
  departed: "Salida realizada",
  open: "Abierta",
  in_review: "En revisión",
  resolved: "Resuelta",
  rejected: "Rechazada",
  refund_pending: "Devolución pendiente",
  admin: "Administración",
  agent: "Ventanilla y atención",
  finance: "Finanzas",
  boarding: "Abordaje",
  passenger: "Pasajero",
  web: "Web",
  counter: "Ventanilla",
  reprogram: "Reprogramación",
  refund: "Devolución",
  delay: "Retraso",
  complaint: "Reclamo",
  privacy: "Privacidad",
  amount_mismatch: "Importe por verificar",
  duplicate_payment: "Pago adicional",
  outside_payment_deadline: "Pago fuera de plazo",
  cancelled_reservation: "Pago sobre reserva cancelada",
  boarding_closed: "Abordaje cerrado",
  seat_reassigned: "Asiento reasignado",
  approved_refund: "Devolución aprobada",
  operator_cancelled_departure: "Salida cancelada por el operador",
  unknown_reservation: "Reserva por identificar",
};
export const operationLabel = (value) =>
  operationLabels[value] || value || "Sin dato";
export const emptyStaffFilters = () => ({
  search: "",
  status: "",
  from: "",
  to: "",
  channel: "",
});
export function newCounterDraft(departureId = "") {
  return {
    departureId,
    seats: [],
    requestKey: crypto.randomUUID(),
    acceptTerms: false,
  };
}
