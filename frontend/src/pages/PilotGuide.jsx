import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { operationsService } from "../services/operationsService";
import { bookingErrorMessage } from "../services/reservationService";
import Button from "../components/common/Button";
import { formatDeadline } from "../utils/bookingTime";
import { presentationMode } from "../utils/presentationMode";

export default function PilotGuide() {
  const [health, setHealth] = useState(null),
    [messages, setMessages] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    operationsService
      .health()
      .then(setHealth)
      .catch((e) => setError(bookingErrorMessage(e)));
  }, []);
  const mailbox = async () => {
    setBusy(true);
    setError("");
    try {
      setMessages(await operationsService.mailbox());
    } catch (e) {
      setError(bookingErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  if (presentationMode)
    return (
      <main className="container-fox space-y-6 py-8">
        <h1 className="text-2xl font-bold">Mis mensajes</h1>
        <p>Consulta los mensajes asociados a tu cuenta o a este navegador.</p>
        {error && (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        )}
        <Button disabled={busy} onClick={mailbox}>
          {busy ? "Consultando mensajes…" : "Ver mis mensajes"}
        </Button>
        {messages?.length === 0 && (
          <p>No hay mensajes asociados a esta sesión.</p>
        )}
        {messages?.map((message) => (
          <article
            key={message.id}
            className="space-y-2 rounded-2xl border bg-white p-5"
          >
            <h2 className="font-bold">{message.subject}</h2>
            <p className="text-sm">{formatDeadline(message.created_at)}</p>
            <p className="whitespace-pre-wrap break-words text-sm">
              {message.body}
            </p>
          </article>
        ))}
        <Link
          to="/mis-viajes"
          className="font-semibold text-fox-pink underline"
        >
          Volver a Mis viajes
        </Link>
      </main>
    );
  return (
    <main className="container-fox space-y-6 py-8">
      <h1 className="text-2xl font-bold">Piloto sin cobros reales</h1>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {!health && !error && <p>Comprobando modo de la aplicación…</p>}
      {health && health.app_mode !== "pilot" && (
        <p>
          Esta instancia no tiene activado el piloto aislado. No uses esta guía
          como autorización para simular operaciones.
        </p>
      )}
      {health?.app_mode === "pilot" && (
        <>
          <section className="space-y-3 rounded-2xl bg-blue-50 p-5 text-blue-950">
            <h2 className="text-lg font-bold">Antes de empezar</h2>
            <p>
              No hay un viaje, cargo ni devolución real. Usa nombres inventados,
              correos como participante01@example.test y documentos de prueba.
              No ingreses tarjetas, contraseñas habituales ni datos de otras
              personas.
            </p>
            <p>
              Las reservas sí se guardan en una base separada del piloto. El
              correo queda en un buzón local y no se envía a ninguna dirección
              externa.
            </p>
          </section>
          <section className="space-y-4 rounded-2xl border p-5">
            <h2 className="text-lg font-bold">
              Recorrido sugerido · 15–20 minutos
            </h2>
            <ol className="list-decimal space-y-3 pl-5">
              <li>
                Busca Lima → Trujillo para mañana. Comprueba duración,
                terminales, llegada y precio total.
              </li>
              <li>
                Selecciona un asiento y completa datos ficticios. Recarga una
                vez: el plazo original de 10 minutos no debe reiniciarse.
              </li>
              <li>
                Confirma sin pagar y revisa el plazo de 2 horas. En Mis viajes
                puedes cancelar o usar “Simular pago”. Nunca envíes dinero.
              </li>
              <li>
                Guarda el comprobante y el boleto QR. Ambos deben indicar que no
                tienen validez para viajar. Solicita una devolución de prueba y
                revisa su seguimiento.
              </li>
              <li>
                Vuelve sin ayuda a Mis viajes. Cuenta al coordinador dónde
                dudaste o no pudiste continuar; no incluyas documentos ni claves
                en el feedback.
              </li>
            </ol>
            <p className="text-sm text-gray-600">
              Los vencimientos mantienen sus tiempos reales. La prueba
              automática comprueba los límites exactos adelantando únicamente un
              reloj aislado, no el del piloto.
            </p>
            <Link
              to="/resultados?origin=Lima&destination=Trujillo"
              className="inline-block font-bold text-fox-pink underline"
            >
              Empezar búsqueda de prueba
            </Link>
          </section>
          <section className="space-y-4 rounded-2xl border p-5">
            <h2 className="text-lg font-bold">
              Mensajes de prueba de tu sesión
            </h2>
            <p>
              Solo se muestran los mensajes asociados a esta cuenta o navegador.
              “Guardado localmente” no significa enviado por correo. Para
              ensayar recuperación sin cuenta, obtén el enlace desde el
              navegador original y ábrelo una sola vez en tu segundo navegador
              de prueba.
            </p>
            <Button disabled={busy} onClick={mailbox}>
              {busy ? "Consultando mensajes…" : "Ver mis mensajes de prueba"}
            </Button>
            {messages?.length === 0 && (
              <p>No hay mensajes asociados a esta sesión.</p>
            )}
            {messages?.map((message) => (
              <article
                key={message.id}
                className="space-y-2 rounded-xl bg-gray-50 p-4"
              >
                <h3 className="font-bold">{message.subject}</h3>
                <p className="text-sm">
                  Guardado localmente · {formatDeadline(message.created_at)}
                </p>
                <p className="whitespace-pre-wrap break-words text-sm">
                  {message.body}
                </p>
              </article>
            ))}
          </section>
          <p className="text-sm text-gray-600">
            Esto evalúa el funcionamiento y la facilidad de uso. No demuestra
            ventas, demanda ni intención real de compra; esas conclusiones
            necesitan investigación con un operador y pasajeros.
          </p>
        </>
      )}
    </main>
  );
}
