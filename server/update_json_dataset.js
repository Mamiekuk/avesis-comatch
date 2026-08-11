const fs = require('fs');
const path = require('path');
const db = require('./db');

function updateResearchersJsonDataset() {
  console.log('🚀 avesis_researchers_output.json dosyası güncelleniyor...');

  const jsonPath = path.join(__dirname, 'data', 'avesis_researchers_output.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('❌ JSON dosyası bulunamadı:', jsonPath);
    return;
  }

  const rawJson = fs.readFileSync(jsonPath, 'utf8');
  const researchers = JSON.parse(rawJson);

  console.log(`📌 JSON dosyasında ${researchers.length} akademisyen bulundu.`);

  // Load all users from SQLite DB with their aggregated research areas
  const userRows = db.prepare(`
    SELECT 
      u.id, u.full_name, u.avesis_profile_url,
      GROUP_CONCAT(ra.label, ', ') as aggregated_tags
    FROM users u
    JOIN user_research_areas ura ON ura.user_id = u.id
    JOIN research_areas ra ON ra.id = ura.research_area_id
    GROUP BY u.id
  `).all();

  console.log(`📌 Veritabanında etiketli ${userRows.length} akademisyen bulundu.`);

  const slugToTagsMap = new Map();
  const nameToTagsMap = new Map();

  for (const u of userRows) {
    if (u.avesis_profile_url) {
      const slug = u.avesis_profile_url.split('/').pop().toLowerCase();
      slugToTagsMap.set(slug, u.aggregated_tags);
    }
    if (u.full_name) {
      const cleanName = u.full_name.replace(/\s+/g, ' ').trim().toLowerCase();
      nameToTagsMap.set(cleanName, u.aggregated_tags);
    }
  }

  let updatedCount = 0;

  for (const r of researchers) {
    const slug = (r.AvesisURL || '').split('/').pop().toLowerCase();
    const cleanName = (r.Name || '')
      .replace(/^(Prof\.?\s*Dr\.?|Doç\.?\s*Dr\.?|Dr\.?\s*Öğr\.?\s*Üyesi|Öğr\.?\s*Gör\.?\s*Dr\.?|Öğr\.?\s*Gör\.?|Arş\.?\s*Gör\.?\s*Dr\.?|Arş\.?\s*Gör\.?)\s+/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    let tags = slugToTagsMap.get(slug) || nameToTagsMap.get(cleanName);

    if (tags) {
      const existingSet = new Set((r.ResearchAreas || '').split(',').map(s => s.trim()).filter(Boolean));
      const newSet = new Set(tags.split(',').map(s => s.trim()).filter(Boolean));
      
      const mergedSet = new Set([...existingSet, ...newSet]);
      r.ResearchAreas = Array.from(mergedSet).join(', ');
      updatedCount++;
    }
  }

  fs.writeFileSync(jsonPath, JSON.stringify(researchers, null, 2), 'utf8');
  console.log(`✅ ${updatedCount} akademisyenin ResearchAreas alanı avesis_researchers_output.json dosyasında güncellendi!`);
}

updateResearchersJsonDataset();
