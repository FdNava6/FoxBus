-- 002_2fa_and_payment_method.sql
-- Verificación en dos pasos por correo y método de pago elegido por el pasajero.

ALTER TABLE reservations
  ADD COLUMN payment_method VARCHAR(20) NULL AFTER status;

CREATE TABLE IF NOT EXISTS login_challenges (
  hash CHAR(64) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  code_hash CHAR(64) NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  expires_at VARCHAR(32) NOT NULL,
  used_at VARCHAR(32) NULL,
  created_at VARCHAR(32) NOT NULL,
  CONSTRAINT login_challenges_user_fk FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX login_challenges_expiration (expires_at)
) ENGINE=InnoDB;
