import { useId } from "react";
export default function SeatPicker({
  layout = [],
  occupied = [],
  selected = [],
  disabled,
  onToggle,
}) {
  const id = useId();
  const floors = [...new Set(layout.map((seat) => seat.floor))].sort(
    (a, b) => a - b,
  );
  return (
    <fieldset className="space-y-4 rounded-xl border p-4">
      <legend className="font-bold">Asientos de ventanilla · máximo 6</legend>
      {floors.map((floor) => (
        <div key={floor} className="space-y-2">
          <h3 className="text-center font-semibold">Piso {floor}</h3>
          {[
            ...new Set(
              layout
                .filter((seat) => seat.floor === floor)
                .map((seat) => seat.row),
            ),
          ]
            .sort((a, b) => a - b)
            .map((row) => (
              <div
                key={row}
                className="mx-auto grid max-w-sm grid-cols-[1fr_1fr_20px_1fr_1fr] gap-2"
              >
                {[1, 2, 0, 3, 4].map((col, index) => {
                  const seat = layout.find(
                    (entry) =>
                      entry.floor === floor &&
                      entry.row === row &&
                      entry.col === col,
                  );
                  if (!seat) return <span key={index} />;
                  const picked = selected.includes(seat.id),
                    used = occupied.includes(seat.id),
                    unavailable = seat.blocked || used;
                  return (
                    <button
                      key={seat.id}
                      type="button"
                      aria-label={"Ventanilla, asiento " + seat.id}
                      aria-pressed={picked}
                      aria-describedby={id + seat.id}
                      disabled={
                        disabled ||
                        seat.blocked ||
                        (!picked && (used || selected.length >= 6))
                      }
                      onClick={() => onToggle(seat.id)}
                      className={
                        "min-h-11 rounded-lg text-sm font-bold " +
                        (picked
                          ? "bg-fox-pink text-white"
                          : unavailable
                            ? "bg-gray-500 text-white"
                            : "bg-gray-100 text-gray-900")
                      }
                    >
                      {seat.id}{" "}
                      {picked ? "✓" : seat.blocked ? "!" : used ? "×" : ""}
                      <span className="sr-only" id={id + seat.id}>
                        {picked
                          ? "Seleccionado"
                          : seat.blocked
                            ? "Fuera de servicio"
                            : used
                              ? "Ocupado"
                              : "Disponible"}{" "}
                        · {seat.category}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
        </div>
      ))}
      <p className="text-sm text-gray-600">
        ✓ Seleccionado · × Ocupado · ! Fuera de servicio. La selección visual no
        retiene un asiento: el servidor confirma la disponibilidad al reservar.
      </p>
    </fieldset>
  );
}
