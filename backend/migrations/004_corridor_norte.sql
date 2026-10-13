-- 004_corridor_norte.sql
-- Amplía el catálogo de demostración al corredor norte: desde Lima hacia
-- Chimbote, Trujillo, Chiclayo, Piura y Cajamarca. Se conservan los viajes
-- 1-4 (Lima -> Trujillo) para no alterar reservas ya registradas.

INSERT OR IGNORE INTO trips(id,origin,destination,departure_time,duration_minutes,price_cents,service)
 VALUES (5,'Lima','Chimbote','06:00',360,4500,'Económico');
INSERT OR IGNORE INTO trips(id,origin,destination,departure_time,duration_minutes,price_cents,service)
 VALUES (6,'Lima','Chimbote','15:00',360,5000,'Económico');
INSERT OR IGNORE INTO trips(id,origin,destination,departure_time,duration_minutes,price_cents,service)
 VALUES (7,'Lima','Chiclayo','08:00',720,9000,'Premium');
INSERT OR IGNORE INTO trips(id,origin,destination,departure_time,duration_minutes,price_cents,service)
 VALUES (8,'Lima','Chiclayo','21:30',720,11000,'Ejecutivo');
INSERT OR IGNORE INTO trips(id,origin,destination,departure_time,duration_minutes,price_cents,service)
 VALUES (9,'Lima','Piura','07:00',900,12000,'Premium');
INSERT OR IGNORE INTO trips(id,origin,destination,departure_time,duration_minutes,price_cents,service)
 VALUES (10,'Lima','Piura','20:30',900,14000,'Ejecutivo');
INSERT OR IGNORE INTO trips(id,origin,destination,departure_time,duration_minutes,price_cents,service)
 VALUES (11,'Lima','Cajamarca','09:00',840,10000,'Premium');

-- Sincroniza los terminales de las salidas de demostración ya sembradas con el
-- destino real de cada viaje (antes decían siempre "Trujillo").
UPDATE departures
   SET terminal_origin = 'Terminal de muestra ' || (SELECT origin FROM trips WHERE trips.id = departures.trip_id) || ' · confirmar con operador',
       terminal_destination = 'Terminal de muestra ' || (SELECT destination FROM trips WHERE trips.id = departures.trip_id) || ' · confirmar con operador';
