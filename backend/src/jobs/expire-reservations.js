import { pathToFileURL } from "node:url";
import { BookingStore } from "../booking-store.js";
export function startExpirationJob(
  store,
  { intervalMs = 1000, onError = console.error } = {},
) {
  if (!Number.isInteger(intervalMs) || intervalMs < 1000)
    throw new Error("Intervalo del job >=1000 ms.");
  const run = () => {
    try {
      store.runExpiration();
    } catch (error) {
      store.db
        .prepare(
          "INSERT INTO job_health VALUES ('expiration',NULL,?) ON CONFLICT(name) DO UPDATE SET last_error=excluded.last_error",
        )
        .run("expiration_failed");
      onError(error);
    }
  };
  run();
  const timer = setInterval(run, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const store = new BookingStore(
    process.env.DATABASE_PATH || "./data/foxbus.sqlite",
  );
  try {
    console.log(JSON.stringify(store.runExpiration()));
  } finally {
    store.close();
  }
}
