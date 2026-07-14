const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db;
try {
  const dbDir = process.env.DATABASE_DIR || path.join(__dirname, 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
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
  }
} catch (error) {
  console.error("❌ VERİTABANI BAŞLATILIRKEN HATA OLUŞTU:");
  console.error(error);
  process.exit(1);
}

module.exports = db;
