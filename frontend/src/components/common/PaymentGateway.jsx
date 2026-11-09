import { useMemo, useState } from "react";
import {
  bookingErrorMessage,
  reservationService,
} from "../../services/reservationService";
import { formatCurrency } from "../../utils/helpers";
import Button from "./Button";

const METHODS = [
  { id: "visa", label: "Visa", kind: "card" },
  { id: "credit", label: "Crédito", kind: "card" },
  { id: "yape", label: "Yape", kind: "wallet" },
  { id: "plin", label: "Plin", kind: "wallet" },
];

const digitsOnly = (value) => String(value || "").replace(/\D/g, "");

const luhnValid = (value) => {
  let sum = 0,
    double = false;
  for (let i = value.length - 1; i >= 0; i--) {
    let n = Number(value[i]);
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return value.length > 0 && sum % 10 === 0;
};

const formatCardNumber = (value) =>
  digitsOnly(value).slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

const formatExpiry = (value) => {
  const digits = digitsOnly(value).slice(0, 4);
  return digits.length > 2
    ? digits.slice(0, 2) + "/" + digits.slice(2)
    : digits;
};

const expiryValid = (value) => {
  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(value);
  if (!match) return false;
  const now = new Date(),
    year = 2000 + Number(match[2]),
    month = Number(match[1]);
  return (
    year > now.getFullYear() ||
    (year === now.getFullYear() && month >= now.getMonth() + 1)
  );
};

export default function PaymentGateway({ reservation, onPaid }) {
  const [method, setMethod] = useState("visa");
  const [card, setCard] = useState({
    number: "",
    holder: "",
    expiry: "",
    cvv: "",
  });
  const [wallet, setWallet] = useState({ phone: "", code: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const current = METHODS.find((m) => m.id === method);
  const isCard = current.kind === "card";
  const cardDigits = digitsOnly(card.number);

  const cardChecks = useMemo(
    () => ({
      number:
        cardDigits.length === 16 &&
        luhnValid(cardDigits) &&
        (method !== "visa" || cardDigits.startsWith("4")),
      holder: card.holder.trim().length >= 3,
      expiry: expiryValid(card.expiry),
      cvv: /^\d{3,4}$/.test(card.cvv),
    }),
    [cardDigits, card.holder, card.expiry, card.cvv, method],
  );
  const cardReady = Object.values(cardChecks).every(Boolean);

  const walletChecks = {
    phone: /^9\d{8}$/.test(wallet.phone),
    code: /^\d{6}$/.test(wallet.code),
  };
  const walletReady = Object.values(walletChecks).every(Boolean);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError("");
    const details = isCard
      ? {
          cardNumber: cardDigits,
          holder: card.holder.trim(),
          expiry: card.expiry,
          cvv: card.cvv,
        }
      : { phone: wallet.phone, code: wallet.code };
    setBusy(true);
    try {
      const updated = await reservationService.payWithMethod(reservation.code, {
        method,
        details,
      });
      setDone(true);
      onPaid?.(updated);
    } catch (e) {
      setError(bookingErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (done)
    return (
      <section className="my-4 rounded-xl border border-green-200 bg-green-50 p-4">
        <p role="status" className="font-semibold text-green-800">
          Pago aprobado. Tus boletos están listos.
        </p>
      </section>
    );

  return (
    <section
      id="pasarela-pago"
      className="my-4 space-y-4 rounded-2xl border border-gray-200 bg-white p-5"
      aria-label="Pasarela de pago"
    >
      <div>
        <h3 className="text-lg font-bold">Pasarela de pago</h3>
        <p className="text-sm text-gray-600">
          Total a pagar:{" "}
          <span className="font-bold text-gray-900">
            {formatCurrency(reservation.price)}
          </span>
        </p>
      </div>

      <div role="tablist" aria-label="Medio de pago" className="flex flex-wrap gap-2">
        {METHODS.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={method === m.id}
            onClick={() => {
              setMethod(m.id);
              setError("");
            }}
            className={
              "rounded-lg border px-3 py-2 text-sm font-semibold " +
              (method === m.id
                ? "border-fox-pink bg-fox-pink text-white"
                : "border-gray-300 bg-white text-gray-700")
            }
          >
            {m.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-3">
        {isCard ? (
          <>
            <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-700 p-5 text-white shadow-md">
              <div className="mb-6 flex items-center justify-between text-xs uppercase tracking-widest text-gray-300">
                <span>{method === "visa" ? "Visa" : "Tarjeta"}</span>
                <span>Débito / Crédito</span>
              </div>
              <p className="mb-4 font-mono text-lg tracking-widest">
                {card.number || "•••• •••• •••• ••••"}
              </p>
              <div className="flex items-end justify-between gap-4 text-xs uppercase">
                <div className="min-w-0">
                  <p className="text-gray-400">Titular</p>
                  <p className="truncate">{card.holder || "NOMBRE APELLIDO"}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400">Vence</p>
                  <p>{card.expiry || "MM/AA"}</p>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="card-number" className="mb-1 block text-sm">
                Número de tarjeta (16 dígitos)
              </label>
              <input
                id="card-number"
                className="input font-mono"
                inputMode="numeric"
                autoComplete="cc-number"
                maxLength={19}
                placeholder="4111 1111 1111 1111"
                value={card.number}
                onChange={(e) =>
                  setCard({ ...card, number: formatCardNumber(e.target.value) })
                }
                required
              />
              {card.number && !cardChecks.number && (
                <p className="mt-1 text-xs text-red-700">
                  Revisa el número: debe tener 16 dígitos y ser válido.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="card-holder" className="mb-1 block text-sm">
                Nombre del titular
              </label>
              <input
                id="card-holder"
                className="input"
                autoComplete="cc-name"
                maxLength={150}
                placeholder="Como aparece en la tarjeta"
                value={card.holder}
                onChange={(e) => setCard({ ...card, holder: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="card-expiry" className="mb-1 block text-sm">
                  Vencimiento (MM/AA)
                </label>
                <input
                  id="card-expiry"
                  className="input font-mono"
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  maxLength={5}
                  placeholder="12/28"
                  value={card.expiry}
                  onChange={(e) =>
                    setCard({ ...card, expiry: formatExpiry(e.target.value) })
                  }
                  required
                />
              </div>
              <div>
                <label htmlFor="card-cvv" className="mb-1 block text-sm">
                  CVV
                </label>
                <input
                  id="card-cvv"
                  className="input font-mono"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  type="password"
                  maxLength={4}
                  placeholder="123"
                  value={card.cvv}
                  onChange={(e) =>
                    setCard({
                      ...card,
                      cvv: digitsOnly(e.target.value).slice(0, 4),
                    })
                  }
                  required
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Prueba con la tarjeta 4111 1111 1111 1111. No se realizará ningún
              cargo real.
            </p>
          </>
        ) : (
          <>
            <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-950">
              Aprueba el pago desde tu app {current.label}. Ingresa tu número y
              el código de aprobación de 6 dígitos.
            </p>
            <div>
              <label htmlFor="wallet-phone" className="mb-1 block text-sm">
                Celular {current.label} (9 dígitos)
              </label>
              <input
                id="wallet-phone"
                className="input font-mono"
                inputMode="numeric"
                maxLength={9}
                placeholder="987654321"
                value={wallet.phone}
                onChange={(e) =>
                  setWallet({
                    ...wallet,
                    phone: digitsOnly(e.target.value).slice(0, 9),
                  })
                }
                required
              />
            </div>
            <div>
              <label htmlFor="wallet-code" className="mb-1 block text-sm">
                Código de aprobación (6 dígitos)
              </label>
              <input
                id="wallet-code"
                className="input font-mono"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={wallet.code}
                onChange={(e) =>
                  setWallet({
                    ...wallet,
                    code: digitsOnly(e.target.value).slice(0, 6),
                  })
                }
                required
              />
            </div>
            <p className="text-xs text-gray-500">
              Pago simulado: no se realizará ningún cargo real.
            </p>
          </>
        )}

        {error && (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        )}

        <Button
          fullWidth
          disabled={busy || (isCard ? !cardReady : !walletReady)}
        >
          {busy
            ? "Procesando pago…"
            : "Pagar " + formatCurrency(reservation.price)}
        </Button>
      </form>
    </section>
  );
}
