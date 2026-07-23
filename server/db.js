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
      `);
    } catch (e) {}
  }
} catch (error) {
  console.error("❌ VERİTABANI BAŞLATILIRKEN HATA OLUŞTU:");
  console.error(error);
  process.exit(1);
}

module.exports = db;
