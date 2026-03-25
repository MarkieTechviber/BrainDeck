-- =============================================
-- BrainDeck — MySQL Database Setup
-- Run this in phpMyAdmin or paste in MySQL CLI
-- =============================================

CREATE DATABASE IF NOT EXISTS braindeck
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE braindeck;

-- Sequelize will auto-create the tables on first run (sync: alter)
-- But you can also run this to pre-create them:

CREATE TABLE IF NOT EXISTS users (
  id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name                 VARCHAR(80),
  email                VARCHAR(200) NOT NULL UNIQUE,
  passwordHash         VARCHAR(255) NOT NULL,
  avatarUrl            VARCHAR(500),
  coverUrl             VARCHAR(500),
  bio                  VARCHAR(300),
  location             VARCHAR(100),
  website              VARCHAR(200),
  isEmailVerified      TINYINT(1) DEFAULT 0,
  googleId             VARCHAR(100) UNIQUE,
  passwordResetToken   VARCHAR(255),
  passwordResetExpires DATETIME,
  lastLoginAt          DATETIME,
  emailVerifyToken     VARCHAR(255),
  emailVerifyExpires   DATETIME,
  createdAt            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sessions (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  userId     INT UNSIGNED NOT NULL,
  tokenHash  VARCHAR(255) NOT NULL,
  expiresAt  DATETIME NOT NULL,
  userAgent  VARCHAR(500),
  ip         VARCHAR(45),
  createdAt  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_userId (userId),
  INDEX idx_expiresAt (expiresAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS profiles (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  userId         INT UNSIGNED NOT NULL UNIQUE,
  preferredAI    VARCHAR(50) DEFAULT 'local',
  preferredModel VARCHAR(100) DEFAULT 'llama3',
  totalDecks     INT UNSIGNED DEFAULT 0,
  lastStudiedAt  DATETIME,
  createdAt      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS decks (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  userId           INT UNSIGNED NOT NULL,
  title            VARCHAR(200) NOT NULL DEFAULT 'Untitled Deck',
  originalFileName VARCHAR(255),
  fileType         ENUM('pdf','docx','pptx','txt','md'),
  cardType         ENUM('flashcard','summary','quiz') NOT NULL,
  cards            LONGTEXT NOT NULL,
  cardCount        INT UNSIGNED DEFAULT 0,
  aiProvider       VARCHAR(50),
  aiModel          VARCHAR(100),
  lastStudiedAt    DATETIME,
  studyCount       INT UNSIGNED DEFAULT 0,
  createdAt        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_userId (userId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SELECT 'BrainDeck database ready! (PWA + Push enabled)' AS status;

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  userId         INT UNSIGNED NOT NULL,
  endpoint       TEXT NOT NULL,
  p256dh         TEXT NOT NULL,
  auth           VARCHAR(255) NOT NULL,
  userAgent      VARCHAR(300),
  dueCardCount   INT UNSIGNED DEFAULT 0,
  lastNotifiedAt DATETIME,
  createdAt      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_userId (userId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS public_decks (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  userId       INT UNSIGNED,
  authorName   VARCHAR(80) DEFAULT 'Anonymous',
  title        VARCHAR(200) NOT NULL,
  description  VARCHAR(500),
  subject      VARCHAR(80) DEFAULT 'General',
  tags         TEXT,
  cardType     ENUM('flashcard','summary','quiz') NOT NULL,
  difficulty   ENUM('easy','medium','hard','expert') DEFAULT 'medium',
  cards        LONGTEXT NOT NULL,
  cardCount    INT UNSIGNED DEFAULT 0,
  language     VARCHAR(30) DEFAULT 'English',
  viewCount    INT UNSIGNED DEFAULT 0,
  forkCount    INT UNSIGNED DEFAULT 0,
  ratingSum    INT UNSIGNED DEFAULT 0,
  ratingCount  INT UNSIGNED DEFAULT 0,
  forkedFromId INT UNSIGNED,
  createdAt    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_subject (subject),
  INDEX idx_cardType (cardType),
  INDEX idx_viewCount (viewCount)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS deck_ratings (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  publicDeckId INT UNSIGNED NOT NULL,
  userId       INT UNSIGNED,
  sessionKey   VARCHAR(64),
  rating       TINYINT UNSIGNED NOT NULL,
  createdAt    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_deck (publicDeckId, userId),
  FOREIGN KEY (publicDeckId) REFERENCES public_decks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
