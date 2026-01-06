-- Supabase PostgreSQL Schema
-- Bu SQL'i Supabase Dashboard > SQL Editor'de çalıştırın

-- Users tablosu (PostgreSQL formatında)
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255),
    surname VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    satisfaction_sent BOOLEAN DEFAULT FALSE,
    satisfaction_sent_at TIMESTAMP WITH TIME ZONE NULL,
    satisfaction_response SMALLINT NULL CHECK (satisfaction_response IN (0, 1)),
    satisfaction_response_at TIMESTAMP WITH TIME ZONE NULL
);

-- Email için index (hızlı arama)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- İstatistikler için index (performans)
CREATE INDEX IF NOT EXISTS idx_users_satisfaction ON users(satisfaction_sent, satisfaction_response);

-- Örnek veri göster
SELECT * FROM users;

-- NOTLAR:
-- 1. Row Level Security (RLS) varsayılan olarak kapalı
-- 2. İsterseniz RLS'i aktif edebilirsiniz:
--    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- 3. Public access için policy eklemeniz gerekebilir (anonim kullanım için)
