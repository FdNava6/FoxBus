import { Link } from "react-router-dom";
export default function ServiceDetails({ trip, policy }) {
  return (
    <div className="space-y-3 text-sm">
      <p className="font-semibold">{trip?.service}</p>
      {trip?.serviceDescription && <p>{trip.serviceDescription}</p>}
      {trip?.features?.length > 0 && (
        <ul className="list-inside list-disc">
          {trip.features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}
      {!trip?.features?.length && !trip?.serviceDescription && (
        <p>
          Las características adicionales de este servicio no se han publicado.
        </p>
      )}
      <p>
        Equipaje incluido:{" "}
        {policy?.baggageKg != null
          ? policy.baggageKg + " kg por viajero."
          : "no informado. Confírmalo antes de una compra real."}
      </p>
      {policy?.changePolicy && <p>Cambios: {policy.changePolicy}</p>}
      {policy?.refundPolicy && <p>Devoluciones: {policy.refundPolicy}</p>}
      <Link
        to="/condiciones"
        target="_blank"
        className="inline-block py-2 text-fox-pink underline"
      >
        Ver condiciones completas
      </Link>
    </div>
  );
}
