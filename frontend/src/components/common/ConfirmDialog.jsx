import { useEffect, useId, useRef } from "react";
import Button from "./Button";
export default function ConfirmDialog({
  title,
  children,
  confirmLabel,
  onConfirm,
  onClose,
  busy = false,
}) {
  const ref = useRef(null),
    id = useId();
  useEffect(() => {
    const element = ref.current;
    element.showModal();
    return () => element.close();
  }, []);
  return (
    <dialog
      ref={ref}
      role="alertdialog"
      aria-labelledby={id}
      aria-describedby={id + "-body"}
      className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl p-6 shadow-2xl backdrop:bg-black/50"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <h2 id={id} className="mb-3 text-xl font-bold">
        {title}
      </h2>
      <div id={id + "-body"} className="mb-5 space-y-3 text-sm text-gray-700">
        {children}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={onClose}
        >
          Volver sin cambios
        </Button>
        <Button type="button" disabled={busy} onClick={onConfirm}>
          {busy ? "Procesando…" : confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
