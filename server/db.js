const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db;
try {
  let dbDir = process.env.DATABASE_DIR;
  let useFallback = !dbDir;

  if (dbDir) {
    try {
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
    } catch (mkdirError) {
      console.warn(`⚠️ UYARI: Belirtilen DATABASE_DIR (${dbDir}) oluşturulamadı veya erişilemedi. Yerel 'data' klasörüne geçiş yapılıyor.`);
      console.warn(mkdirError.message);
      useFallback = true;
    }
  }

  if (useFallback) {
    dbDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  }

  const dbPath = path.join(dbDir, 'avesis.sqlite');
  console.log(`🚀 Veritabanı yükleniyor: ${dbPath}`);
  db = new Database(dbPath);

  // Register custom Turkish case-insensitive function
  function normalizeTurkish(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/İ/g, 'i')
      .replace(/I/g, 'ı')
      .replace(/ı/g, 'i')
      .replace(/Ğ/g, 'g').replace(/ğ/g, 'g')
      .replace(/Ü/g, 'u').replace(/ü/g, 'u')
      .replace(/Ş/g, 's').replace(/ş/g, 's')
      .replace(/Ö/g, 'o').replace(/ö/g, 'o')
      .replace(/Ç/g, 'c').replace(/ç/g, 'c')
      .toLowerCase();
  }
  db.function('turkish_lower', (str) => normalizeTurkish(str));

  // Enable foreign keys and WAL mode for performance
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');

  // Execute schema if needed
  const schemaPath = path.join(__dirname, 'data', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);

    // Dynamic schema updates for existing database instances
    try {
      db.prepare("ALTER TABLE messages ADD COLUMN file_url TEXT").run();
    } catch (e) {}

    try {
      db.prepare("ALTER TABLE messages ADD COLUMN file_name TEXT").run();
    } catch (e) {}

    try {
      db.prepare("ALTER TABLE users ADD COLUMN last_active_at DATETIME").run();
    } catch (e) {}

    try {
      db.prepare("ALTER TABLE users ADD COLUMN collaboration_status TEXT DEFAULT 'open'").run();
    } catch (e) {}

    try {
      db.prepare("ALTER TABLE meetings ADD COLUMN meeting_link TEXT").run();
    } catch (e) {}

    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          token TEXT NOT NULL UNIQUE,
          ip_address TEXT,
          user_agent TEXT,
          created_at DATETIME DEFAULT (datetime('now', 'localtime')),
          expires_at DATETIME,
          is_active INTEGER DEFAULT 1,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS tubitak_calls (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          url TEXT NOT NULL UNIQUE,
          source TEXT DEFAULT 'TÜBİTAK',
          created_at DATETIME DEFAULT (datetime('now', 'localtime'))
        );

        UPDATE users 
        SET photo_url = 'https://avesis.erdogan.edu.tr/user/image/' || LOWER(SUBSTR(avesis_profile_url, LENGTH('https://avesis.erdogan.edu.tr/') + 1)) 
        WHERE (photo_url IS NULL OR photo_url = '') 
          AND avesis_profile_url LIKE '%avesis.erdogan.edu.tr/%';
      `);
    } catch (e) {}

    // Dynamic schema updates for project publishing & visibility
    try {
      db.prepare("ALTER TABLE projects ADD COLUMN is_public INTEGER DEFAULT 0").run();
    } catch (e) {}

    try {
      db.prepare("ALTER TABLE projects ADD COLUMN published_at DATETIME").run();
    } catch (e) {}

    try {
      db.prepare("ALTER TABLE projects ADD COLUMN published_by INTEGER").run();
    } catch (e) {}

    try {
      db.prepare("UPDATE projects SET is_public = 1 WHERE status = 'open' OR status = 'published'").run();
    } catch (e) {}

    // Auto-ensure test accounts on server start
    try {
      db.prepare("DELETE FROM users WHERE (full_name LIKE '%Ali Ban%' OR full_name LIKE '%ALİ BAN%') AND email != 'ali_ban24@erdogan.edu.tr'").run();
      db.prepare("UPDATE users SET email = 'aslihaneksi@ogr.iu.edu.tr' WHERE (full_name LIKE '%Aslıhan Ekşi%' OR full_name LIKE '%ASLIHAN EKŞİ%') OR email = 'aslihan_eksi@erdogan.edu.tr'").run();

      const bcrypt = require('bcryptjs');
      const testHash = bcrypt.hashSync('123456', 10);
      const testAccounts = [
        { title: 'Doç. Dr.', full_name: 'Ali Ban', email: 'ali_ban24@erdogan.edu.tr', bio: 'Yazılım Mimarisi, Yapay Zeka ve Veri Analitiği alanında akademisyen ve araştırmacı.' },
        { title: 'Prof. Dr.', full_name: 'Muhammet Emin Kuk', email: 'muhammetemin_kuk24@erdogan.edu.tr', bio: 'Akıllı Üretim Sistemleri, Mekatronik ve Sonlu Elemanlar Yöntemi uzmanı.' },
        { title: 'Dr. Öğr. Üyesi', full_name: 'Aslıhan Ekşi', email: 'aslihaneksi@ogr.iu.edu.tr', bio: 'Biyomedikal Teknolojiler, Klinik Araştırmalar ve Sağlık Veri Madenciliği araştırmacısı.' }
      ];

      testAccounts.forEach(u => {
        let existing = db.prepare("SELECT id FROM users WHERE email = ?").get(u.email);
        if (existing) {
          db.prepare(`
            UPDATE users SET
              title = ?, full_name = ?, email = ?, password_hash = ?, bio = ?, is_claimed = 1, is_active = 1
            WHERE id = ?
          `).run(u.title, u.full_name, u.email, testHash, u.bio, existing.id);
        } else {
          db.prepare(`
            INSERT INTO users (title, full_name, email, password_hash, bio, is_claimed, is_active)
            VALUES (?, ?, ?, ?, ?, 1, 1)
          `).run(u.title, u.full_name, u.email, testHash, u.bio);
        }
      });
      console.log('✅ Örnek Test Akademisyen Hesapları Veritabanında Doğrulandı (Şifre: 123456)');
    } catch (e) {
      console.error('⚠️ Test hesapları oluşturulurken hata:', e);
    }
  }
} catch (error) {
  console.error("❌ VERİTABANI BAŞLATILIRKEN HATA OLUŞTU:");
  console.error(error);
  process.exit(1);
}

module.exports = db;
