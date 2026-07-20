/**
 * AVESİS CoMatch - K-Means Clustering Engine (kmeansEngine.js)
 * 
 * Bu modül, üniversitedeki tüm kayıtlı akademisyenleri denetimsiz öğrenme (Unsupervised ML)
 * K-Means algoritması ile iki ayrı boyutta analiz eder ve kümelere ayırır:
 * 
 * 1. Araştırma Alanı Etiketlerine Göre (K=6) -> "Akademik Mahalleler" (Cosine/Jaccard Benzerliği)
 * 2. Sayısal Performans Metriklerine Göre (K=4) -> "Performans Profilleri" (Euclidean Mesafesi)
 */

let db = null;

// In-Memory Önbellek
const cache = {
  userClusters: new Map(), // userId -> { tag_cluster: { id, name, distance }, metric_cluster: { id, label, badge, distance } }
  tagClustersSummary: [],
  metricClustersSummary: [],
  lastUpdated: null
};

function init(dbInstance) {
  db = dbInstance;
  runClustering();
}

/**
 * Ana kümeleme döngüsü (Hem etiketleri hem de metrikleri kümeleyip önbelleği günceller)
 */
function runClustering() {
  if (!db) return;
  const startTime = Date.now();

  try {
    const users = db.prepare(`
      SELECT u.id, u.full_name, u.title, u.faculty_id, u.department_id,
             u.photo_url, u.is_claimed, u.is_active, u.bio, u.avesis_profile_url,
             u.pub_total, u.pub_wos, u.pub_scopus,
             u.cite_wos, u.cite_scopus, u.cite_scholar, u.cite_tr_dizin, u.cite_sobiad,
             u.h_index_wos, u.h_index_scopus, u.h_index_scholar, u.h_index_tr_dizin, u.h_index_sobiad,
             u.project_count, u.thesis_advising,
             f.name as faculty_name, d.name as department_name
      FROM users u
      LEFT JOIN faculties f ON f.id = u.faculty_id
      LEFT JOIN departments d ON d.id = u.department_id
    `).all();

    if (!users || users.length === 0) return;

    // Tüm kullanıcıların araştırma alanı etiket ID'lerini ve etiket isimlerini çekelim
    const allUserTags = db.prepare(`
      SELECT ura.user_id, ra.id as tag_id, ra.label
      FROM user_research_areas ura
      JOIN research_areas ra ON ra.id = ura.research_area_id
    `).all();

    const userTagMap = new Map();
    for (const ut of allUserTags) {
      if (!userTagMap.has(ut.user_id)) {
        userTagMap.set(ut.user_id, []);
      }
      userTagMap.get(ut.user_id).push({ id: ut.tag_id, label: ut.label });
    }

    // Kullanıcılara tag listelerini bağlayalım
    for (const u of users) {
      u.tags = userTagMap.get(u.id) || [];
      u.tagIds = u.tags.map(t => t.id);
    }

    // 1. ETİKET / ARAŞTIRMA ALANI KÜMELEMESİ (K = 6)
    const tagClusterResults = clusterUsersByTags(users, 6);

    // 2. METRİK & PERFORMANS KÜMELEMESİ (K = 4)
    const metricClusterResults = clusterUsersByMetrics(users, 4);

    // Sonuçları birleştirip önbelleğe yazalım
    cache.userClusters.clear();
    for (const u of users) {
      cache.userClusters.set(u.id, {
        tag_cluster: tagClusterResults.userMap.get(u.id) || { id: 0, name: 'Genel Araştırma Kümesi', distance: 0 },
        metric_cluster: metricClusterResults.userMap.get(u.id) || { id: 0, label: 'Yükselen Araştırmacı', badge: '🚀 Yükselen Araştırmacı', distance: 0 }
      });
    }

    cache.tagClustersSummary = tagClusterResults.summary;
    cache.metricClustersSummary = metricClusterResults.summary;
    cache.lastUpdated = new Date().toISOString();

    console.log(`🤖 K-Means Kümeleme Motoru başarıyla çalıştırıldı! (${users.length} akademisyen, ${Date.now() - startTime}ms)`);
  } catch (err) {
    console.error('❌ K-Means kümeleme hesaplanırken hata oluştu:', err);
  }
}

/**
 * Araştırma Alanı Etiketlerine Göre K-Means (Cosine Benzerliği tabanlı)
 */
function clusterUsersByTags(users, k) {
  const usersWithTags = users.filter(u => u.tagIds && u.tagIds.length > 0);
  if (usersWithTags.length === 0) {
    return { userMap: new Map(), summary: [] };
  }

  // Tüm etiket evrenini çıkaralım
  const allTagIdsSet = new Set();
  const tagLabelMap = new Map();
  for (const u of usersWithTags) {
    for (const t of u.tags) {
      allTagIdsSet.add(t.id);
      tagLabelMap.set(t.id, t.label);
    }
  }
  const allTagIds = Array.from(allTagIdsSet);
  const tagIndexMap = new Map(allTagIds.map((id, idx) => [id, idx]));
  const D = allTagIds.length;

  // Başlangıç Centroidleri (K-Means++ benzeri dengeli dağılım seçimi)
  const centroids = [];
  const step = Math.max(1, Math.floor(usersWithTags.length / k));
  for (let i = 0; i < k; i++) {
    const chosenUser = usersWithTags[Math.min(i * step, usersWithTags.length - 1)];
    const vec = new Array(D).fill(0);
    for (const tagId of chosenUser.tagIds) {
      const idx = tagIndexMap.get(tagId);
      if (idx !== undefined) vec[idx] = 1;
    }
    centroids.push(vec);
  }

  const assignments = new Array(usersWithTags.length).fill(0);
  const distances = new Array(usersWithTags.length).fill(0);
  const maxIterations = 15;

  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = false;

    // Atama Adımı: Her kullanıcıyı en yakın (Kosinüs mesafesi en düşük) centroide ata
    for (let i = 0; i < usersWithTags.length; i++) {
      const u = usersWithTags[i];
      let bestCluster = 0;
      let minDist = Infinity;

      for (let c = 0; c < k; c++) {
        const dist = cosineDistanceSparse(u.tagIds, tagIndexMap, centroids[c]);
        if (dist < minDist) {
          minDist = dist;
          bestCluster = c;
        }
      }

      if (assignments[i] !== bestCluster) {
        assignments[i] = bestCluster;
        changed = true;
      }
      distances[i] = minDist;
    }

    if (!changed && iter > 0) break;

    // Güncelleme Adımı: Centroid vektörlerinin ortalamasını al
    const clusterCounts = new Array(k).fill(0);
    const newCentroids = Array.from({ length: k }, () => new Array(D).fill(0));

    for (let i = 0; i < usersWithTags.length; i++) {
      const c = assignments[i];
      clusterCounts[c]++;
      const u = usersWithTags[i];
      for (const tagId of u.tagIds) {
        const idx = tagIndexMap.get(tagId);
        if (idx !== undefined) newCentroids[c][idx] += 1;
      }
    }

    for (let c = 0; c < k; c++) {
      if (clusterCounts[c] > 0) {
        for (let d = 0; d < D; d++) {
          centroids[c][d] = newCentroids[c][d] / clusterCounts[c];
        }
      }
    }
  }

  // Her kümenin en öne çıkan etiketlerini bulup dinamik isim ve özet çıkaralım
  const clusterSummaries = [];
  const clusterNames = new Array(k);

  for (let c = 0; c < k; c++) {
    const tagScores = [];
    for (let d = 0; d < D; d++) {
      if (centroids[c][d] > 0) {
        const tagId = allTagIds[d];
        tagScores.push({ label: tagLabelMap.get(tagId), score: centroids[c][d] });
      }
    }
    tagScores.sort((a, b) => b.score - a.score);
    const topTags = tagScores.slice(0, 4).map(t => t.label);
    
    let clusterName = topTags.slice(0, 2).join(' & ');
    if (!clusterName) clusterName = `Genel Araştırma Kümesi ${c + 1}`;
    else clusterName = `${clusterName} Kümesi`;

    clusterNames[c] = clusterName;

    const memberCount = assignments.filter(a => a === c).length;
    clusterSummaries.push({
      id: c,
      name: clusterName,
      member_count: memberCount,
      top_tags: topTags,
      description: topTags.length > 0 
        ? `${topTags.join(', ')} alanlarında yoğunlaşan disiplinlerarası araştırma grubu.`
        : 'Çeşitli akademik disiplinleri barındıran araştırma grubu.'
    });
  }

  const userMap = new Map();
  for (let i = 0; i < usersWithTags.length; i++) {
    const u = usersWithTags[i];
    const cId = assignments[i];
    userMap.set(u.id, {
      id: cId,
      name: clusterNames[cId],
      distance: Number(distances[i].toFixed(4))
    });
  }

  return { userMap, summary: clusterSummaries };
}

/**
 * Kosinüs mesafesi hesabı (1 - Cosine Similarity)
 */
function cosineDistanceSparse(userTagIds, tagIndexMap, centroidVec) {
  let dotProduct = 0;
  let userNormSq = userTagIds.length; // Çünkü binary (her etiket 1)
  let centNormSq = 0;

  for (const val of centroidVec) {
    centNormSq += val * val;
  }

  if (userNormSq === 0 || centNormSq === 0) return 1.0;

  for (const tagId of userTagIds) {
    const idx = tagIndexMap.get(tagId);
    if (idx !== undefined) {
      dotProduct += centroidVec[idx];
    }
  }

  const cosSim = dotProduct / (Math.sqrt(userNormSq) * Math.sqrt(centNormSq));
  return Math.max(0, Math.min(1, 1 - cosSim));
}

/**
 * Sayısal Metrik ve Performans Kümelemesi (Euclidean Mesafesi)
 */
function clusterUsersByMetrics(users, k) {
  const n = users.length;
  if (n === 0) return { userMap: new Map(), summary: [] };

  // 4 Temel Metrik: [Yayın Sayısı, Toplam Atıf, Maks H-İndeks, Proje Sayısı]
  const rawFeatures = users.map(u => {
    const pub = u.pub_total || 0;
    const cite = (u.cite_wos || 0) + (u.cite_scopus || 0) + (u.cite_scholar || 0) + (u.cite_tr_dizin || 0);
    const hIndex = Math.max(u.h_index_wos || 0, u.h_index_scopus || 0, u.h_index_scholar || 0, u.h_index_tr_dizin || 0);
    const proj = u.project_count || 0;
    return [pub, cite, hIndex, proj];
  });

  // Min-Max Normalizasyon [0, 1]
  const minVals = [Infinity, Infinity, Infinity, Infinity];
  const maxVals = [-Infinity, -Infinity, -Infinity, -Infinity];

  for (const f of rawFeatures) {
    for (let j = 0; j < 4; j++) {
      if (f[j] < minVals[j]) minVals[j] = f[j];
      if (f[j] > maxVals[j]) maxVals[j] = f[j];
    }
  }

  const normFeatures = rawFeatures.map(f => {
    return f.map((val, j) => {
      const range = maxVals[j] - minVals[j];
      return range === 0 ? 0 : (val - minVals[j]) / range;
    });
  });

  // Başlangıç Centroidleri (Farklı profilleri temsil eden 4 denge noktası)
  const centroids = [
    [0.9, 0.8, 0.8, 0.9], // Yüksek her şey (Liderler)
    [0.7, 0.9, 0.9, 0.3], // Yüksek atıf & H-indeks (Atıf Öncüleri)
    [0.6, 0.4, 0.4, 0.4], // Aktif Üretim (Aktif Yayıncılar)
    [0.1, 0.1, 0.1, 0.1]  // Başlangıç / Gelişim aşaması (Yükselen Araştırmacılar)
  ];

  const assignments = new Array(n).fill(0);
  const distances = new Array(n).fill(0);
  const maxIterations = 20;

  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = false;

    for (let i = 0; i < n; i++) {
      let bestCluster = 0;
      let minDist = Infinity;

      for (let c = 0; c < k; c++) {
        let distSq = 0;
        for (let j = 0; j < 4; j++) {
          const diff = normFeatures[i][j] - centroids[c][j];
          distSq += diff * diff;
        }
        const dist = Math.sqrt(distSq);
        if (dist < minDist) {
          minDist = dist;
          bestCluster = c;
        }
      }

      if (assignments[i] !== bestCluster) {
        assignments[i] = bestCluster;
        changed = true;
      }
      distances[i] = minDist;
    }

    if (!changed && iter > 0) break;

    const clusterCounts = new Array(k).fill(0);
    const newCentroids = Array.from({ length: k }, () => [0, 0, 0, 0]);

    for (let i = 0; i < n; i++) {
      const c = assignments[i];
      clusterCounts[c]++;
      for (let j = 0; j < 4; j++) {
        newCentroids[c][j] += normFeatures[i][j];
      }
    }

    for (let c = 0; c < k; c++) {
      if (clusterCounts[c] > 0) {
        for (let j = 0; j < 4; j++) {
          centroids[c][j] = newCentroids[c][j] / clusterCounts[c];
        }
      }
    }
  }

  // Küme ortalamalarını inceleyip dinamik rozetleri eşleştirelim
  const clusterMetrics = Array.from({ length: k }, (_, c) => {
    let sumPub = 0, sumCite = 0, sumH = 0, sumProj = 0;
    const count = assignments.filter(a => a === c).length;
    for (let i = 0; i < n; i++) {
      if (assignments[i] === c) {
        sumPub += rawFeatures[i][0];
        sumCite += rawFeatures[i][1];
        sumH += rawFeatures[i][2];
        sumProj += rawFeatures[i][3];
      }
    }
    return {
      clusterId: c,
      count,
      avgPub: count > 0 ? sumPub / count : 0,
      avgCite: count > 0 ? sumCite / count : 0,
      avgH: count > 0 ? sumH / count : 0,
      avgProj: count > 0 ? sumProj / count : 0,
      score: count > 0 ? (sumPub / count + sumCite / count + sumH * 5 / count + sumProj * 10 / count) : 0
    };
  });

  // Skoruna veya proje sayısına göre kümeleri sıralayıp rozet atayalım
  const sortedByScore = [...clusterMetrics].sort((a, b) => b.score - a.score);
  
  const badgeDefinitions = [
    { label: 'Proje & Araştırma Lideri', badge: '🏆 Proje & Araştırma Lideri', desc: 'Yüksek proje deneyimi ve güçlü araştırma çıktısı sunan lider profil.' },
    { label: 'Yayın & Atıf Öncüsü', badge: '🌟 Yayın & Atıf Öncüsü', desc: 'Atıf sayısı ve H-indeksi ile alanında öne çıkan öncü araştırmacı.' },
    { label: 'Aktif Akademik Yayıncı', badge: '📈 Aktif Akademik Yayıncı', desc: 'Sürekli makale ve bildiri üreten, dengeli akademik performans.' },
    { label: 'Yükselen Araştırmacı', badge: '🚀 Yükselen Araştırmacı', desc: 'Kariyerinin gelişim aşamasındaki dinamik ve potansiyel akademisyen.' }
  ];

  const clusterIdToBadge = new Map();
  for (let idx = 0; idx < k; idx++) {
    const cInfo = sortedByScore[idx];
    const def = badgeDefinitions[idx] || badgeDefinitions[3];
    clusterIdToBadge.set(cInfo.clusterId, {
      id: cInfo.clusterId,
      label: def.label,
      badge: def.badge,
      desc: def.desc,
      member_count: cInfo.count,
      avg_metrics: {
        pub: Math.round(cInfo.avgPub),
        cite: Math.round(cInfo.avgCite),
        h_index: Math.round(cInfo.avgH),
        projects: Math.round(cInfo.avgProj)
      }
    });
  }

  const userMap = new Map();
  for (let i = 0; i < n; i++) {
    const u = users[i];
    const cId = assignments[i];
    const bInfo = clusterIdToBadge.get(cId);
    userMap.set(u.id, {
      id: cId,
      label: bInfo.label,
      badge: bInfo.badge,
      distance: Number(distances[i].toFixed(4))
    });
  }

  const summary = Array.from(clusterIdToBadge.values());
  return { userMap, summary };
}

/**
 * Kullanıcının küme bilgilerini getirir
 */
function getUserClusterInfo(userId) {
  const numId = Number(userId);
  if (!cache.userClusters.has(numId)) {
    return {
      tag_cluster: { id: 0, name: 'Genel Araştırma Kümesi', distance: 0 },
      metric_cluster: { id: 0, label: 'Yükselen Araştırmacı', badge: '🚀 Yükselen Araştırmacı', distance: 0 }
    };
  }
  return cache.userClusters.get(numId);
}

/**
 * Kullanıcının kendi "Akademik Mahallesindeki" en yakın benzer hocaları getirir
 */
function getNeighbors(userId, limit = 6) {
  const numId = Number(userId);
  const myInfo = getUserClusterInfo(numId);
  if (!myInfo || !myInfo.tag_cluster) return [];

  const myTagClusterId = myInfo.tag_cluster.id;

  // Aynı mahalledeki diğer hocaları bul ve mesafesi/skoru en iyi olanları getir
  const neighbors = [];
  for (const [otherId, info] of cache.userClusters.entries()) {
    if (otherId === numId) continue; // Kendisi hariç
    if (info.tag_cluster && info.tag_cluster.id === myTagClusterId) {
      // Benzerlik skoru: mesafe 0 ise %99, 0.5 ise %75 vb.
      const sim = Math.max(50, Math.min(99, Math.round((1 - info.tag_cluster.distance * 0.7) * 100)));
      neighbors.push({
        id: otherId,
        similarity: sim,
        metric_badge: info.metric_cluster ? info.metric_cluster.badge : '🚀 Yükselen Araştırmacı'
      });
    }
  }

  neighbors.sort((a, b) => b.similarity - a.similarity);
  const topNeighborIds = neighbors.slice(0, limit);

  if (topNeighborIds.length === 0 || !db) return [];

  const placeholders = topNeighborIds.map(() => '?').join(',');
  const idList = topNeighborIds.map(n => n.id);

  const userRows = db.prepare(`
    SELECT u.id, u.full_name, u.title, u.faculty_id, u.department_id,
           u.photo_url, u.is_claimed, u.is_active, u.bio,
           f.name as faculty_name, d.name as department_name
    FROM users u
    LEFT JOIN faculties f ON f.id = u.faculty_id
    LEFT JOIN departments d ON d.id = u.department_id
    WHERE u.id IN (${placeholders})
  `).all(...idList);

  // Etiketleri ekle ve benzerlik skorunu iliştir
  for (const row of userRows) {
    const neighborData = topNeighborIds.find(n => n.id === row.id);
    row.similarity_score = neighborData ? neighborData.similarity : 80;
    row.metric_badge = neighborData ? neighborData.metric_badge : '🚀 Yükselen Araştırmacı';

    const tags = db.prepare(`
      SELECT ra.id, ra.label
      FROM user_research_areas ura
      JOIN research_areas ra ON ra.id = ura.research_area_id
      WHERE ura.user_id = ?
      LIMIT 4
    `).all(row.id);
    row.research_areas = tags;
  }

  // Sıralamayı koru
  userRows.sort((a, b) => b.similarity_score - a.similarity_score);
  return userRows;
}

function getClustersSummary() {
  return {
    tagClusters: cache.tagClustersSummary,
    metricClusters: cache.metricClustersSummary,
    lastUpdated: cache.lastUpdated
  };
}

/**
 * Belirli bir metrik kümesi veya etiket kümesine ait kullanıcı ID'lerini döndürür (Filtreleme için)
 */
function getMatchingUserIds({ metricClusterLabel, tagClusterId }) {
  const resultIds = [];
  for (const [userId, info] of cache.userClusters.entries()) {
    let match = true;
    if (metricClusterLabel && metricClusterLabel !== 'Tümü' && metricClusterLabel !== '') {
      if (!info.metric_cluster || info.metric_cluster.label !== metricClusterLabel) {
        match = false;
      }
    }
    if (tagClusterId !== undefined && tagClusterId !== null && tagClusterId !== '' && tagClusterId !== 'Tümü') {
      const targetId = Number(tagClusterId);
      if (!info.tag_cluster || info.tag_cluster.id !== targetId) {
        match = false;
      }
    }
    if (match) {
      resultIds.push(userId);
    }
  }
  return resultIds;
}

module.exports = {
  init,
  runClustering,
  getUserClusterInfo,
  getNeighbors,
  getClustersSummary,
  getMatchingUserIds
};
