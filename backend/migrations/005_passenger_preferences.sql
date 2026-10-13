-- 005_passenger_preferences.sql
-- Preferencias de viaje del pasajero (horario, tipo de servicio y destino del
-- corredor norte) que alimentan las "ofertas personalizadas" de la landing.
CREATE TABLE passenger_preferences (
  owner_hash TEXT PRIMARY KEY,
  schedule TEXT NOT NULL CHECK(schedule IN ('morning','afternoon','night')),
  service_type TEXT NOT NULL CHECK(service_type IN ('economico','ejecutivo','cama')),
  destination TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

-- El catálogo de servicios ahora coincide con las preferencias publicadas:
-- Económico, Ejecutivo y Cama (antes "Premium").
UPDATE trips SET service = 'Cama' WHERE service = 'Premium';
