# Chatbot Uygulaması - Kurulum Rehberi

## 🚀 Hızlı Başlangıç

Bu uygulama Supabase (PostgreSQL), Mistral AI ve Gmail entegrasyonu ile çalışan bir chatbot ve memnuniyet anketi sistemidir.

## 📋 Gereksinimler

- Node.js (v14 veya üzeri)
- Supabase hesabı (ücretsiz)
- Gmail hesabı (2FA aktif, uygulama şifresi ile)
- Mistral AI API Key

## 🔧 Kurulum Adımları

### 1. Supabase Projesini Oluşturun

1. [supabase.com](https://supabase.com) adresine gidin ve ücretsiz hesap oluşturun
2. "New Project" ile yeni bir proje oluşturun
3. Project Settings > API kısmından şu bilgileri kopyalayın:
   - **Project URL** (örn: `https://xxxxx.supabase.co`)
   - **anon public** key

### 2. Veritabanı Şemasını Oluşturun

1. Supabase Dashboard'da **SQL Editor** sekmesine gidin
2. `supabase_schema.sql` dosyasının içeriğini kopyalayıp yapıştırın
3. "Run" butonuna tıklayarak çalıştırın
4. **Table Editor** sekmesinde `users` tablosunu görmelisiniz

### 3. Environment Variables Ayarlayın

`.env` dosyasını açın ve şu bilgileri girin:

```env
# Supabase Ayarları (Project Settings > API'den alın)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# Gmail Ayarları (Uygulama Şifresi kullanmalısın)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Mistral AI Key
MISTRAL_API_KEY=your-mistral-api-key
```

**Gmail Uygulama Şifresi Nasıl Alınır:**
1. Google hesabınızda 2-Step Verification açık olmalı
2. https://myaccount.google.com/apppasswords adresine gidin
3. "App passwords" bölümünden yeni bir şifre oluşturun
4. 16 haneli şifreyi `.env` dosyasına kopyalayın (boşluksuz)

### 4. Bağımlılıkları Yükleyin

```bash
npm install
```

### 5. Sunucuyu Başlatın

```bash
node server.js
```

Başarılı olursa şu mesajları görmelisiniz:

```
OK: Supabase bağlantısı başarılı.
------------------------------------------------
🚀 Server çalışıyor: http://localhost:3000
🤖 Mistral AI: SDK v1.x Aktif
💾 Supabase: PostgreSQL Database Aktif
------------------------------------------------
```

## 📱 Kullanım

### Chatbot Testi

1. Tarayıcıda `http://localhost:3000` adresini açın
2. Sol tarafta chatbot widget'ını kullanın
3. Bir mesaj yazıp gönderun - Mistral AI yanıt verecek

### Excel Yükleme ve Email Gönderimi

1. Sağ tarafta "Excel Yükle & Mail At" bölümünü bulun
2. Test için `test_data.csv` dosyasını kullanabilirsiniz
3. "Yükle ve İşlemi Başlat" butonuna tıklayın
4. Terminal'de işlem loglarını göreceksiniz

**Excel Formatı:**

| Ad     | Soyad      | Email                  |
|--------|------------|------------------------|
| Furkan | Karazeybek | test@example.com       |
| Ali    | Yılmaz     | ali@example.com        |

**Not:** Sütun isimleri `Ad`, `Soyad`, `Email` veya İngilizce `name`, `surname`, `email` olabilir.

### Memnuniyet Anketi

1. Excel yüklendiğinde kullanıcılara otomatik email gönderilir
2. Email'de "Memnunum" ve "Memnun Değilim" butonları vardır
3. Kullanıcı butona tıkladığında cevap veritabanına kaydedilir
4. İstatistikleri görmek için: `http://localhost:3000/api/satisfaction-stats`

## 🔍 Veritabanı Kontrolü

Supabase Dashboard'da **Table Editor** > **users** tablosuna giderek:
- Eklenen kullanıcıları görebilirsiniz
- Email gönderilme durumunu kontrol edebilirsiniz
- Memnuniyet cevaplarını görebilirsiniz

Veya **SQL Editor**'de sorgular çalıştırabilirsiniz:

```sql
-- Tüm kullanıcıları göster
SELECT * FROM users;

-- Memnuniyet istatistikleri
SELECT 
  COUNT(*) as toplam_kullanici,
  COUNT(*) FILTER (WHERE satisfaction_sent = true) as email_gonderilen,
  COUNT(*) FILTER (WHERE satisfaction_response = 1) as memnun,
  COUNT(*) FILTER (WHERE satisfaction_response = 0) as memnun_degil
FROM users;
```

## 🐛 Olası Hatalar ve Çözümleri

### "Supabase bağlanamadı" Hatası

- `.env` dosyasında `SUPABASE_URL` ve `SUPABASE_ANON_KEY` doğru mu?
- Supabase projeniz aktif mi? Dashboard'u kontrol edin
- Internet bağlantınız var mı?

### "Permission denied" veya RLS Hatası

Supabase'de Row Level Security (RLS) varsayılan olarak aktif olabilir. Geçici olarak devre dışı bırakmak için SQL Editor'de:

```sql
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

Veya public access için policy ekleyin:

```sql
CREATE POLICY "Allow public access" ON users
FOR ALL USING (true);
```

### Email Gönderilmiyor

- Gmail şifresinin **Uygulama Şifresi** olduğundan emin olun (normal şifre çalışmaz)
- `.env` dosyasında `EMAIL_USER` ve `EMAIL_PASS` doğru mu?
- Gmail hesabınızda 2-Step Verification açık mı?

### "Duplicate entry" Hatası

- Aynı email adresi zaten veritabanında var
- Email adresleri unique olmalı (bu tasarım gereği)
- Testi temizlemek için Supabase Dashboard'da tabloyu silebilirsiniz

## 📊 API Endpoints

- `POST /api/chat` - Chatbot mesajı gönder
- `POST /api/upload-and-send-emails` - Excel yükle ve email gönder
- `GET /api/satisfaction-response?userId={id}&response={0|1}` - Memnuniyet cevabı kaydet
- `GET /api/vote?email={email}&vote={yes|no}` - Legacy endpoint (eski emailler için)
- `GET /api/satisfaction-stats` - İstatistikleri getir

## 🎯 Özellikler

✅ Mistral AI chatbot entegrasyonu  
✅ Excel/CSV dosyasından toplu kullanıcı yükleme  
✅ Otomatik HTML email gönderimi  
✅ İki butonlu memnuniyet anketi  
✅ Gerçek zamanlı istatistikler  
✅ Supabase cloud veritabanı (deployment-ready)  
✅ Responsive tasarım  

## 🚀 Production'a Geçiş

1. `.env` dosyasındaki bilgileri production environment'a ekleyin
2. Email linklerindeki `localhost:3000` kısmını production domain'inizle değiştirin
3. Supabase RLS policy'lerini production için yapılandırın
4. CORS ayarlarını production domain'inize göre güncelleyin

## 📝 Notlar

- Supabase ücretsiz planında 500MB veritabanı ve 2GB transfer hakkınız var
- Mistral AI'ın rate limit'lerini göz önünde bulundurun
- Gmail günlük 500 email limiti var (ücretsiz hesap için)
