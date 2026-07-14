const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../db');

const JSON_PATH = path.join(__dirname, '..', 'data', 'avesis_researchers_output.json');

function cleanFullName(rawName) {
  if (!rawName) return '';
  // Remove known academic prefixes
  let cleaned = rawName
    .replace(/^(Prof\.?\s*Dr\.?|Doç\.?\s*Dr\.?|Dr\.?\s*Öğr\.?\s*Üyesi|Öğr\.?\s*Gör\.?\s*Dr\.?|Öğr\.?\s*Gör\.?|Arş\.?\s*Gör\.?\s*Dr\.?|Arş\.?\s*Gör\.?|Öğretim\s+Görevlisi\s+Dr\.?|Öğretim\s+Görevlisi|Araştırma\s+Görevlisi|Uzm\.?\s*Dr\.?)\s+/gi, '')
    .trim();
  // If prefix still remained due to unexpected formatting, try stripping leading words ending in dot
  cleaned = cleaned.replace(/^([A-ZÇĞİÖŞÜa-zçğıöşü]+\.\s*){1,3}/, '').trim();
  // Normalize whitespace: replace multiple spaces/tabs with a single space
  cleaned = cleaned.replace(/\s+/g, ' ');
  return cleaned || rawName.replace(/\s+/g, ' ').trim();
}

async function seed() {
  console.log('--- AVESİS CoMatch Veritabanı Seeder Başlatılıyor ---');

  if (!fs.existsSync(JSON_PATH)) {
    console.error(`HATA: JSON dosyası bulunamadı -> ${JSON_PATH}`);
    process.exit(1);
  }

  // Clear existing tables
  db.exec(`
    DELETE FROM notifications;
    DELETE FROM applications_invitations;
    DELETE FROM project_members;
    DELETE FROM project_research_areas;
    DELETE FROM projects;
    DELETE FROM user_research_areas;
    DELETE FROM users;
    DELETE FROM research_areas;
    DELETE FROM departments;
    DELETE FROM faculties;
  `);

  const facultyMap = new Map(); // name -> id
  const departmentMap = new Map(); // `${facultyId}::${deptName}` -> id
  const researchAreaMap = new Map(); // label -> id

  const insertFacultyStmt = db.prepare('INSERT INTO faculties (name) VALUES (?)');
  const insertDeptStmt = db.prepare('INSERT INTO departments (faculty_id, name) VALUES (?, ?)');
  const insertAreaStmt = db.prepare('INSERT INTO research_areas (label) VALUES (?)');
  const insertUserStmt = db.prepare(`
    INSERT INTO users (
      full_name, title, faculty_id, department_id, avesis_profile_url,
      email, password_hash, bio, photo_url, is_claimed, is_active, has_research_fields,
      pub_total, pub_wos, pub_scopus, cite_wos, h_index_wos, cite_scopus, h_index_scopus,
      cite_scholar, h_index_scholar, cite_tr_dizin, h_index_tr_dizin, cite_sobiad, h_index_sobiad,
      project_count, thesis_advising, open_access, other_metrics
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertUserAreaStmt = db.prepare('INSERT OR IGNORE INTO user_research_areas (user_id, research_area_id) VALUES (?, ?)');

  const rawData = fs.readFileSync(JSON_PATH, 'utf8');
  const rows = JSON.parse(rawData);

  console.log(`${rows.length} satır JSON verisi okundu. İşleniyor...`);

  const transaction = db.transaction(() => {
    let importedUsers = 0;
    let noFieldsCount = 0;
    const usedEmails = new Set();
    usedEmails.add('admin@erdogan.edu.tr'); // reserve admin email to avoid conflicts

    for (const row of rows) {
      const rawName = row.Name || '';
      const title = (row.Title || '').trim();
      
      let facultyName = 'Diğer / Belirtilmemiş';
      let deptName = 'Diğer Bölüm';
      if (row.Faculty) {
        const parts = row.Faculty.split('/');
        facultyName = parts[0].trim();
        if (parts.length > 1) {
          deptName = parts[1].trim();
        }
      }

      const researchFieldsRaw = (row.ResearchAreas || '').trim();
      const profileUrl = (row.AvesisURL || '').trim();

      if (!rawName) continue;

      // Clean full name
      const fullName = cleanFullName(rawName);

      // Faculty
      let facultyId = facultyMap.get(facultyName);
      if (!facultyId) {
        const res = insertFacultyStmt.run(facultyName);
        facultyId = res.lastInsertRowid;
        facultyMap.set(facultyName, facultyId);
      }

      // Department
      const deptKey = `${facultyId}::${deptName}`;
      let deptId = departmentMap.get(deptKey);
      if (!deptId) {
        const res = insertDeptStmt.run(facultyId, deptName);
        deptId = res.lastInsertRowid;
        departmentMap.set(deptKey, deptId);
      }

      // Email uniqueness check
      let email = null;
      if (row.Email && row.Email.trim()) {
        const normalizedEmail = row.Email.trim().toLowerCase();
        if (!usedEmails.has(normalizedEmail)) {
          email = normalizedEmail;
          usedEmails.add(normalizedEmail);
        }
      }

      // User insert
      const hasFields = researchFieldsRaw.length > 0 ? 1 : 0;
      if (!hasFields) noFieldsCount++;

      const resUser = insertUserStmt.run(
        fullName,
        title || 'Akademisyen',
        facultyId,
        deptId,
        profileUrl,
        email,
        null, // password_hash
        null, // bio
        null, // photo_url
        0, // is_claimed
        0, // is_active
        hasFields,
        parseInt(row.Yayın_Toplam, 10) || 0,
        parseInt(row.Yayın_WoS, 10) || 0,
        parseInt(row.Yayın_Scopus, 10) || 0,
        parseInt(row.Atıf_WoS, 10) || 0,
        parseInt(row.H_İndeks_WoS, 10) || 0,
        parseInt(row.Atıf_Scopus, 10) || 0,
        parseInt(row.H_İndeks_Scopus, 10) || 0,
        parseInt(row.Atıf_Scholar, 10) || 0,
        parseInt(row.H_İndeks_Scholar, 10) || 0,
        parseInt(row.Atıf_TrDizin, 10) || 0,
        parseInt(row.H_İndeks_TrDizin, 10) || 0,
        parseInt(row.Atıf_Sobiad, 10) || 0,
        parseInt(row.H_İndeks_Sobiad, 10) || 0,
        parseInt(row.Proje_Sayısı, 10) || 0,
        parseInt(row.Tez_Danışmanlığı, 10) || 0,
        parseInt(row.Açık_Erişim, 10) || 0,
        row.Diğer_Metrikler || ''
      );
      const userId = resUser.lastInsertRowid;
      importedUsers++;

      // Process research areas
      if (hasFields) {
        const tags = researchFieldsRaw.split(',').map(t => t.trim()).filter(Boolean);
        for (const tag of tags) {
          let areaId = researchAreaMap.get(tag);
          if (!areaId) {
            const resArea = insertAreaStmt.run(tag);
            areaId = resArea.lastInsertRowid;
            researchAreaMap.set(tag, areaId);
          }
          insertUserAreaStmt.run(userId, areaId);
        }
      }
    }

    console.log(`Tamamlandı: ${importedUsers} akademisyen, ${facultyMap.size} fakülte, ${departmentMap.size} bölüm, ${researchAreaMap.size} araştırma alanı etiketi eklendi.`);
    console.log(`Araştırma alanı belirtilmeyen akademisyen sayısı: ${noFieldsCount}`);
  });

  transaction();

  // Seed sample Claimed/Active demo users & Projects
  console.log('--- Örnek Aktif (Sahiplenilmiş) Akademisyenler & Projeler Ekleniyor ---');
  const defaultHash = bcrypt.hashSync('123456', 10);

  // Claim Prof. Dr. MURAT YAYLACI
  const murat = db.prepare("SELECT id FROM users WHERE full_name LIKE '%MURAT YAYLACI%' LIMIT 1").get();
  if (murat) {
    db.prepare(`
      UPDATE users SET
        email = 'murat.yaylaci@erdogan.edu.tr',
        password_hash = ?,
        bio = 'Recep Tayyip Erdoğan Üniversitesi İnşaat Mühendisliği Bölümü Öğretim Üyesi. Yapı Mekaniği, Katı Cisimler Mekaniği ve Sonlu Elemanlar Yöntemleri alanında araştırmalar yürütmektedir.',
        photo_url = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
        is_claimed = 1,
        is_active = 1
      WHERE id = ?
    `).run(defaultHash, murat.id);
  }

  // Claim Prof. Dr. ZEYNEP GÜMRÜKÇÜ
  const zeynep = db.prepare("SELECT id FROM users WHERE full_name LIKE '%ZEYNEP GÜMRÜKÇÜ%' LIMIT 1").get();
  if (zeynep) {
    db.prepare(`
      UPDATE users SET
        email = 'zeynep.gumrukcu@erdogan.edu.tr',
        password_hash = ?,
        bio = 'Diş Hekimliği Fakültesi Ağız, Diş ve Çene Cerrahisi Ana Bilim Dalı Öğretim Üyesi. Klinik Biyomalzemeler ve İmplantoloji üzerine projeler geliştirmektedir.',
        photo_url = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
        is_claimed = 1,
        is_active = 1
      WHERE id = ?
    `).run(defaultHash, zeynep.id);
  }

  // Claim Prof. Dr. VELİ SÜME
  const veli = db.prepare("SELECT id FROM users WHERE full_name LIKE '%VELİ SÜME%' LIMIT 1").get();
  if (veli) {
    db.prepare(`
      UPDATE users SET
        email = 'veli.sume@erdogan.edu.tr',
        password_hash = ?,
        bio = 'Hidroloji, Meteorolojik Afet Analizi ve Kıyı Mühendisliği uzmanı. İklim değişikliği ve su kaynaklarının korunması alanında TÜBİTAK projeleri yürütmektedir.',
        photo_url = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
        is_claimed = 1,
        is_active = 1
      WHERE id = ?
    `).run(defaultHash, veli.id);
  }

  // Create an Admin user
  const anyFaculty = db.prepare("SELECT id FROM faculties LIMIT 1").get();
  const anyDept = db.prepare("SELECT id FROM departments LIMIT 1").get();
  const adminFacultyId = anyFaculty ? anyFaculty.id : null;
  const adminDeptId = anyDept ? anyDept.id : null;

  db.prepare(`
    INSERT INTO users (
      full_name, title, faculty_id, department_id, avesis_profile_url,
      email, password_hash, bio, is_claimed, is_active, has_research_fields
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1)
  `).run(
    'Sistem Yöneticisi',
    'Admin',
    adminFacultyId,
    adminDeptId,
    'https://avesis.erdogan.edu.tr',
    'admin@erdogan.edu.tr',
    bcrypt.hashSync('admin123', 10),
    'AVESİS CoMatch Platform Moderatörü ve Veri Yöneticisi.'
  );

  // Seed sample projects
  const anyUser = db.prepare("SELECT id FROM users LIMIT 1").get();
  const fallbackUserId = anyUser ? anyUser.id : 1;

  const ownerId = murat ? murat.id : fallbackUserId;
  const zeynepId = zeynep ? zeynep.id : fallbackUserId;
  const veliId = veli ? veli.id : fallbackUserId;

  const insertProj = db.prepare(`
    INSERT INTO projects (title, description, objectives, owner_id, team_size, duration, budget, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'open')
  `);
  const insertProjArea = db.prepare('INSERT INTO project_research_areas (project_id, research_area_id) VALUES (?, ?)');
  const insertProjMember = db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)');

  // Project 1
  const p1 = insertProj.run(
    'Doğu Karadeniz Kıyı Yapılarının İklim Değişikliğine Dayanıklı Hibrit Malzemelerle Güçlendirilmesi',
    'Bu proje, Karadeniz sahil şeridindeki betonarme kıyı koruma yapılarının hidrodinamik etkilere ve ekstrem hava olaylarına karşı dayanımını artıran yeni nesil nanokatkılı hibrit malzemeler ve sonlu elemanlar modellemesi geliştirmeyi amaçlamaktadır.',
    '1. Kıyı dalga yüklerinin hidrolik simülasyonu\n2. Yeni nesil yapı malzemesi sentezi\n3. Sonlu elemanlar analizi ile ömür tahmini',
    ownerId,
    4,
    '24 Ay',
    '1.850.000 TL'
  );
  insertProjMember.run(p1.lastInsertRowid, ownerId, 'leader');
  if (veliId) insertProjMember.run(p1.lastInsertRowid, veliId, 'researcher');

  // Match tags for P1
  const findArea = db.prepare('SELECT id FROM research_areas WHERE label LIKE ? LIMIT 1');
  const areas1 = ['%İnşaat Mühendisliği%', '%Mekanik%', '%Hidrolik%', '%Çevre Mühendisliği%', '%Sonlu Elemanlar Yöntemi%'];
  for (const pattern of areas1) {
    const row = findArea.get(pattern);
    if (row) insertProjArea.run(p1.lastInsertRowid, row.id);
  }

  // Project 2
  const p2 = insertProj.run(
    'Biyouyumlu Titanyum İmplant Yüzeylerinin Lazer Mikrodokulandırma ile Geliştirilmesi',
    'Diş hekimliği ve ortopedi alanında kullanılan implantların kemik entegrasyonunu hızlandırmak için yeni nesil mikro-nano dokulu titanyum yüzey modifikasyonlarının incelenmesi.',
    '1. Yüzey pürüzlülüğü optimizasyonu\n2. Hücre kültürü ve osseointegrasyon testleri\n3. Biyomekanik dayanım testleri',
    zeynepId,
    3,
    '18 Ay',
    '1.200.000 TL'
  );
  insertProjMember.run(p2.lastInsertRowid, zeynepId, 'leader');
  const areas2 = ['%Diş Hekimliği%', '%Biyomekanik%', '%Klinik Bilimler%', '%Ağız, Diş-Çene Hastalıkları%'];
  for (const pattern of areas2) {
    const row = findArea.get(pattern);
    if (row) insertProjArea.run(p2.lastInsertRowid, row.id);
  }

  // Project 3
  const p3 = insertProj.run(
    'Derin Öğrenme Tabanlı Afet Erken Uyarı ve Sel Taşkın Tahmin Platformu',
    'Doğu Karadeniz havzasındaki meteorolojik ve hidrolojik istasyon verilerinden yararlanarak yapay zeka modelleri ile sel taşkın riskini saatler öncesinden tahmin eden karar destek sistemi.',
    '1. Sensör ağlarından gerçek zamanlı veri akışı\n2. Deep Learning modelleri ile taşkın tahmini\n3. Web tabanlı izleme portalı',
    veliId,
    5,
    '36 Ay',
    '2.500.000 TL'
  );
  insertProjMember.run(p3.lastInsertRowid, veliId, 'leader');
  const areas3 = ['%Yapay Zeka%', '%Hidroloji%', '%Bilgisayar Bilimleri%', '%Atmosfer Bilimleri%', '%Meteorolojik Afetler%'];
  for (const pattern of areas3) {
    const row = findArea.get(pattern);
    if (row) insertProjArea.run(p3.lastInsertRowid, row.id);
  }

  // Sample invitations & applications
  db.prepare(`
    INSERT INTO applications_invitations (project_id, sender_id, receiver_id, type, status, message)
    VALUES (?, ?, ?, 'invitation', 'pending', 'Sayın Hocam, Karadeniz kıyı koruma projemizde hidrolik ve dalga modellemesi uzmanlığınızdan faydalanmak istiyoruz. Ekibe katılır mısınız?')
  `).run(p1.lastInsertRowid, ownerId, zeynepId);

  // Sample notifications
  db.prepare(`
    INSERT INTO notifications (user_id, title, body, is_read, link)
    VALUES (?, ?, ?, 0, ?)
  `).run(
    ownerId,
    'Hoş Geldiniz, Prof. Dr. MURAT YAYLACI!',
    'AVESİS profiliniz doğrulandı ve hesabınız başarıyla aktife alındı. Projelerinizi oluşturup ekip arkadaşları aramaya başlayabilirsiniz.',
    '/dashboard'
  );

  console.log('--- Seeder Başarıyla Tamamlandı! ---');
}

seed().catch(err => {
  console.error('Seeder hatası:', err);
  process.exit(1);
});
