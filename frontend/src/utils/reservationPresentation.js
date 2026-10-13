export const reservationLabels = {
  active_session: "Por confirmar",
  pending_payment: "Pago pendiente",
  paid: "Pagado",
  cancelled: "Cancelada",
  expired: "Sesión expirada",
};
export function groupReservations(reservations, now = Date.now()) {
  const groups = { active: [], pending: [], upcoming: [], history: [] };
  for (const r of reservations) {
    if (r.status === "active_session") groups.active.push(r);
    else if (r.status === "pending_payment") groups.pending.push(r);
    else if (
      r.status === "paid" &&
      r.trip.status === "scheduled" &&
      Date.parse(r.trip.departure_at) > now
    )
      groups.upcoming.push(r);
    else groups.history.push(r);
  }
  return groups;
}
export function contactLinks(policy) {
  return {
    email: policy?.supportEmail ? "mailto:" + policy.supportEmail : null,
    phone:
      policy?.supportPhone && /\d/.test(policy.supportPhone)
        ? "tel:" + policy.supportPhone.replace(/[^+\d]/g, "")
        : null,
  };
}
