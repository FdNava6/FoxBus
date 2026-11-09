import { useEffect, useState } from "react";
import { operationsService } from "../../services/operationsService";
import { bookingErrorMessage } from "../../services/reservationService";
import OperatorContact from "./OperatorContact";
import Button from "./Button";
import PaymentGateway from "./PaymentGateway";
export default function PaymentOptions({ reservation, onPaid }) {
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
    <section aria-label="Cómo pagar tu reserva">
      {error && (
        <p role="alert" className="my-4 text-red-700">
          {error}
        </p>
      )}
      {!options ? (
        <p className="my-4">Cargando formas de pago…</p>
      ) : options.simulation ? (
        <PaymentGateway reservation={reservation} onPaid={onPaid} />
      ) : (
        <div className="my-4 space-y-3 rounded-xl border border-gray-200 p-4">
          <h3 className="font-bold">Cómo pagar tu reserva</h3>
          {options.onlineAvailable ? (
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
          {options.instructions && (
            <div className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3">
              <h4 className="mb-2 font-semibold">
                Otros medios publicados por el operador
              </h4>
              {options.instructions}
            </div>
          )}
          {!options.instructions && !options.onlineAvailable && (
            <p>
              No hay un medio de pago real publicado. No envíes dinero a cuentas
              no verificadas.
            </p>
          )}
          <OperatorContact policy={options} compact />
          <p className="text-sm text-gray-600">
            Incluye tu código de reserva. Guarda el comprobante y espera el
            estado “Pagado”; enviar una captura no confirma el pago. Si ya
            pagaste y no se actualiza, contacta al operador antes de repetirlo.
          </p>
        </div>
      )}
    </section>
  );
}
