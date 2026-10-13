// ============================================
// OfferCarousel.jsx
// Carrusel horizontal de tarjetas con desplazamiento
// suave y flechas de navegación. En móvil se desliza
// de forma nativa (scroll-snap); las flechas aparecen
// a partir de pantallas pequeñas.
// ============================================
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function OfferCarousel({ children, ariaLabel }) {
  const ref = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(sync);
    window.addEventListener("resize", sync);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", sync);
    };
  }, [sync, children]);

  const scroll = (direction) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({
      left: direction * Math.max(el.clientWidth * 0.8, 280),
      behavior: "smooth",
    });
  };

  const arrow =
    "absolute top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-fox-pink shadow-fox transition hover:bg-fox-pink hover:text-white disabled:pointer-events-none disabled:opacity-0 sm:flex";

  return (
    <div className="relative" role="group" aria-label={ariaLabel}>
      <ul
        ref={ref}
        onScroll={sync}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </ul>
      <button
        type="button"
        onClick={() => scroll(-1)}
        disabled={!canPrev}
        aria-label="Ofertas anteriores"
        className={arrow + " left-0 -translate-x-1/2"}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => scroll(1)}
        disabled={!canNext}
        aria-label="Más ofertas"
        className={arrow + " right-0 translate-x-1/2"}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
