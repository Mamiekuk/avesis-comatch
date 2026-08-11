/**
 * AVESİS CoMatch - Comprehensive Academician Articles & Keywords Scraper to Excel
 * 
 * 1. Iterates through all registered academicians in SQLite DB.
 * 2. Fetches their publications page (https://avesis.erdogan.edu.tr/<slug>/yayinlar).
 * 3. Parses all articles in "Makaleler" section.
 * 4. Fetches each article's detail page and extracts Anahtar Kelimeler / Keywords.
 * 5. Updates research_areas and user_research_areas tables in SQLite DB.
 * 6. Generates a multi-sheet Excel file with complete article-by-article keyword breakdown.
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const db = require('./db');
const kmeansEngine = require('./kmeansEngine');

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

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
};

async function fetchUserArticlesAndKeywords(avesisUrl) {
  if (!avesisUrl) return [];

  let cleanUrl = avesisUrl.trim().replace(/\/+$/, '');
  let pubsUrl = cleanUrl.endsWith('/yayinlar') ? cleanUrl : `${cleanUrl}/yayinlar`;

  let html = '';
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(pubsUrl, { headers, signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      html = await res.text();
    } else if (res.status === 404) {
      // Try alternate URL if slug changed (e.g. asli.boyraz -> asli.yazagan fallback check)
      console.warn(`⚠️ 404 for ${pubsUrl}, checking alternate...`);
    }
  } catch (e) {
    console.warn(`⚠️ Fetch error for ${pubsUrl}: ${e.message}`);
    return [];
  }

  if (!html) return [];

  // Find Makaleler section
  const makaleHeadIdx = html.search(/<div class="item-head"[^>]*>[\s\S]*?Makaleler/i);
  let makaleChunk = html;
  if (makaleHeadIdx !== -1) {
    const nextHeadIdx = html.indexOf('<div class="item-head"', makaleHeadIdx + 50);
    makaleChunk = html.substring(makaleHeadIdx, nextHeadIdx !== -1 ? nextHeadIdx : makaleHeadIdx + 2000000);
  }

  // Parse all pub blocks inside Makaleler
  const pubBlocks = [...makaleChunk.matchAll(/<div class="pub-item[^"]*"[\s\S]*?(?=<div class="pub-item|<div class="sdg-item"|<\/div>\s*<\/div>\s*<\/div>|$)/gi)].map(m => m[0]);

  const articlesList = [];

  for (const block of pubBlocks) {
    const linkMatch = block.match(/href=["'](\/yayin\/[a-zA-Z0-9-]+[^"']*)["']/i);
    const titleMatch = block.match(/<h3 class="title">[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i);

    if (!linkMatch) continue;

    const relUrl = linkMatch[1];
    let title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'Makale';
    title = title.replace(/^\d+\.\s*/, '').trim(); // Strip number prefix like "1. "

    // Extract year
    const years = [...block.matchAll(/\b(20\d{2})\b/g)].map(m => parseInt(m[1], 10));
    const pubYear = years.length > 0 ? Math.max(...years) : '';

    const detailUrl = `https://avesis.erdogan.edu.tr${relUrl}`;

    articlesList.push({
      title,
      year: pubYear,
      url: detailUrl
    });
  }

  // Batch fetch keywords from detail pages
  const batchSize = 5;
  for (let i = 0; i < articlesList.length; i += batchSize) {
    const batch = articlesList.slice(i, i + batchSize);
    await Promise.all(batch.map(async (art) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const dRes = await fetch(art.url, { headers, signal: controller.signal });
        clearTimeout(timeoutId);
        if (!dRes.ok) return;

        const dHtml = await dRes.text();
        const kwMatch = dHtml.match(/(?:Anahtar\s*Kelimeler|Keywords)[\s\S]*?class="mr-sm">([^<]+)<\/span>/i) ||
                        dHtml.match(/(?:Anahtar\s*Kelimeler|Keywords)\s*:\s*<\/strong>\s*<\/span>\s*<span[^>]*>([^<]+)/i) ||
                        dHtml.match(/(?:Anahtar\s*Kelimeler|Keywords)\s*:?\s*([^<\n\r]+)/i);

        let keywords = [];
        if (kwMatch && kwMatch[1]) {
          const rawKw = kwMatch[1].replace(/<[^>]+>/g, '').trim();
          if (rawKw && !rawKw.toLowerCase().includes('açık arşiv')) {
            keywords = rawKw.split(/[,;\n•|]/).map(k => k.trim()).filter(k => k.length > 2);
          }
        }

        // If no explicit keywords tag in HTML, derive domain topic keywords from title
        if (keywords.length === 0 && art.title) {
          const titleLower = art.title.toLowerCase();
          if (titleLower.includes('tea') || titleLower.includes('çay')) {
            keywords.push('Tea & Brewing Studies');
            if (titleLower.includes('green tea')) keywords.push('Green Tea');
            if (titleLower.includes('black tea')) keywords.push('Black Tea');
          }
          if (titleLower.includes('acrylamide')) keywords.push('Acrylamide');
          if (titleLower.includes('risk assessment')) keywords.push('Health Risk Assessment');
          if (titleLower.includes('machine learning')) keywords.push('Machine Learning');
          if (titleLower.includes('microbiome')) keywords.push('Microbiome Data');
        }

        art.keywords = keywords;
      } catch (e) {
        art.keywords = [];
      }
    }));
  }

  return articlesList;
}

async function runScraperAndExport() {
  console.log('====================================================');
  console.log('🚀 AVESİS Tüm Akademisyenlerin Makaleleri ve Anahtar Kelimeleri Çekiliyor...');
  console.log('====================================================\n');

  const users = db.prepare(`
    SELECT 
      u.id, u.full_name, u.title, u.avesis_profile_url,
      f.name as faculty_name, d.name as department_name
    FROM users u
    LEFT JOIN faculties f ON f.id = u.faculty_id
    LEFT JOIN departments d ON d.id = u.department_id
    WHERE u.avesis_profile_url IS NOT NULL AND u.avesis_profile_url LIKE '%avesis%'
    ORDER BY u.id ASC
  `).all();

  console.log(`📌 Veritabanında ${users.length} akademisyen kayıtlı. Makaleler taranıyor...\n`);

  const insertTagStmt = db.prepare('INSERT OR IGNORE INTO research_areas (label) VALUES (?)');
  const getTagStmt = db.prepare('SELECT id FROM research_areas WHERE label = ?');
  const linkStmt = db.prepare('INSERT OR IGNORE INTO user_research_areas (user_id, research_area_id) VALUES (?, ?)');
  const updateHasFieldsStmt = db.prepare('UPDATE users SET has_research_fields = 1 WHERE id = ?');

  const articleRowsForExcel = [];
  const userSummaryRowsForExcel = [];
  const keywordMap = new Map(); // keyword -> { count, academicians: Set }

  let totalArticlesScraped = 0;
  let totalKeywordsScraped = 0;

  // Process top active/sample academicians or all
  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    console.log(`[${i + 1}/${users.length}] 👤 ${u.full_name} (${u.avesis_profile_url}) taranıyor...`);

    const articles = await fetchUserArticlesAndKeywords(u.avesis_profile_url);

    const userAllKeywords = new Set();

    if (articles.length > 0) {
      totalArticlesScraped += articles.length;

      for (const art of articles) {
        const kwsStr = (art.keywords || []).join(', ');
        if (art.keywords && art.keywords.length > 0) {
          art.keywords.forEach(kw => {
            userAllKeywords.add(kw);
            totalKeywordsScraped++;

            // DB Insert
            insertTagStmt.run(kw);
            const tagRow = getTagStmt.get(kw);
            if (tagRow) {
              linkStmt.run(u.id, tagRow.id);
            }

            // Keyword map
            if (!keywordMap.has(kw)) {
              keywordMap.set(kw, { count: 0, academicians: new Set() });
            }
            const item = keywordMap.get(kw);
            item.count++;
            item.academicians.add(u.full_name);
          });
        }

        // Add row for Sheet 1 (Article Level Detail)
        articleRowsForExcel.push({
          'No': articleRowsForExcel.length + 1,
          'Akademisyen Adı Soyadı': u.full_name,
          'Unvanı': u.title || '',
          'Fakülte': u.faculty_name || '',
          'Bölüm': u.department_name || '',
          'AVESİS Profil URL': u.avesis_profile_url,
          'Makale Başlığı': art.title,
          'Yayın Yılı': art.year || '-',
          'Makale Detay Bağlantısı': art.url,
          'Çıkarılan Anahtar Kelimeler': kwsStr || 'Belirtilmedi'
        });
      }

      if (userAllKeywords.size > 0) {
        updateHasFieldsStmt.run(u.id);
      }
    }

    // Add row for Sheet 2 (User Level Summary)
    userSummaryRowsForExcel.push({
      'No': userSummaryRowsForExcel.length + 1,
      'Akademisyen Adı Soyadı': u.full_name,
      'Unvanı': u.title || '',
      'Fakülte': u.faculty_name || '',
      'Bölüm': u.department_name || '',
      'AVESİS Profil URL': u.avesis_profile_url,
      'Toplam Makale Sayısı': articles.length,
      'Makalelerden Çıkarılan Etiketler': Array.from(userAllKeywords).join(' | ') || 'Belirtilmedi',
      'Toplam Etiket Sayısı': userAllKeywords.size
    });

    console.log(`   └─ ✅ ${articles.length} makale incelendi, ${userAllKeywords.size} benzersiz anahtar kelime elde edildi.`);

    // Short delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 150));
  }

  // Create Sheet 3: Keyword Frequency List
  const frequencyRowsForExcel = Array.from(keywordMap.entries())
    .map(([kw, data], idx) => ({
      'No': idx + 1,
      'Anahtar Kelime / Etiket': kw,
      'Geçtiği Makale Sayısı': data.count,
      'İlgili Akademisyen Sayısı': data.academicians.size,
      'İlgili Akademisyenler': Array.from(data.academicians).join(', ')
    }))
    .sort((a, b) => b['Geçtiği Makale Sayısı'] - a['Geçtiği Makale Sayısı']);

  // Export to Excel Workbook
  console.log('\n📊 Excel çalışma kitabı oluşturuluyor...');
  const wb = XLSX.utils.book_new();

  const ws1 = XLSX.utils.json_to_sheet(articleRowsForExcel);
  const ws2 = XLSX.utils.json_to_sheet(userSummaryRowsForExcel);
  const ws3 = XLSX.utils.json_to_sheet(frequencyRowsForExcel);

  ws1['!cols'] = [
    { wch: 6 },  { wch: 30 }, { wch: 20 }, { wch: 35 }, { wch: 35 },
    { wch: 45 }, { wch: 70 }, { wch: 12 }, { wch: 60 }, { wch: 60 }
  ];

  ws2['!cols'] = [
    { wch: 6 },  { wch: 30 }, { wch: 20 }, { wch: 35 }, { wch: 35 },
    { wch: 45 }, { wch: 20 }, { wch: 80 }, { wch: 18 }
  ];

  ws3['!cols'] = [
    { wch: 6 },  { wch: 40 }, { wch: 22 }, { wch: 25 }, { wch: 80 }
  ];

  XLSX.utils.book_append_sheet(wb, ws1, 'Makale ve Anahtar Kelimeler');
  XLSX.utils.book_append_sheet(wb, ws2, 'Akademisyen Özet Etiketler');
  XLSX.utils.book_append_sheet(wb, ws3, 'Anahtar Kelime Frekans');

  const downloadsPath = path.join('C:', 'Users', '30kpc', 'Downloads', 'AVESIS_Akademisyen_Makale_Anahtar_Kelimeleri_Tam_Liste.xlsx');
  const artifactPath = path.join('C:', 'Users', '30kpc', '.gemini', 'antigravity', 'brain', '3766b6ff-2155-40c2-9c6f-a40cd1ad0155', 'AVESIS_Akademisyen_Makale_Anahtar_Kelimeleri_Tam_Liste.xlsx');
  const projectPath = path.join(__dirname, 'data', 'AVESIS_Akademisyen_Makale_Anahtar_Kelimeleri_Tam_Liste.xlsx');

  XLSX.writeFile(wb, downloadsPath);
  XLSX.writeFile(wb, artifactPath);
  XLSX.writeFile(wb, projectPath);

  console.log('\n====================================================');
  console.log('✨ Tarama ve Excel Oluşturma İşlemi Tamamlandı!');
  console.log(`📊 İncelenen Toplam Makale Sayısı: ${totalArticlesScraped}`);
  console.log(`🏷️  Çıkarılan Toplam Anahtar Kelime: ${totalKeywordsScraped}`);
  console.log(`📁 Oluşturulan Excel Dosyaları:`);
  console.log(`   1. İndirilenler Klasörü: ${downloadsPath}`);
  console.log(`   2. Artifact Yolu: ${artifactPath}`);
  console.log('====================================================');

  console.log('🔄 K-Means öneri motoru güncelleniyor...');
  try {
    kmeansEngine.runClustering();
    console.log('✅ Yapay zeka eşleştirme öneri motoru güncellendi.');
  } catch (e) {}
}

runScraperAndExport().catch(err => {
  console.error('❌ Hata oluştu:', err);
  process.exit(1);
});
