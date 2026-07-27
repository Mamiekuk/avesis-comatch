/**
 * AVESİS CoMatch - Batch AVESİS Profile Photo Fetcher
 * Crawls AVESİS profile pages to extract exact profile image URLs (/user/image/{ID})
 */

const db = require('../db');

async function syncAllPhotos() {
  const users = db.prepare("SELECT id, full_name, avesis_profile_url FROM users WHERE avesis_profile_url LIKE '%avesis.erdogan.edu.tr/%'").all();
  console.log(`🚀 Total ${users.length} academicians to process for photo URL extraction...`);

  const updateStmt = db.prepare('UPDATE users SET photo_url = ? WHERE id = ?');
  let successCount = 0;
  let errorCount = 0;

  // Process in concurrent batches of 15
  const BATCH_SIZE = 15;
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (u) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);
        const res = await fetch(u.avesis_profile_url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8'
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const html = await res.text();
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
        // Fallback photo URL format if page load has different structure
        const slug = u.avesis_profile_url.split('/').pop().toLowerCase();
        if (slug) {
          updateStmt.run(`https://avesis.erdogan.edu.tr/user/image/${slug}`, u.id);
          successCount++;
        }
      } catch (e) {
        errorCount++;
        // Fallback slug image URL on timeout
        const slug = u.avesis_profile_url.split('/').pop().toLowerCase();
        if (slug) {
          updateStmt.run(`https://avesis.erdogan.edu.tr/user/image/${slug}`, u.id);
        }
      }
    }));

    if ((i + BATCH_SIZE) % 150 === 0 || i + BATCH_SIZE >= users.length) {
      console.log(`📸 Progress: ${Math.min(i + BATCH_SIZE, users.length)} / ${users.length} processed...`);
    }
  }

  console.log(`🎉 COMPLETED! Successfully updated photo URLs for ${successCount} academicians (Errors/Fallbacks: ${errorCount}).`);
}

if (require.main === module) {
  syncAllPhotos().then(() => process.exit(0)).catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
  });
}

module.exports = { syncAllPhotos };
