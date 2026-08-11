/**
 * AVESİS CoMatch - Batch AVESİS Numeric Profile Photo Extractor
 * Crawls AVESİS profile pages to extract exact numeric image URLs (/user/image/{ID})
 */

const https = require('https');
const path = require('path');
const db = require('../db');

function fetchProfileHtml(urlStr) {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(urlStr);
      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'tr-TR,tr;q=0.9'
        },
        timeout: 6000
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      });

      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
      req.end();
    } catch (e) {
      resolve(null);
    }
  });
}

async function syncAllPhotos() {
  const users = db.prepare("SELECT id, full_name, avesis_profile_url FROM users WHERE avesis_profile_url LIKE '%avesis.erdogan.edu.tr/%'").all();
  console.log(`🚀 Extracting numeric photo URLs for ${users.length} academicians...`);

  const updateStmt = db.prepare('UPDATE users SET photo_url = ? WHERE id = ?');
  let successCount = 0;
  let skippedCount = 0;

  const BATCH_SIZE = 25;
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(async (u) => {
      const html = await fetchProfileHtml(u.avesis_profile_url);
      if (html) {
        const match = html.match(/src=["'](\/user\/image\/\d+)["']/i) || html.match(/src=["'](https?:\/\/[^"']+\/user\/image\/\d+)["']/i);
        if (match) {
          let photoUrl = match[1];
          if (photoUrl.startsWith('/')) {
            photoUrl = 'https://avesis.erdogan.edu.tr' + photoUrl;
          }
          updateStmt.run(photoUrl, u.id);
          successCount++;
          return;
        }
      }
      skippedCount++;
    }));

    if ((i + BATCH_SIZE) % 100 === 0 || i + BATCH_SIZE >= users.length) {
      console.log(`📸 Progress: ${Math.min(i + BATCH_SIZE, users.length)} / ${users.length} processed (Extracted: ${successCount})...`);
    }
  }

  console.log(`🎉 PHOTO SYNC FINISHED! Extracted numeric photo URLs for ${successCount} academicians (Skipped: ${skippedCount}).`);
}

if (require.main === module) {
  syncAllPhotos().then(() => process.exit(0)).catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
  });
}

module.exports = { syncAllPhotos };
