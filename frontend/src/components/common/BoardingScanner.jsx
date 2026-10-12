import { useRef, useEffect, useState } from "react";
import Button from "./Button";
export default function BoardingScanner({ onScan }) {
  const video = useRef(null),
    stream = useRef(null),
    timer = useRef(null),
    [error, setError] = useState(""),
    [active, setActive] = useState(false);
  const stop = () => {
    clearInterval(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setActive(false);
  };
  useEffect(
    () => () => {
      clearInterval(timer.current);
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  const start = async () => {
    try {
      if (!("BarcodeDetector" in window))
        throw new Error(
          "Este navegador no admite lectura por cámara. Usa el lector o pega el código del boleto.",
        );
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      stream.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      video.current.srcObject = stream.current;
      await video.current.play();
      setActive(true);
      setError("");
      let reading = false;
      timer.current = setInterval(async () => {
        if (reading) return;
        reading = true;
        try {
          const codes = await detector.detect(video.current);
          if (codes[0]) {
            onScan(codes[0].rawValue);
            stop();
          }
        } catch {
          /* Un cuadro sin datos no es un fallo de abordaje. */
        } finally {
          reading = false;
        }
      }, 300);
    } catch (e) {
      stop();
      setError(e.message);
    }
  };
  return (
    <div className="my-4">
      <video
        ref={video}
        muted
        playsInline
        className={"max-w-sm rounded-xl " + (active ? "" : "hidden")}
      />
      <p className="text-sm text-red-700">{error}</p>
      <Button type="button" variant="secondary" onClick={active ? stop : start}>
        {active ? "Detener cámara" : "Leer QR con cámara"}
      </Button>
    </div>
  );
}
