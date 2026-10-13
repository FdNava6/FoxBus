import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, X, Send } from "lucide-react";
import { chatbotService } from "../../services/chatbotService";
const allowed = new Set([
  "/resultados",
  "/mis-viajes",
  "/recuperar",
  "/condiciones",
  "/ayuda",
]);
const quickReplies = [
  "¿Cómo compro un pasaje?",
  "¿Cómo pago?",
  "Política de equipaje",
  "Recuperar mi reserva",
];
export default function FoxBotWidget() {
  const [isOpen, setIsOpen] = useState(false),
    [input, setInput] = useState(""),
    [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      text: "Hola. Te ayudo con reservas, pagos y solicitudes. ¿Qué necesitas?",
      sender: "bot",
    },
  ]);
  const inputRef = useRef(null),
    trigger = useRef(null),
    endRef = useRef(null),
    sending = useRef(false);
  const close = () => {
    setIsOpen(false);
    trigger.current?.focus();
  };
  useEffect(() => {
    const open = () => setIsOpen(true);
    window.addEventListener("open-foxbot", open);
    return () => window.removeEventListener("open-foxbot", open);
  }, []);
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);
  useEffect(() => {
    if (isOpen) endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages, isOpen]);
  const send = async (text) => {
    const value = text.trim();
    if (!value || sending.current) return;
    sending.current = true;
    setBusy(true);
    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text: value, sender: "user" },
    ]);
    try {
      const response = await chatbotService.sendMessage(value);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          text: response.message,
          sender: "bot",
          actions: (response.actions || []).filter((a) => allowed.has(a.to)),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          text: "No pude obtener una respuesta. Puedes consultar tus reservas o los canales del operador.",
          sender: "bot",
          actions: [{ label: "Ayuda y contacto", to: "/ayuda" }],
        },
      ]);
    } finally {
      sending.current = false;
      setBusy(false);
    }
  };
  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label={isOpen ? "Cerrar FoxBot" : "Abrir FoxBot"}
        aria-expanded={isOpen}
        aria-controls="foxbot-dialog"
        onClick={() => (isOpen ? close() : setIsOpen(true))}
        className="fixed right-4 bottom-[calc(4.5rem_+_env(safe-area-inset-bottom))] z-50 rounded-full bg-fox-pink p-4 text-white shadow-lg sm:bottom-6 sm:right-6"
      >
        {isOpen ? (
          <X aria-hidden="true" className="h-6 w-6" />
        ) : (
          <MessageCircle aria-hidden="true" className="h-6 w-6" />
        )}
      </button>
      {isOpen && (
        <section
          id="foxbot-dialog"
          role="dialog"
          aria-labelledby="foxbot-title"
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
          className="fixed inset-x-3 bottom-[calc(8rem_+_env(safe-area-inset-bottom))] z-50 flex max-h-[calc(100dvh_-_10rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:inset-x-auto sm:right-6 sm:bottom-24 sm:w-96"
        >
          <header className="flex items-center justify-between gap-3 bg-fox-pink px-4 py-3 text-white">
            <div>
              <h2 id="foxbot-title" className="font-bold">
                FoxBot · Ayuda para tu viaje
              </h2>
              <p className="text-xs">
                Orientación automática según información publicada
              </p>
            </div>
            <button
              type="button"
              aria-label="Cerrar ayuda de FoxBot"
              onClick={close}
              className="min-h-11 min-w-11"
            >
              <X aria-hidden="true" />
            </button>
          </header>
          <div
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            className="min-h-24 flex-1 space-y-3 overflow-y-auto bg-gray-50 p-3"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  "rounded-xl p-3 text-sm " +
                  (m.sender === "bot" ? "bg-white" : "ml-6 bg-pink-100")
                }
              >
                <p className="whitespace-pre-wrap">{m.text}</p>
                {m.actions?.map((a) => (
                  <Link
                    key={a.to}
                    onClick={close}
                    to={a.to}
                    className="mt-2 block min-h-11 rounded-lg border px-3 py-2 font-semibold text-fox-pink"
                  >
                    {a.label}
                  </Link>
                ))}
              </div>
            ))}
            {busy && <p role="status">Buscando una respuesta…</p>}
            <div ref={endRef} />
          </div>
          <div className="flex flex-wrap gap-2 border-t p-3">
            {quickReplies.map((q) => (
              <button
                key={q}
                type="button"
                disabled={busy}
                onClick={() => send(q)}
                className="min-h-11 rounded-lg bg-pink-50 px-3 text-xs font-semibold text-fox-pink"
              >
                {q}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex gap-2 border-t p-3"
          >
            <label htmlFor="foxbot-message" className="sr-only">
              Mensaje para FoxBot
            </label>
            <input
              ref={inputRef}
              id="foxbot-message"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={2000}
              placeholder="Escribe tu pregunta…"
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.nativeEvent.isComposing)
                  e.preventDefault();
              }}
              className="min-w-0 flex-1 rounded-lg border p-3 text-sm"
            />
            <button
              aria-label="Enviar mensaje"
              disabled={busy || !input.trim()}
              className="min-h-11 rounded-lg bg-fox-pink px-3 text-white"
            >
              <Send aria-hidden="true" className="h-5 w-5" />
            </button>
          </form>
          <Link
            to="/ayuda"
            onClick={close}
            className="block border-t p-3 text-center text-sm font-semibold text-fox-pink underline"
          >
            Contactar con una persona
          </Link>
        </section>
      )}
    </>
  );
}
