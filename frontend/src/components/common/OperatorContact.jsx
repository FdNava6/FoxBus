import { contactLinks } from "../../utils/reservationPresentation";
export default function OperatorContact({ policy, compact = false }) {
  if (!policy) return null;
  const links = contactLinks(policy);
  if (compact && !links.email && !links.phone && !policy.legalName) return null;
  return (
    <div className="space-y-2 text-sm">
      {policy.legalName && (
        <p className="font-semibold">
          {policy.legalName}
          {policy.taxId ? " · RUC " + policy.taxId : ""}
        </p>
      )}
      {policy.address && !compact && <p>{policy.address}</p>}
      {links.email && (
        <a className="block break-all underline" href={links.email}>
          {policy.supportEmail}
        </a>
      )}
      {links.phone && (
        <a className="block underline" href={links.phone}>
          Llamar: {policy.supportPhone}
        </a>
      )}
      {policy.supportHours && <p>Horario de atención: {policy.supportHours}</p>}
      {!links.email && !links.phone && (
        <p>
          No hay un canal de atención publicado. Este entorno no ofrece compras
          reales.
        </p>
      )}
    </div>
  );
}
