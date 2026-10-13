import { fail } from "./domain.js";
export const POLICY_DEFAULTS = {
  supportHours: "",
  paymentInstructions: "",
  changePolicy: "",
  refundPolicy: "",
  serviceResponseHours: null,
};
export function operatorReady(policy) {
  return Boolean(
    policy.legalName?.trim() &&
    policy.taxId &&
    policy.supportEmail &&
    policy.address?.trim() &&
    policy.changePolicy?.trim() &&
    policy.refundPolicy?.trim() &&
    policy.baggageKg !== null,
  );
}
export function checkoutConfigured(config) {
  try {
    const endpoint = new URL(config.endpoint);
    return Boolean(
      config.token &&
      Array.isArray(config.hosts) &&
      config.hosts.length &&
      config.hosts.every(
        (h) => typeof h === "string" && /^[a-z0-9.-]+$/.test(h),
      ) &&
      safeCheckoutUrl(config.endpoint, [endpoint.hostname]),
    );
  } catch {
    return false;
  }
}
export async function hostedCheckout(
  store,
  code,
  owner,
  config,
  request = fetch,
) {
  let reservation = store.getReservation(code, owner);
  if (reservation.status !== "pending_payment")
    fail(
      409,
      "INVALID_STATE",
      "Solo una reserva pendiente de pago puede iniciar el pago.",
    );
  if (!checkoutConfigured(config))
    fail(
      503,
      "CHECKOUT_UNAVAILABLE",
      "El pago online todavía no está disponible. Consulta las instrucciones y los canales del operador.",
    );
  const cached = store.db
    .prepare("SELECT * FROM payment_checkouts WHERE reservation_code=?")
    .get(code);
  if (cached && Date.parse(cached.expires_at) > store.clock()) {
    if (safeCheckoutUrl(cached.checkout_url, config.hosts))
      return { checkoutUrl: cached.checkout_url };
  }
  let response;
  try {
    response = await request(config.endpoint, {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + config.token,
        "Idempotency-Key": "foxbus-checkout-" + code,
      },
      body: JSON.stringify({
        code,
        amountCents: Math.round(reservation.price * 100),
        currency: "PEN",
        expiresAt: reservation.payment_deadline_at,
        returnUrl: store.publicUrl + "/reservas/" + encodeURIComponent(code),
      }),
    });
  } catch {
    fail(
      503,
      "CHECKOUT_UNAVAILABLE",
      "No se pudo abrir el pago. Tu reserva conserva su plazo; vuelve a intentar o contacta al operador.",
    );
  }
  if (!response.ok)
    fail(
      503,
      "CHECKOUT_UNAVAILABLE",
      "El proveedor no pudo abrir el pago. No vuelvas a pagar si ya tienes un comprobante.",
    );
  let result;
  try {
    result = await response.json();
  } catch {
    fail(
      503,
      "CHECKOUT_UNAVAILABLE",
      "El servicio de pago devolvió una respuesta inválida.",
    );
  }
  if (!safeCheckoutUrl(result.checkoutUrl, config.hosts))
    fail(
      503,
      "UNSAFE_CHECKOUT_URL",
      "No se pudo verificar el destino de pago.",
    );
  reservation = store.getReservation(code, owner);
  if (reservation.status !== "pending_payment")
    fail(
      409,
      "INVALID_STATE",
      "La reserva cambió de estado. Consulta Mis viajes antes de pagar.",
    );
  const current = store.db
    .prepare(
      "SELECT checkout_url FROM payment_checkouts WHERE reservation_code=?",
    )
    .get(code);
  if (current && safeCheckoutUrl(current.checkout_url, config.hosts))
    return { checkoutUrl: current.checkout_url };
  store.db
    .prepare(
      "INSERT INTO payment_checkouts VALUES (?,?,?,?) ON CONFLICT(reservation_code) DO UPDATE SET checkout_url=excluded.checkout_url,expires_at=excluded.expires_at",
    )
    .run(
      code,
      result.checkoutUrl,
      reservation.payment_deadline_at,
      new Date(store.clock()).toISOString(),
    );
  store.audit(owner, "payment_checkout_opened", code);
  return { checkoutUrl: result.checkoutUrl };
}
export function safeCheckoutUrl(value, hosts) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      hosts.includes(url.hostname) &&
      (!url.port || url.port === "443")
    );
  } catch {
    return false;
  }
}
