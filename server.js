require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const xlsx = require('xlsx');
const nodemailer = require('nodemailer');
const cors = require('cors');
const fs = require('fs');
// SDK'yı yeni sürüme uygun çağırıyoruz:
const { Mistral } = require('@mistralai/mistralai');

const app = express();
app.use(cors());
app.use(express.json());

// --- AYARLAR ---

// 1. Mistral İstemcisi (GÜNCELLENDİ)
// Yeni versiyonda API key bu şekilde obje içinde veriliyor
const mistral = new Mistral({
    apiKey: process.env.MISTRAL_API_KEY
});

// 2. Supabase İstemcisi
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Bağlantıyı test et
(async () => {
    const { data, error } = await supabase.from('users').select('count');
    if (error) {
        console.error('HATA: Supabase bağlanamadı!', error.message);
    } else {
        console.log('OK: Supabase bağlantısı başarılı.');
    }
})();

// 3. Mail Taşıyıcısı (Gmail)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Dosya yükleme ayarı
const upload = multer({ dest: 'uploads/' });


// --- ENDPOINTLER ---

// A) CHATBOT (Mistral Tiny - GÜNCELLENDİ)
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ reply: "Boş mesaj gönderilemez." });

    try {
        // Yeni SDK'da 'chat.complete' kullanılıyor
        const chatResponse = await mistral.chat.complete({
            model: 'mistral-tiny',
            messages: [{ role: 'user', content: message }],
        });

        // Cevap yapısı da bazen değişebilir, burayı güvenli hale getirdik
        const botReply = chatResponse.choices[0].message.content;
        res.json({ reply: botReply });

    } catch (error) {
        console.error("Mistral API Hatası Detayı:", error);
        res.status(500).json({ reply: "Bir hata oluştu, lütfen API anahtarını kontrol et." });
    }
});

// B) EXCEL YÜKLE VE HEMEN MAİL GÖNDER (Tek Buton - Komple İşlem)
app.post('/api/upload-and-send-emails', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Dosya yüklenmedi.' });

    try {
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        let uploadSuccessCount = 0;
        let uploadErrors = [];
        let emailSuccessCount = 0;
        let emailErrors = [];
        const addedUsers = [];

        console.log(`📊 Excel dosyası okundu. ${data.length} satır bulundu.`);

        // İlk aşama: Veritabanına kaydet
        for (const row of data) {
            const ad = row['Ad'] || row['name'] || '';
            const soyad = row['Soyad'] || row['surname'] || '';
            const email = row['Email'] || row['email'];

            if (email) {
                try {
                    const { data: insertedData, error } = await supabase
                        .from('users')
                        .insert([{ name: ad, surname: soyad, email: email }])
                        .select();

                    if (error) throw error;

                    console.log(`✅ DB: ${ad} ${soyad} (${email}) kaydedildi.`);

                    // Eklenen kullanıcıyı kaydet
                    addedUsers.push({
                        id: insertedData[0].id,
                        name: ad,
                        surname: soyad,
                        email: email
                    });

                    uploadSuccessCount++;
                } catch (error) {
                    console.error(`❌ DB Hatası (${email}):`, error.message);
                    uploadErrors.push(`${email}: ${error.message}`);
                }
            } else {
                console.log(`⚠️ Satır atlandı: Email adresi yok`);
            }
        }

        // Geçici dosyayı sil
        fs.unlinkSync(req.file.path);

        console.log(`\n📊 Veritabanı Özeti: ${uploadSuccessCount} kayıt eklendi, ${uploadErrors.length} hata\n`);

        // İkinci aşama: Eklenen kullanıcılara mail gönder
        if (addedUsers.length > 0) {
            console.log(`📧 ${addedUsers.length} kullanıcıya memnuniyet anketi gönderiliyor...`);

            for (const user of addedUsers) {
                const { id, name, surname, email } = user;
                const fullName = `${name} ${surname}`.trim() || 'Değerli Kullanıcı';

                // Memnuniyet butonları için linkler
                const satisfiedLink = `http://localhost:3000/api/satisfaction-response?userId=${id}&response=1`;
                const notSatisfiedLink = `http://localhost:3000/api/satisfaction-response?userId=${id}&response=0`;

                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: email,
                    subject: 'Hizmetimizden Memnun Musunuz?',
                    html: `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <style>
                                body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
                                .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                                h2 { color: #333; margin-bottom: 20px; }
                                p { color: #666; line-height: 1.6; }
                                .buttons { text-align: center; margin-top: 30px; }
                                .btn { display: inline-block; padding: 15px 40px; margin: 10px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; }
                                .btn-success { background-color: #28a745; color: white; }
                                .btn-danger { background-color: #dc3545; color: white; }
                                .btn:hover { opacity: 0.9; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <h2>Merhaba ${fullName},</h2>
                                <p>Hizmetimizden memnuniyetinizi öğrenmek isteriz. Lütfen aşağıdaki butonlardan birini seçerek görüşünüzü bizimle paylaşın:</p>
                                
                                <div class="buttons">
                                    <a href="${satisfiedLink}" class="btn btn-success">😊 Memnunum</a>
                                    <a href="${notSatisfiedLink}" class="btn btn-danger">😞 Memnun Değilim</a>
                                </div>
                                
                                <p style="margin-top: 30px; font-size: 14px; color: #999;">Geri bildiriminiz bizim için çok değerli. Teşekkür ederiz!</p>
                            </div>
                        </body>
                        </html>
                    `
                };

                try {
                    await transporter.sendMail(mailOptions);

                    // Veritabanını güncelle
                    const { error } = await supabase
                        .from('users')
                        .update({
                            satisfaction_sent: true,
                            satisfaction_sent_at: new Date().toISOString()
                        })
                        .eq('id', id);

                    if (error) throw error;

                    console.log(`✅ E-posta gönderildi: ${fullName} (${email})`);
                    emailSuccessCount++;
                } catch (error) {
                    console.error(`❌ E-posta gönderilemedi (${email}):`, error.message);
                    emailErrors.push(`${email}: ${error.message}`);
                }
            }

            console.log(`\n📊 E-posta Özeti: ${emailSuccessCount} e-posta gönderildi, ${emailErrors.length} hata\n`);
        }

        // Sonuç mesajı
        let message = `✅ ${uploadSuccessCount} kullanıcı veritabanına eklendi.`;
        if (emailSuccessCount > 0) {
            message += ` ${emailSuccessCount} e-posta gönderildi.`;
        }
        if (uploadErrors.length > 0 || emailErrors.length > 0) {
            message += ` | ${uploadErrors.length + emailErrors.length} toplam hata oluştu.`;
        }

        res.json({
            message,
            uploadSuccess: uploadSuccessCount,
            uploadErrors: uploadErrors.length,
            emailSuccess: emailSuccessCount,
            emailErrors: emailErrors.length,
            totalErrors: [...uploadErrors, ...emailErrors]
        });

    } catch (error) {
        console.error('❌ Sunucu hatası:', error);
        res.status(500).json({ message: 'Sunucu hatası oluştu: ' + error.message });
    }
});

// C) MEMNUNİYET CEVABI
app.get('/api/satisfaction-response', async (req, res) => {
    const { userId, response } = req.query;

    if (!userId || (response !== '0' && response !== '1')) {
        return res.status(400).send('Geçersiz istek.');
    }

    try {
        // Kullanıcının cevabını kaydet
        const { error } = await supabase
            .from('users')
            .update({
                satisfaction_response: parseInt(response),
                satisfaction_response_at: new Date().toISOString()
            })
            .eq('id', parseInt(userId));

        if (error) throw error;

        console.log(`✅ Kullanıcı #${userId} cevabı kaydedildi: ${response === '1' ? 'Memnun' : 'Memnun Değil'}`);

        // Teşekkür sayfası
        const emoji = response === '1' ? '😊' : '😞';
        const message = response === '1' ? 'Memnun kaldığınızı duyduğumuza çok sevindik!' : 'Geri bildiriminiz için teşekkürler. Kendimizi geliştirmek için çalışacağız.';

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Teşekkürler</title>
                <style>
                    body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; }
                    .thank-you { background: white; padding: 50px; border-radius: 20px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.2); max-width: 500px; }
                    .emoji { font-size: 80px; margin-bottom: 20px; }
                    h1 { color: #333; margin-bottom: 20px; }
                    p { color: #666; font-size: 18px; line-height: 1.6; }
                </style>
            </head>
            <body>
                <div class="thank-you">
                    <div class="emoji">${emoji}</div>
                    <h1>Teşekkürler!</h1>
                    <p>${message}</p>
                </div>
            </body>
            </html>
        `);

    } catch (error) {
        console.error('❌ Veritabanı hatası:', error);
        res.status(500).send('Bir hata oluştu.');
    }
});

// D) ESKİ FORMAT DESTEĞİ - /api/vote (Eski maillerdeki linkler için)
app.get('/api/vote', async (req, res) => {
    const { email, vote } = req.query;

    if (!email || !vote) {
        return res.status(400).send('Geçersiz istek.');
    }

    try {
        // vote: 'yes' veya 'no' -> satisfaction_response: 1 veya 0
        const responseValue = vote === 'yes' ? 1 : 0;

        // Email ile kullanıcıyı bul ve cevabını kaydet
        const { error } = await supabase
            .from('users')
            .update({
                satisfaction_response: responseValue,
                satisfaction_response_at: new Date().toISOString()
            })
            .eq('email', email);

        if (error) throw error;

        console.log(`✅ Kullanıcı (${email}) cevabı kaydedildi: ${vote === 'yes' ? 'Memnun' : 'Memnun Değil'}`);

        // Teşekkür sayfası
        const emoji = vote === 'yes' ? '😊' : '😞';
        const message = vote === 'yes' ? 'Memnun kaldığınızı duyduğumuza çok sevindik!' : 'Geri bildiriminiz için teşekkürler. Kendimizi geliştirmek için çalışacağız.';

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Teşekkürler</title>
                <style>
                    body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; }
                    .thank-you { background: white; padding: 50px; border-radius: 20px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.2); max-width: 500px; }
                    .emoji { font-size: 80px; margin-bottom: 20px; }
                    h1 { color: #333; margin-bottom: 20px; }
                    p { color: #666; font-size: 18px; line-height: 1.6; }
                </style>
            </head>
            <body>
                <div class="thank-you">
                    <div class="emoji">${emoji}</div>
                    <h1>Teşekkürler!</h1>
                    <p>${message}</p>
                </div>
            </body>
            </html>
        `);

    } catch (error) {
        console.error('❌ Veritabanı hatası:', error);
        res.status(500).send('Bir hata oluştu.');
    }
});

// E) İSTATİSTİKLER
app.get('/api/satisfaction-stats', async (req, res) => {
    try {
        // Tüm kullanıcıları çek
        const { data: users, error } = await supabase
            .from('users')
            .select('*');

        if (error) throw error;

        // İstatistikleri hesapla
        const totalUsers = users.length;
        const emailsSent = users.filter(u => u.satisfaction_sent === true).length;
        const totalResponses = users.filter(u => u.satisfaction_response !== null).length;
        const satisfiedCount = users.filter(u => u.satisfaction_response === 1).length;
        const notSatisfiedCount = users.filter(u => u.satisfaction_response === 0).length;

        res.json({
            totalUsers: totalUsers,
            emailsSent: emailsSent,
            totalResponses: totalResponses,
            satisfiedCount: satisfiedCount,
            notSatisfiedCount: notSatisfiedCount,
            responseRate: emailsSent > 0
                ? ((totalResponses / emailsSent) * 100).toFixed(1)
                : '0.0',
            satisfactionRate: totalResponses > 0
                ? ((satisfiedCount / totalResponses) * 100).toFixed(1)
                : '0.0'
        });

    } catch (error) {
        console.error('❌ İstatistik hatası:', error);
        res.status(500).json({ message: 'İstatistikler alınamadı.' });
    }
});

app.listen(3000, () => {
    console.log('------------------------------------------------');
    console.log('🚀 Server çalışıyor: http://localhost:3000');
    console.log('🤖 Mistral AI: SDK v1.x Aktif');
    console.log('💾 Supabase: PostgreSQL Database Aktif');
    console.log('------------------------------------------------');
});