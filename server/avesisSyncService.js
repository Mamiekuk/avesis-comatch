/**
 * AVESİS CoMatch - AVESİS / YÖKSİS Automatic Profile Sync Service
 */

const fs = require('fs');
const path = require('path');
const db = require('./db');
const kmeansEngine = require('./kmeansEngine');

// Load local pre-scraped dataset for fast matching fallback
let cachedResearchers = null;
function getCachedResearchers() {
  if (!cachedResearchers) {
    try {
      const filePath = path.join(__dirname, 'data', 'avesis_researchers_output.json');
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        cachedResearchers = JSON.parse(raw);
      } else {
        cachedResearchers = [];
      }
    } catch (e) {
      console.warn('⚠️ AVESİS local dataset load error:', e.message);
      cachedResearchers = [];
    }
  }
  return cachedResearchers;
}

/**
 * Extract username or slug from AVESİS URL
 * e.g. "https://avesis.erdogan.edu.tr/murat.yaylaci" -> "murat.yaylaci"
 */
function extractAvesisSlug(url) {
  if (!url) return '';
  try {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    const parts = cleanUrl.split('/');
    return parts[parts.length - 1].toLowerCase();
  } catch (e) {
    return '';
  }
}

/**
 * Parses AVESİS Profile HTML string to extract metrics & research areas
 */
function parseAvesisHtml(html) {
  const extracted = {
    researchAreas: [],
    pub_total: 0,
    pub_wos: 0,
    pub_scopus: 0,
    cite_wos: 0,
    h_index_wos: 0,
    cite_scopus: 0,
    h_index_scopus: 0,
    cite_scholar: 0,
    h_index_scholar: 0,
    cite_tr_dizin: 0,
    h_index_tr_dizin: 0,
    project_count: 0,
    thesis_advising: 0,
    open_access: 0
  };

  if (!html || typeof html !== 'string') return extracted;

  // 1. Research Areas extraction
  const raMatch = html.match(/Araştırma Alanları[\s\S]*?(?:<\/div>|<\/section>|İletişim|Yayınlar)/i);
  if (raMatch) {
    const areaText = raMatch[0].replace(/<[^>]+>/g, ' ');
    const tags = areaText.split(/[,;\n•|]/).map(s => s.trim()).filter(s => s.length > 2 && !/Araştırma Alanları|İletişim|Yayınlar/i.test(s));
    extracted.researchAreas = Array.from(new Set(tags));
  }

  // 2. Exact Profile Photo URL extraction (/user/image/{ID})
  const imgMatch = html.match(/src=["'](\/user\/image\/\d+)["']/i) || html.match(/src=["'](https?:\/\/[^"']+\/user\/image\/\d+)["']/i);
  if (imgMatch) {
    let pUrl = imgMatch[1];
    if (pUrl.startsWith('/')) pUrl = 'https://avesis.erdogan.edu.tr' + pUrl;
    extracted.photo_url = pUrl;
  }

  // 3. Metrics regex extraction helper
  const parseVal = (regex) => {
    const m = html.match(regex);
    return m && m[1] ? parseInt(m[1].replace(/\D/g, ''), 10) || 0 : 0;
  };

  extracted.pub_total = parseVal(/(?:Toplam Yayın|Yayın Sayısı)[\s\S]*?(\d+)/i);
  extracted.pub_wos = parseVal(/(?:WoS Yayın|Web of Science Yayın)[\s\S]*?(\d+)/i);
  extracted.pub_scopus = parseVal(/Scopus Yayın[\s\S]*?(\d+)/i);
  extracted.h_index_wos = parseVal(/(?:WoS h-index|WoS H-İndeksi|h-index \(WoS\))[\s\S]*?(\d+)/i);
  extracted.cite_wos = parseVal(/(?:WoS Atıf|Web of Science Atıf)[\s\S]*?(\d+)/i);
  extracted.h_index_scopus = parseVal(/(?:Scopus h-index|Scopus H-İndeksi)[\s\S]*?(\d+)/i);
  extracted.cite_scopus = parseVal(/Scopus Atıf[\s\S]*?(\d+)/i);
  extracted.h_index_scholar = parseVal(/(?:Google Scholar h-index|Scholar H-İndeksi)[\s\S]*?(\d+)/i);
  extracted.cite_scholar = parseVal(/(?:Google Scholar Atıf|Scholar Atıf)[\s\S]*?(\d+)/i);

  return extracted;
}

/**
 * Main Sync function for a specific user ID
 */
async function syncUserAvesisProfile(userId) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    throw new Error('Kullanıcı bulunamadı');
  }

  const avesisUrl = user.avesis_profile_url;
  if (!avesisUrl || !avesisUrl.includes('avesis')) {
    throw new Error('Lütfen önce profil ayarlarınızda geçerli bir AVESİS profil linki kaydedin.');
  }

  const slug = extractAvesisSlug(avesisUrl);
  let syncData = null;

  // 1. Try Live HTML Fetch
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(avesisUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const htmlText = await response.text();
      const parsed = parseAvesisHtml(htmlText);
      if (parsed.pub_total > 0 || parsed.researchAreas.length > 0) {
        syncData = parsed;
      }
    }
  } catch (e) {
    console.log(`ℹ️ Live AVESİS fetch timed out or restricted for ${avesisUrl}, falling back to database matching.`);
  }

  // 2. Fallback to Local AVESİS Dataset Matching
  if (!syncData) {
    const researchers = getCachedResearchers();
    const matched = researchers.find(r => {
      if (!r.AvesisURL) return false;
      const rSlug = extractAvesisSlug(r.AvesisURL);
      return rSlug && slug && (rSlug === slug || r.AvesisURL.toLowerCase().includes(slug));
    });

    if (matched) {
      const parseNum = (val) => parseInt((val || '0').toString().replace(/\D/g, ''), 10) || 0;
      const rAreas = (matched.ResearchAreas || '')
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 2);

      syncData = {
        researchAreas: rAreas,
        pub_total: parseNum(matched.Yayın_Toplam),
        pub_wos: parseNum(matched.Yayın_WoS),
        pub_scopus: parseNum(matched.Yayın_Scopus),
        cite_wos: parseNum(matched.Atıf_WoS),
        h_index_wos: parseNum(matched.H_İndeks_WoS),
        cite_scopus: parseNum(matched.Atıf_Scopus),
        h_index_scopus: parseNum(matched.H_İndeks_Scopus),
        cite_scholar: parseNum(matched.Atıf_Scholar),
        h_index_scholar: parseNum(matched.H_İndeks_Scholar),
        cite_tr_dizin: parseNum(matched.Atıf_TrDizin),
        h_index_tr_dizin: parseNum(matched.H_İndeks_TrDizin),
        project_count: parseNum(matched.Proje_Sayısı),
        thesis_advising: parseNum(matched.Tez_Danışmanlığı),
        open_access: parseNum(matched.Açık_Erişim)
      };
    }
  }

  if (!syncData) {
    throw new Error('AVESİS verileri çekilemedi. Profil URL adresinizin doğruluğunu kontrol edin.');
  }

  const autoPhotoUrl = syncData.photo_url || null;

  // 3. Update User DB Metrics
  db.prepare(`
    UPDATE users SET
      photo_url = COALESCE(?, photo_url),
      pub_total = ?,
      pub_wos = ?,
      pub_scopus = ?,
      cite_wos = ?,
      h_index_wos = ?,
      cite_scopus = ?,
      h_index_scopus = ?,
      cite_scholar = ?,
      h_index_scholar = ?,
      cite_tr_dizin = ?,
      h_index_tr_dizin = ?,
      project_count = ?,
      thesis_advising = ?,
      open_access = ?
    WHERE id = ?
  `).run(
    autoPhotoUrl,
    syncData.pub_total,
    syncData.pub_wos,
    syncData.pub_scopus,
    syncData.cite_wos,
    syncData.h_index_wos,
    syncData.cite_scopus,
    syncData.h_index_scopus,
    syncData.cite_scholar,
    syncData.h_index_scholar,
    syncData.cite_tr_dizin,
    syncData.h_index_tr_dizin,
    syncData.project_count,
    syncData.thesis_advising,
    syncData.open_access,
    userId
  );

  // 4. Update Research Areas Tags in DB
  if (syncData.researchAreas && syncData.researchAreas.length > 0) {
    const insertTagStmt = db.prepare('INSERT OR IGNORE INTO research_areas (label) VALUES (?)');
    const getTagStmt = db.prepare('SELECT id FROM research_areas WHERE label = ?');
    const linkStmt = db.prepare('INSERT OR IGNORE INTO user_research_areas (user_id, research_area_id) VALUES (?, ?)');

    for (const label of syncData.researchAreas) {
      insertTagStmt.run(label);
      const tagRow = getTagStmt.get(label);
      if (tagRow) {
        linkStmt.run(userId, tagRow.id);
      }
    }

    db.prepare('UPDATE users SET has_research_fields = 1 WHERE id = ?').run(userId);
  }

  // 5. Re-run K-Means clustering to refresh AI recommendations immediately
  try {
    kmeansEngine.runClustering();
  } catch (err) {
    console.warn('⚠️ K-Means reclustering notice:', err.message);
  }

  // Return updated user record
  const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  const userTags = db.prepare(`
    SELECT ra.id, ra.label 
    FROM research_areas ra
    JOIN user_research_areas ura ON ra.id = ura.research_area_id
    WHERE ura.user_id = ?
  `).all(userId);

  return {
    user: updatedUser,
    research_areas: userTags,
    synced_metrics: syncData
  };
}

module.exports = {
  syncUserAvesisProfile
};
