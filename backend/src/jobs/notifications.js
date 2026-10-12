import { randomUUID } from "node:crypto";
import { iso } from "../domain.js";
export async function deliverNotifications(
  store,
  { endpoint = "", apiKey = "", fetchImpl = fetch } = {},
) {
  if (!endpoint) return { configured: false, delivered: 0 };
  if (!endpoint.startsWith("https://"))
    throw new Error("MAIL_WEBHOOK_URL debe usar HTTPS.");
  let delivered = 0;
  const rows = store.db
    .prepare(
      "SELECT * FROM outbox WHERE ((status IN ('pending','failed') AND attempts<6 AND next_attempt_at<=?) OR (status='sending' AND locked_until<=?)) ORDER BY created_at LIMIT 20",
    )
    .all(iso(store.clock()), iso(store.clock()));
  for (const row of rows) {
    const claim = store.db
      .prepare(
        "UPDATE outbox SET status='sending',attempts=attempts+1,locked_until=? WHERE id=? AND (status!='sending' OR locked_until<=?)",
      )
      .run(iso(store.clock() + 60000), row.id, iso(store.clock()));
    if (!claim.changes) continue;
    try {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + apiKey,
          "Idempotency-Key": row.id,
        },
        body: JSON.stringify({
          id: row.id,
          to: row.recipient,
          subject: row.subject,
          text: row.body,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error("mail_provider_" + response.status);
      store.db
        .prepare(
          "UPDATE outbox SET status='delivered',last_error=NULL,locked_until=NULL WHERE id=?",
        )
        .run(row.id);
      delivered++;
    } catch (error) {
      store.db
        .prepare(
          "UPDATE outbox SET status='failed',next_attempt_at=?,locked_until=NULL,last_error=? WHERE id=?",
        )
        .run(
          iso(store.clock() + Math.min(3600000, 30000 * 2 ** row.attempts)),
          String(error.message).slice(0, 100),
          row.id,
        );
    }
  }
  store.db
    .prepare(
      "INSERT INTO job_health VALUES ('notifications',?,NULL) ON CONFLICT(name) DO UPDATE SET last_success_at=excluded.last_success_at,last_error=NULL",
    )
    .run(iso(store.clock()));
  return { configured: true, delivered };
}
export function startNotificationJob(store, options = {}) {
  let busy = false;
  const run = async () => {
    if (busy) return;
    busy = true;
    try {
      await deliverNotifications(store, options);
    } catch {
      store.db
        .prepare(
          "INSERT INTO job_health VALUES ('notifications',NULL,'notification_job_failed') ON CONFLICT(name) DO UPDATE SET last_error=excluded.last_error",
        )
        .run();
    } finally {
      busy = false;
    }
  };
  void run();
  const timer = setInterval(run, 15000);
  timer.unref();
  return () => clearInterval(timer);
}
