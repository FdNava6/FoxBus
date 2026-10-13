import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCartStore } from "../store/useCartStore";
import { clearDraft } from "../utils/bookingDraft";
import {
  reservationLabels as labels,
  groupReservations,
} from "../utils/reservationPresentation";
import { formatDeadline } from "../utils/bookingTime";
import ConfirmDialog from "../components/common/ConfirmDialog";
import ReservationCode from "../components/common/ReservationCode";
import PaymentOptions from "../components/common/PaymentOptions";
import {
  reservationService,
  bookingErrorMessage,
} from "../services/reservationService";
import { operationsService } from "../services/operationsService";
import { formatCurrency } from "../utils/helpers";
import PaymentDeadline from "../components/common/PaymentDeadline";
import Button from "../components/common/Button";
const kinds = {
  reprogram: "Reprogramación",
  refund: "Devolución",
  delay: "Retraso",
  complaint: "Reclamo",
  privacy: "Privacidad",
};
const requestStates = {
  open: "Registrada",
  in_review: "En revisión",
  resolved: "Resuelta",
  rejected: "Rechazada",
};
const paymentReasons = {
  amount_mismatch: "Importe por verificar",
  duplicate_payment: "Pago adicional detectado",
  outside_payment_deadline: "Pago fuera del plazo",
  cancelled_reservation: "Pago sobre reserva cancelada",
  boarding_closed: "Pago recibido con abordaje cerrado",
  seat_reassigned: "Asiento reasignado; devolución en seguimiento",
  approved_refund: "Devolución aprobada",
  operator_cancelled_departure: "Salida cancelada por el operador",
};
export default function MyTrips() {
  const navigate = useNavigate();
  const [cancelTarget, setCancelTarget] = useState(null),
    [filter, setFilter] = useState("all");
  const [reservations, setReservations] = useState([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false),
    [selected, setSelected] = useState(null),
    [kind, setKind] = useState("complaint"),
    [message, setMessage] = useState(""),
    [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    try {
      setReservations(await reservationService.getMyReservations());
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
      setNotice(
        "Solicitud registrada. Consulta abajo su identificador y seguimiento.",
      );
      setSelected(null);
      setMessage("");
      await refresh();
    } catch (e) {
      setError(bookingErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const groups = groupReservations(reservations);
  const groupNames = {
    active: "Por confirmar",
    pending: "Pendientes de pago",
    upcoming: "Próximos viajes",
    history: "Historial",
  };
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
          <p>
            Se liberarán los asientos de {cancelTarget.route}. Si ya pagaste y
            el pago aún no aparece, contacta al operador antes de cancelar.
          </p>
        </ConfirmDialog>
      )}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Mis viajes</h1>
        <Link className="text-fox-pink underline" to="/recuperar">
          Recuperar una reserva
        </Link>
      </div>
      <p className="mb-6 text-sm text-gray-600">
        Con una cuenta puedes consultar desde otros dispositivos. Las compras
        sin cuenta se recuperan mediante el correo del comprador.
      </p>
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
          <p>Aún no tienes viajes guardados en esta sesión.</p>
          <Link
            className="inline-block rounded-xl bg-fox-pink px-4 py-3 font-semibold text-white"
            to="/resultados"
          >
            Buscar un viaje
          </Link>
          <p>
            Si ya compraste, usa “Recuperar una reserva” con el correo del
            comprador.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <nav aria-label="Filtrar mis viajes" className="flex flex-wrap gap-2">
            {Object.entries({ all: "Todos", ...groupNames }).map(
              ([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={filter === key}
                  onClick={() => setFilter(key)}
                  className={
                    "min-h-11 rounded-lg border px-3 text-sm " +
                    (filter === key ? "bg-fox-pink text-white" : "bg-white")
                  }
                >
                  {label}
                  {key !== "all" ? " (" + groups[key].length + ")" : ""}
                </button>
              ),
            )}
          </nav>
          {Object.entries(groups)
            .filter(([key]) => filter === "all" || filter === key)
            .map(([key, items]) => (
              <section key={key} className="space-y-4">
                <h2 className="text-xl font-bold">{groupNames[key]}</h2>
                {!items.length && (
                  <p className="text-sm text-gray-600">
                    No hay viajes en esta sección.
                  </p>
                )}
                {items.map((r) => (
                  <article key={r.code} className="rounded-2xl bg-white p-6">
                    <div className="flex flex-wrap justify-between gap-3">
                      <h3 className="font-bold">{r.route}</h3>
                      <span
                        className={
                          "rounded-full px-3 py-1 text-sm " +
                          (r.status === "paid" ? "bg-green-50" : "bg-amber-50")
                        }
                      >
                        {labels[r.status]}
                      </span>
                    </div>
                    <p className="my-2">
                      {r.trip.departure_at
                        ? formatDeadline(r.trip.departure_at) + " (Perú)"
                        : r.date}{" "}
                      · Asientos {r.seats.join(", ") || "por elegir"} ·{" "}
                      {formatCurrency(r.price)}
                    </p>
                    <ReservationCode code={r.code} />
                    {r.status === "active_session" && (
                      <div className="my-3 space-y-2">
                        <p>
                          Termina de seleccionar asientos y confirmar antes de{" "}
                          {formatDeadline(r.session_expires_at)} (Perú).
                        </p>
                        <Button
                          disabled={busy}
                          onClick={() => {
                            useCartStore.getState().resumeReservation(r);
                            navigate(
                              r.seats.length === r.passengerCount
                                ? "/checkout"
                                : "/asientos",
                            );
                          }}
                        >
                          Continuar reserva
                        </Button>
                        <Button
                          className="ml-2"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => setCancelTarget(r)}
                        >
                          Cancelar selección
                        </Button>
                      </div>
                    )}
                    {r.status === "pending_payment" && (
                      <>
                        <PaymentDeadline reservation={r} onElapsed={refresh} />
                        <PaymentOptions reservation={r} />
                        <div className="flex flex-wrap gap-3">
                          {r.payment_mode === "demo" && (
                            <Button
                              disabled={busy}
                              onClick={() =>
                                act(reservationService.payDemo, r.code)
                              }
                            >
                              Simular pago (sin cobro)
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            disabled={busy}
                            onClick={() => setCancelTarget(r)}
                          >
                            Cancelar reserva
                          </Button>
                        </div>
                      </>
                    )}
                    {r.cancellation_reason === "payment_timeout" && (
                      <p className="my-3 text-red-700">
                        El plazo de pago venció. Asientos liberados.
                      </p>
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
                          Ver boletos QR
                        </Link>
                      )}
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setSelected(r);
                          setKind(
                            r.status === "paid" ? "reprogram" : "complaint",
                          );
                          setNotice("");
                        }}
                      >
                        Gestionar viaje o reclamo
                      </Button>
                    </div>
                    {r.financialCases?.map((c) => (
                      <p
                        key={c.id}
                        className="my-3 rounded-xl bg-amber-50 p-3 text-sm"
                      >
                        Seguimiento de pago:{" "}
                        {c.status === "resolved" ? "Cerrado" : "En atención"} ·{" "}
                        {paymentReasons[c.reason] || "Incidencia de pago"}{" "}
                        {c.response || ""}{" "}
                        {c.expected_resolution_at &&
                          " Fecha estimada por el operador: " +
                            formatDeadline(c.expected_resolution_at) +
                            "."}{" "}
                        {c.refund_reference
                          ? "Comprobante: " + c.refund_reference
                          : ""}
                      </p>
                    ))}
                    {r.serviceRequests?.length > 0 && (
                      <div className="mt-5 space-y-3 border-t pt-4">
                        <h3 className="font-bold">
                          Seguimiento de solicitudes
                        </h3>
                        {r.serviceRequests.map((s) => (
                          <div
                            key={s.id}
                            className="rounded-xl bg-gray-50 p-3 text-sm"
                          >
                            <p>
                              {kinds[s.kind]} ·{" "}
                              {requestStates[s.status] || s.status}
                            </p>
                            <p className="break-all">Solicitud: {s.id}</p>
                            <p>{s.message}</p>
                            {s.response_due_at && (
                              <p>
                                Respuesta prevista antes de{" "}
                                {formatDeadline(s.response_due_at)} (Perú).
                                {Date.parse(s.response_due_at) < Date.now() &&
                                ["open", "in_review"].includes(s.status)
                                  ? " El plazo informado ya venció; contacta al operador."
                                  : ""}
                              </p>
                            )}
                            <p className="mt-2 font-semibold">
                              {s.response ||
                                "Pendiente de respuesta del personal."}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </section>
            ))}
        </div>
      )}
      {selected && (
        <section className="my-6 rounded-2xl border border-fox-pink bg-white p-6">
          <h2 className="mb-4 font-bold">Solicitud para {selected.route}</h2>
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
            <p className="text-sm text-gray-600">
              Registrar la solicitud no equivale a aprobar un cambio o realizar
              una devolución bancaria.
            </p>
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
