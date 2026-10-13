import { useEffect, useState } from "react";
import { operationsService } from "../../services/operationsService";
import { bookingErrorMessage } from "../../services/reservationService";
import OperatorContact from "./OperatorContact";
import Button from "./Button";
import { presentationMode } from "../../utils/presentationMode";
export default function PaymentOptions({ reservation }) {
  const [options, setOptions] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    operationsService
      .paymentOptions(reservation.code)
      .then((r) => {
        if (active) setOptions(r);
      })
      .catch((e) => {
        if (active) setError(bookingErrorMessage(e));
      });
    return () => {
      active = false;
    };
  }, [reservation.code]);
  const pay = async () => {
    setBusy(true);
    setError("");
    try {
      const data = await operationsService.startCheckout(reservation.code);
      window.location.assign(data.checkoutUrl);
    } catch (e) {
      setError(bookingErrorMessage(e));
      setBusy(false);
    }
  };
  return (
    <section
      className="my-4 space-y-3 rounded-xl border border-gray-200 p-4"
      aria-label="Cómo pagar tu reserva"
    >
      <h3 className="font-bold">Cómo pagar tu reserva</h3>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {!options ? (
        <p>Cargando formas de pago…</p>
      ) : (
        <>
          {options.simulation ? (
            presentationMode ? (
              <p>
                Confirma el pago desde tu reserva antes de que venza el plazo.
              </p>
            ) : (
              <p className="rounded-lg bg-blue-50 p-3 text-blue-950">
                Solo pagos de prueba. Usa “Simular pago” para completar el
                recorrido; no ingreses tarjetas, no transfieras dinero ni
                entregues efectivo. Los boletos resultantes no permiten viajar.
              </p>
            )
          ) : options.onlineAvailable ? (
            <>
              <Button disabled={busy} onClick={pay}>
                {busy ? "Abriendo pago seguro…" : "Pagar online"}
              </Button>
              <p>
                Continuarás al sitio del proveedor. El boleto se emite después
                de verificar el pago.
              </p>
            </>
          ) : (
            <p>El pago online no está habilitado para esta reserva.</p>
          )}
          {!options.simulation && options.instructions && (
            <div className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3">
              <h4 className="mb-2 font-semibold">
                Otros medios publicados por el operador
              </h4>
              {options.instructions}
            </div>
          )}
          {!options.simulation &&
            !options.instructions &&
            !options.onlineAvailable && (
              <p>
                No hay un medio de pago real publicado. No envíes dinero a
                cuentas no verificadas.
              </p>
            )}
          {!options.simulation && <OperatorContact policy={options} compact />}
          {!options.simulation && (
            <p className="text-sm text-gray-600">
              Incluye tu código de reserva. Guarda el comprobante y espera el
              estado “Pagado”; enviar una captura no confirma el pago. Si ya
              pagaste y no se actualiza, contacta al operador antes de
              repetirlo.
            </p>
          )}
          {options.demo && !presentationMode && (
            <p className="text-sm text-blue-800">
              Modo de prueba: “Simular pago” no cobra dinero.
            </p>
          )}
        </>
      )}
    </section>
  );
}
