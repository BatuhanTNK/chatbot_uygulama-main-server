-- Veritabanı oluştur (eğer yoksa)
CREATE DATABASE IF NOT EXISTS chatbot_excel_project;

-- Veritabanını kullan
USE chatbot_excel_project;

-- Users tablosunu oluştur
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    surname VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    satisfaction_sent BOOLEAN DEFAULT FALSE,
    satisfaction_sent_at TIMESTAMP NULL,
    satisfaction_response TINYINT NULL COMMENT '1=memnun, 0=memnun değil, NULL=cevap yok',
    satisfaction_response_at TIMESTAMP NULL
);

-- Tablo yapısını göster
DESCRIBE users;

-- Mevcut kayıtları göster
SELECT * FROM users;
