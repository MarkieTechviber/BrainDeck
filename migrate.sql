-- =============================================
-- BrainDeck — Migration: Fix missing columns
-- Compatible with MySQL 5.7+, MySQL 8+, MariaDB
-- Run this in phpMyAdmin or MySQL CLI ONCE
-- =============================================

USE braindeck;

-- ── Safe column additions using stored procedure ──
-- This approach works on ALL MySQL/MariaDB versions.

DROP PROCEDURE IF EXISTS braindeck_migrate;

DELIMITER $$

CREATE PROCEDURE braindeck_migrate()
BEGIN

  -- storageFolder
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'profiles'
      AND COLUMN_NAME  = 'storageFolder'
  ) THEN
    ALTER TABLE profiles ADD COLUMN storageFolder VARCHAR(50) DEFAULT NULL;
  END IF;

  -- preferredAIMode
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'profiles'
      AND COLUMN_NAME  = 'preferredAIMode'
  ) THEN
    ALTER TABLE profiles ADD COLUMN preferredAIMode VARCHAR(50) DEFAULT 'local';
  END IF;

  -- preferredProvider
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'profiles'
      AND COLUMN_NAME  = 'preferredProvider'
  ) THEN
    ALTER TABLE profiles ADD COLUMN preferredProvider VARCHAR(50) DEFAULT 'claude';
  END IF;

  -- preferredOllamaModel
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'profiles'
      AND COLUMN_NAME  = 'preferredOllamaModel'
  ) THEN
    ALTER TABLE profiles ADD COLUMN preferredOllamaModel VARCHAR(100) DEFAULT 'llama3';
  END IF;

END$$

DELIMITER ;

-- Run it
CALL braindeck_migrate();

-- Clean up
DROP PROCEDURE IF EXISTS braindeck_migrate;

-- Backfill storageFolder for existing accounts that don't have one
UPDATE profiles
SET storageFolder = CONCAT(
  UPPER(SUBSTRING(MD5(RAND()), 1, 8)),
  '-',
  UPPER(SUBSTRING(MD5(RAND()), 1, 8))
)
WHERE storageFolder IS NULL OR storageFolder = '';

SELECT 'Migration complete! All missing columns added.' AS status;
