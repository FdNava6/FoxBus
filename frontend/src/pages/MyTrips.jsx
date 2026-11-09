import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCartStore } from "../store/useCartStore";
import { clearDraft } from "../utils/bookingDraft";
import { formatDeadline } from "../utils/bookingTime";
import ConfirmDialog from "../components/common/ConfirmDialog";
import ReservationCode from "../components/common/ReservationCode";
import PaymentOptions from "../components/common/PaymentOptions";
import PaymentDeadline from "../components/common/PaymentDeadline";
import Button from "../components/common/Button";
import {
  reservationService,
  bookingErrorMessage,
} from "../services/reservationService";
import { operationsService } from "../services/operationsService";

const kinds = {
  reprogram: "Reprogramación",
  refund: "Devolución",
  delay: "Retraso",
  complaint: "Reclamo",
  privacy: "Privacidad",
};

export default function MyTrips() {
  const navigate = useNavigate();
  const [cancelTarget, setCancelTarget] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);
  const [kind, setKind] = useState("complaint");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    try {
      const data = await reservationService.getMyReservations();
      setReservations(
        [...data].sort(
          (a, b) => Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0),
        ),
      );
      setError("");
    } catch (e) {
      setError(bookingErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(refresh, 0),
      timer = setInterval(refresh, 5000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [refresh]);

  const act = async (fn, code) => {
    setBusy(true);
    try {
      const updated = await fn(code);
      if (
        ["cancelled", "expired"].includes(updated.status) &&
        useCartStore.getState().bookingSession?.code === code
      )
        useCartStore.getState().clearCart();
      clearDraft(code);
      await refresh();
      return true;
    } catch (e) {
      setError(bookingErrorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const send = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await operationsService.request(selected.code, { kind, message });
      setNotice("Solicitud registrada.");
      setSelected(null);
      setMessage("");
      await refresh();
    } catch (e) {
      setError(bookingErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const departure = (r) =>
    r.trip?.departure_at
      ? formatDeadline(r.trip.departure_at) + " (Perú)"
      : r.trip?.departureTime || r.date || "—";

  return (
    <main className="container-fox py-10">
      {cancelTarget && (
        <ConfirmDialog
          title="¿Cancelar esta reserva?"
          confirmLabel="Sí, cancelar reserva"
          busy={busy}
          onClose={() => setCancelTarget(null)}
          onConfirm={async () => {
            if (
              await act(reservationService.cancelReservation, cancelTarget.code)
            )
              setCancelTarget(null);
          }}
        >
          <p>Se liberarán los asientos de {cancelTarget.route}.</p>
        </ConfirmDialog>
      )}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Mis viajes</h1>
        <Link className="text-fox-pink underline" to="/recuperar">
          Recuperar una reserva
        </Link>
      </div>
      {error && (
        <p role="alert" className="my-4 rounded-xl bg-red-50 p-4 text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="my-4 rounded-xl bg-green-50 p-4">
          {notice}
        </p>
      )}
      {loading ? (
        <p>Cargando reservas...</p>
      ) : !reservations.length ? (
        <div className="space-y-3">
          <p>Aún no tienes viajes guardados.</p>
          <Link
            className="inline-block rounded-xl bg-fox-pink px-4 py-3 font-semibold text-white"
            to="/resultados"
          >
            Buscar un viaje
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {reservations.map((r) => (
            <article key={r.code} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="space-y-1">
                <p className="font-semibold">
                  {r.trip?.origin || r.route} → {r.trip?.destination || ""}
                </p>
                <p>Asiento(s): {r.seats?.join(", ") || "por elegir"}</p>
                <p>Salida: {departure(r)}</p>
              </div>
              <ReservationCode code={r.code} />

              {r.status === "active_session" && (
                <div className="mt-3 flex flex-wrap gap-3">
                  <Button
                    disabled={busy}
                    onClick={() => {
                      useCartStore.getState().resumeReservation(r);
                      navigate(
                        r.seats.length && r.seats.length === r.passengerCount
                          ? "/checkout"
                          : "/asientos",
                      );
                    }}
                  >
                    Continuar
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => setCancelTarget(r)}
                  >
                    Cancelar
                  </Button>
                </div>
              )}

              {r.status === "pending_payment" && (
                <div className="mt-3 space-y-2">
                  <PaymentDeadline reservation={r} onElapsed={refresh} />
                  <PaymentOptions reservation={r} onPaid={refresh} />
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => setCancelTarget(r)}
                  >
                    Cancelar reserva
                  </Button>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                {r.status !== "active_session" && (
                  <Link
                    className="rounded-xl border px-4 py-3 text-fox-pink"
                    to={"/reservas/" + r.code}
                  >
                    Ver comprobante
                  </Link>
                )}
                {r.status === "paid" && (
                  <Link
                    className="rounded-xl bg-fox-pink px-4 py-3 font-bold text-white"
                    to={"/boletos/" + r.code}
                  >
                    Ver QR
                  </Link>
                )}
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSelected(r);
                    setKind(r.status === "paid" ? "reprogram" : "complaint");
                    setNotice("");
                  }}
                >
                  Gestionar reclamo
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
      {selected && (
        <section className="my-6 rounded-2xl border border-fox-pink bg-white p-6">
          <h2 className="mb-4 font-bold">Solicitud para {selected.code}</h2>
          <form onSubmit={send} className="space-y-4">
            <label htmlFor="request-kind">Tipo de gestión</label>
            <select
              id="request-kind"
              className="input"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              {Object.entries(kinds)
                .filter(
                  ([key]) =>
                    selected.status === "paid" ||
                    !["reprogram", "refund"].includes(key),
                )
                .map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
            </select>
            <label htmlFor="request-message">Describe tu solicitud</label>
            <textarea
              id="request-message"
              className="input"
              required
              minLength={10}
              maxLength={2000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className="flex gap-3">
              <Button disabled={busy}>Registrar solicitud</Button>
              <Button
                variant="secondary"
                type="button"
                onClick={() => setSelected(null)}
              >
                Cerrar
              </Button>
            </div>
          </form>
        </section>
      )}
    </main>
  );
}
