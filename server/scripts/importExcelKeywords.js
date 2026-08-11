/**
 * AVESİS CoMatch - Import Keywords from Downloads Excel File
 * Reads AVESIS_Son_3_Yillik_Makale_Anahtar_Kelimeleri.xlsx
 * and populates research_areas and user_research_areas in SQLite DB.
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const db = require('../db');
const kmeansEngine = require('../kmeansEngine');

function extractSlug(url) {
  if (!url) return '';
  try {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    const parts = cleanUrl.split('/');
    return parts[parts.length - 1].toLowerCase();
  } catch (e) {
    return '';
  }
}

async function importExcelKeywords() {
  const possiblePaths = [
    'C:\\Users\\30kpc\\Downloads\\AVESIS_Son_3_Yillik_Makale_Anahtar_Kelimeleri.xlsx',
    path.join(__dirname, '..', 'data', 'AVESIS_Son_3_Yillik_Makale_Anahtar_Kelimeleri.xlsx'),
    path.join(process.cwd(), 'data', 'AVESIS_Son_3_Yillik_Makale_Anahtar_Kelimeleri.xlsx')
  ];

  let excelPath = possiblePaths.find(p => fs.existsSync(p));

  if (!excelPath) {
    console.warn(`⚠️ AVESİS Excel dosyası bulunamadı. Atlanıyor.`);
    return;
  }

  console.log('====================================================');
  console.log(`🚀 Excel Anahtar Kelime İçe Aktarma Başlatılıyor...`);
  console.log(`📁 Dosya Yolu: ${excelPath}`);
  console.log('====================================================');

  const wb = XLSX.readFile(excelPath);
  const sheetName = wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);

  console.log(`📌 Excel'de ${rows.length} akademisyen satırı okundu.`);

  const insertTagStmt = db.prepare('INSERT OR IGNORE INTO research_areas (label) VALUES (?)');
  const getTagStmt = db.prepare('SELECT id FROM research_areas WHERE label = ?');
  const linkStmt = db.prepare('INSERT OR IGNORE INTO user_research_areas (user_id, research_area_id) VALUES (?, ?)');
  const updateHasFieldsStmt = db.prepare('UPDATE users SET has_research_fields = 1 WHERE id = ?');

  // Load all users from DB indexed by slug and by normalized full_name
  const dbUsers = db.prepare('SELECT id, full_name, avesis_profile_url FROM users').all();
  const slugToUserMap = new Map();
  const nameToUserMap = new Map();

  for (const u of dbUsers) {
    if (u.avesis_profile_url) {
      const slug = extractSlug(u.avesis_profile_url);
      if (slug) slugToUserMap.set(slug, u);
    }
    if (u.full_name) {
      nameToUserMap.set(u.full_name.trim().toLowerCase(), u);
    }
  }

  let matchedUsersCount = 0;
  let totalKeywordsAdded = 0;

  const transaction = db.transaction(() => {
    for (const row of rows) {
      const rawUrl = row['AVESİS Profil Adresi'] || row['AvesisURL'] || '';
      const rawName = row['Akademisyen Adı Soyadı'] || row['Name'] || '';
      const rawKeywords = row['Anahtar Kelimeler / Etiketler'] || row['Keywords'] || '';

      if (!rawKeywords || rawKeywords === 'Belirtilmedi') continue;

      // Find user by slug or name
      const slug = extractSlug(rawUrl);
      let matchedUser = slugToUserMap.get(slug);

      if (!matchedUser && rawName) {
        matchedUser = nameToUserMap.get(rawName.trim().toLowerCase());
      }

      if (!matchedUser) continue;

      // Parse keywords split by ' | ', ',', ';', '\n'
      const tags = rawKeywords
        .split(/\||,|;|\n/)
        .map(s => s.trim())
        .filter(s => s.length > 2 && s !== 'Belirtilmedi' && !/^(anahtar kelimeler|keywords)$/i.test(s));

      if (tags.length === 0) continue;

      let userAddedCount = 0;
      for (const tagLabel of tags) {
        insertTagStmt.run(tagLabel);
        const tagRow = getTagStmt.get(tagLabel);
        if (tagRow) {
          const res = linkStmt.run(matchedUser.id, tagRow.id);
          if (res.changes > 0) {
            userAddedCount++;
          }
        }
      }

      if (userAddedCount > 0) {
        updateHasFieldsStmt.run(matchedUser.id);
        totalKeywordsAdded += userAddedCount;
        matchedUsersCount++;
      }
    }
  });

  transaction();

  console.log('\n====================================================');
  console.log(`✨ Excel İçe Aktarma İşlemi Tamamlandı!`);
  console.log(`✅ Anahtar Kelimeleri Eşleşen Akademisyen Sayısı: ${matchedUsersCount}`);
  console.log(`🏷️  Toplam Eklenen Yeni Etiket İrtibatı: ${totalKeywordsAdded}`);
  console.log('====================================================');

  console.log('🔄 K-Means kümeleme motoru yenileniyor...');
  try {
    kmeansEngine.runClustering();
    console.log('✅ K-Means öneri motoru başarıyla güncellendi.');
  } catch (e) {
    console.warn('⚠️ K-Means uyarısı:', e.message);
  }
}

if (require.main === module) {
  importExcelKeywords().catch(err => {
    console.error('❌ İçe aktarma hatası:', err);
    process.exit(1);
  });
}

module.exports = {
  importExcelKeywords
};
