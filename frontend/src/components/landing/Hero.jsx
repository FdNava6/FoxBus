// ============================================
// Hero.jsx
// Sección principal (Hero) de la página de inicio.
// La imagen BUS.png cubre todo el fondo del Hero
// con una capa oscura para leer el slogan; debajo
// integra el buscador (<SearchBox/>).
// ============================================
import { CheckCircle2, QrCode, Route } from "lucide-react";
import SearchBox from "./SearchBox";
import BUSLogo from "../../assets/BUS.webp";

const highlights = [
  { icon: QrCode, text: "Boleto digital QR" },
  { icon: Route, text: "Seguimiento del pasaje" },
  { icon: CheckCircle2, text: "Posventa centralizada" },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-fox-dark text-white">
      {/* BUS.png como fondo de todo el Hero */}
      <img
        src={BUSLogo}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Capa oscura para mantener el texto legible */}
      <div className="absolute inset-0 bg-fox-dark/55" />
      <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-fox-pink/20 blur-3xl" />
      <div className="absolute -right-16 top-0 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl" />

      <div className="container-fox relative py-10 md:py-16">
        <div className="max-w-3xl">
          <h1 className="mt-2 text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
            Conectamos destinos
            <span className="mt-3 block text-fox-pink-light">
              creamos experiencias
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-300 md:text-xl">
            FOXBUS propone una experiencia digital con reserva trazable,
            asiento elegido y atención guiada durante todo el viaje.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-6">
            {highlights.map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-2 text-sm text-slate-200"
              >
                <Icon className="h-5 w-5 text-fox-pink-light" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 mt-8">
          <SearchBox />
        </div>
      </div>
    </section>
  );
}
