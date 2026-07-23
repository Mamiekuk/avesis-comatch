const https = require('https');

function fetchTubitakOpenCallsFromWeb() {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    };

    https.get('https://tubitak.gov.tr/tr/acik-cagrilar', options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const calls = [];
        const regex = /<div class=["']c-baslik["']>\s*<a href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
        let match;
        while ((match = regex.exec(body)) !== null) {
          const rawHref = match[1];
          const fullUrl = rawHref.startsWith('http') ? rawHref : `https://tubitak.gov.tr${rawHref}`;
          const cleanTitle = match[2].replace(/<[^>]+>/g, '').trim();
          if (cleanTitle && fullUrl) {
            calls.push({ title: cleanTitle, url: fullUrl });
          }
        }
        resolve(calls);
      });
    }).on('error', (err) => {
      console.error('⚠️ TÜBİTAK web scraping network error:', err.message);
      resolve([]);
    });
  });
}

async function syncTubitakCalls(db) {
  try {
    const webCalls = await fetchTubitakOpenCallsFromWeb();
    if (!webCalls || webCalls.length === 0) {
      return { newCallsCount: 0, totalFound: 0 };
    }

    let newCallsCount = 0;
    const activeUsers = db.prepare('SELECT id FROM users WHERE is_active = 1').all();

    for (const call of webCalls) {
      const existing = db.prepare('SELECT id FROM tubitak_calls WHERE url = ?').get(call.url);
      if (!existing) {
        // Insert new TÜBİTAK call
        db.prepare(`
          INSERT INTO tubitak_calls (title, url, source)
          VALUES (?, ?, 'TÜBİTAK')
        `).run(call.title, call.url);
        newCallsCount++;

        // Broadcast Notification Bell item ONLY (No chat messages)
        const notifTitle = `🏛️ TÜBİTAK Yeni Çağrı: ${call.title}`;
        const notifBody = `TÜBİTAK resmi sayfasında yeni bir açık çağrı yayınlandı. İncelemek için tıklayın.`;

        for (const u of activeUsers) {
          try {
            db.prepare(`
              INSERT INTO notifications (user_id, title, body, link)
              VALUES (?, ?, ?, ?)
            `).run(u.id, notifTitle, notifBody, call.url);
          } catch (e) {}
        }
      }
    }

    if (newCallsCount > 0) {
      console.log(`📡 TÜBİTAK Otomatik Scraper: ${newCallsCount} adet YENİ açık çağrı bulundu ve bildirim ziline iletildi!`);
    } else {
      console.log(`📡 TÜBİTAK Otomatik Scraper: Güncel (Son kontrol edilen çağrı sayısı: ${webCalls.length})`);
    }

    return { newCallsCount, totalFound: webCalls.length };
  } catch (err) {
    console.error('❌ TÜBİTAK Scraper Error:', err);
    return { newCallsCount: 0, totalFound: 0 };
  }
}

module.exports = { syncTubitakCalls };
