import { useState } from "react";
export default function ReservationCode({ code }) {
  const [message, setMessage] = useState(""),
    [manual, setManual] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setMessage("Código copiado.");
    } catch {
      setManual(true);
      setMessage("Selecciona el código y cópialo manualmente.");
    }
  };
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">Código de reserva</p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 break-all rounded-lg bg-gray-50 p-2 text-sm">
          {code}
        </code>
        <button
          type="button"
          onClick={copy}
          className="min-h-11 rounded-lg border border-fox-pink px-3 text-sm font-semibold text-fox-pink"
        >
          Copiar código
        </button>
      </div>
      {manual && (
        <input
          aria-label="Código para copiar manualmente"
          readOnly
          value={code}
          onFocus={(e) => e.target.select()}
          className="input font-mono text-sm"
        />
      )}
      <p role="status" className="text-sm text-gray-600">
        {message}
      </p>
    </div>
  );
}
