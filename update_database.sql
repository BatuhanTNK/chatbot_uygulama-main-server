-- Mevcut veritabanını güncelleme scripti
-- Eğer tablo zaten varsa, yeni kolonları ekle

USE chatbot_excel_project;

-- Yeni kolonları ekle (eğer yoksa)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS satisfaction_sent BOOLEAN DEFAULT FALSE AFTER created_at,
ADD COLUMN IF NOT EXISTS satisfaction_sent_at TIMESTAMP NULL AFTER satisfaction_sent,
ADD COLUMN IF NOT EXISTS satisfaction_response TINYINT NULL COMMENT '1=memnun, 0=memnun değil, NULL=cevap yok' AFTER satisfaction_sent_at,
ADD COLUMN IF NOT EXISTS satisfaction_response_at TIMESTAMP NULL AFTER satisfaction_response;

-- Tablo yapısını kontrol et
DESCRIBE users;

SELECT 'Veritabanı başarıyla güncellendi!' as Mesaj;
