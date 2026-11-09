-- 003_html_mail_and_ticket_limit.sql
-- Comprobante/voucher HTML para correos y límite operativo por compra.
-- Idempotente para entornos donde 001 ya incluye html.

SET @has_html = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'outbox' AND COLUMN_NAME = 'html'
);
SET @sql = IF(
  @has_html = 0,
  'ALTER TABLE outbox ADD COLUMN html MEDIUMTEXT NULL AFTER body',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE operator_settings
   SET value = JSON_SET(value, '$.maxSeats', 5)
 WHERE `key` = 'policy'
   AND CAST(JSON_UNQUOTE(JSON_EXTRACT(value, '$.maxSeats')) AS UNSIGNED) > 5;
