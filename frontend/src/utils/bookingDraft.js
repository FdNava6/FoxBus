const PREFIX = "foxbus_booking_draft:";
const storage = () =>
  typeof sessionStorage === "undefined" ? null : sessionStorage;
export function readDraft(code, now = Date.now(), target = storage()) {
  try {
    const value = JSON.parse(target?.getItem(PREFIX + code) || "null");
    if (!value || value.expiresAt <= now) {
      target?.removeItem(PREFIX + code);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}
export function saveDraft(code, data, expiresAt, target = storage()) {
  if (!code || !Number.isFinite(Date.parse(expiresAt))) return false;
  try {
    target?.setItem(
      PREFIX + code,
      JSON.stringify({ ...data, expiresAt: Date.parse(expiresAt) }),
    );
    return Boolean(target);
  } catch {
    return false;
  }
}
export function clearDraft(code, target = storage()) {
  try {
    target?.removeItem(PREFIX + code);
  } catch {
    /* navegador sin almacenamiento */
  }
}
export function clearAllDrafts(target = storage()) {
  try {
    const keys = Array.from({ length: target?.length || 0 }, (_, i) =>
      target.key(i),
    );
    keys
      .filter((k) => k?.startsWith(PREFIX))
      .forEach((k) => target.removeItem(k));
  } catch {
    /* navegador sin almacenamiento */
  }
}
