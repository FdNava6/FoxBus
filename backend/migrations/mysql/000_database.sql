-- 000_database.sql
-- Solo para instalación manual. La aplicación crea la base automáticamente
-- (CREATE DATABASE IF NOT EXISTS + USE) antes de aplicar 001_schema.sql.
-- No ejecutar este archivo desde la app: el piloto y los tests usan
-- foxbus_pilot y foxbus_test_* y no deben tocar foxbus.
--
-- Uso:
--   mysql -u root -p < 000_database.sql
--   mysql -u root -p foxbus < 001_schema.sql

CREATE DATABASE IF NOT EXISTS foxbus
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
