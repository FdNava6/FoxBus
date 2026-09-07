import { Bus, CheckCircle2, QrCode, Route } from 'lucide-react';
import SearchBox from './SearchBox';

const highlights = [
  { icon: QrCode, text: 'Boleto QR propuesto' },
  { icon: Route, text: 'Seguimiento del pasaje' },
  { icon: CheckCircle2, text: 'Posventa centralizada' },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-fox-dark text-white">
      <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-fox-pink/20 blur-3xl" />
      <div className="absolute -right-16 top-0 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl" />

      <div className="container-fox relative py-16 md:py-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <span className="inline-flex rounded-full border border-fox-pink/40 bg-fox-pink/10 px-4 py-2 text-sm font-semibold text-pink-100">
              MVP académico · Ruta piloto Lima–Trujillo
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
              Tu pasaje, en un solo lugar
              <span className="block text-fox-pink">de la compra a la posventa.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-slate-300 md:text-xl">
              FOX Bus propone una experiencia digital con reserva trazable, asiento elegido y atención guiada durante todo el viaje.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {highlights.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-sm text-slate-200">
                  <Icon className="h-5 w-5 text-fox-pink" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute inset-6 rounded-[3rem] bg-fox-pink/30 blur-2xl" />
            <div className="relative rounded-[2rem] border border-white/15 bg-white/10 p-8 shadow-2xl backdrop-blur">
              <div className="mx-auto flex h-44 w-full items-center justify-center rounded-3xl bg-gradient-to-br from-fox-pink to-purple-600">
                <Bus className="h-28 w-28 text-white" strokeWidth={1.4} />
              </div>
              <div className="mt-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300">Ruta piloto</p>
                  <p className="text-xl font-bold">Lima → Trujillo</p>
                </div>
                <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-semibold text-emerald-300">
                  Demo activo
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-12">
          <SearchBox />
        </div>
      </div>
    </section>
  );
}
