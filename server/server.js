const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'avesis-comatch-super-secret-key-2026';

app.use(cors());
app.use(express.json());

const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'uploads', 'chat');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Authentication Middleware
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Yetkisiz erişim. Lütfen giriş yapın.' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    // Update last active time in background
    try {
      db.prepare("UPDATE users SET last_active_at = datetime('now', 'localtime') WHERE id = ?").run(decoded.id);
    } catch (e) {}
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş oturum.' });
  }
}

// Optional Auth Middleware (for guest vs logged-in detection)
function optionalAuthMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    } catch (err) {}
  }
  next();
}

// Helper to attach tags to user objects
function attachUserTags(user) {
  const tags = db.prepare(`
    SELECT ra.id, ra.label
    FROM user_research_areas ura
    JOIN research_areas ra ON ra.id = ura.research_area_id
    WHERE ura.user_id = ?
  `).all(user.id);
  user.research_areas = tags;
  return user;
}

// ==========================================
// 1. METADATA & TAKSONOMİ API
// ==========================================
app.get('/api/metadata', (req, res) => {
  try {
    const faculties = db.prepare('SELECT id, name FROM faculties ORDER BY name ASC').all();
    const departments = db.prepare('SELECT id, faculty_id, name FROM departments ORDER BY name ASC').all();
    const research_areas = db.prepare('SELECT id, label FROM research_areas ORDER BY label ASC').all();
    const titles = db.prepare('SELECT DISTINCT title FROM users WHERE title IS NOT NULL ORDER BY title ASC').all().map(r => r.title);

    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const claimedUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_claimed = 1').get().count;
    const totalProjects = db.prepare('SELECT COUNT(*) as count FROM projects').get().count;

    res.json({
      faculties,
      departments,
      research_areas,
      titles,
      stats: {
        total_academicians: totalUsers,
        active_claimed_profiles: claimedUsers,
        total_faculties: faculties.length,
        total_research_tags: research_areas.length,
        total_projects: totalProjects
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. KİMLİK DOĞRULAMA & PROFİL SAHİPLENME
// ==========================================

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'E-posta ve şifre zorunludur.' });
  }

  const user = db.prepare(`
    SELECT u.*, f.name as faculty_name, d.name as department_name
    FROM users u
    LEFT JOIN faculties f ON f.id = u.faculty_id
    LEFT JOIN departments d ON d.id = u.department_id
    WHERE u.email = ? AND u.is_active = 1
  `).get(email);

  if (!user || !user.password_hash) {
    return res.status(401).json({ error: 'Geçersiz e-posta veya şifre.' });
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Geçersiz e-posta veya şifre.' });
  }

  delete user.password_hash;
  attachUserTags(user);

  const token = jwt.sign({ id: user.id, email: user.email, name: user.full_name }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user });
});

// Create verification codes table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS email_verification_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    academician_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// 1. Send Verification Code for Claiming Profile
app.post('/api/auth/claim/send-code', (req, res) => {
  const { academicianId, email } = req.body;

  if (!academicianId || !email) {
    return res.status(400).json({ error: 'Profil ID ve kurumsal e-posta zorunludur.' });
  }

  if (!email.toLowerCase().endsWith('@erdogan.edu.tr')) {
    return res.status(400).json({
      error: 'Doğrulama kodu yalnızca Recep Tayyip Erdoğan Üniversitesi kurumsal e-posta adresine (@erdogan.edu.tr) gönderilebilir.'
    });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(academicianId);
  if (!user) {
    return res.status(404).json({ error: 'Akademisyen profili bulunamadı.' });
  }
  if (user.is_claimed === 1) {
    return res.status(400).json({ error: 'Bu profil zaten sahiplenilmiş ve aktif duruma geçirilmiştir.' });
  }

  const existingEmail = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, academicianId);
  if (existingEmail) {
    return res.status(400).json({ error: 'Bu e-posta adresi başka bir hesapta kullanılmaktadır.' });
  }

  // Generate 6-digit OTP code
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

  // Save code
  db.prepare('DELETE FROM email_verification_codes WHERE email = ? AND academician_id = ?').run(email, academicianId);
  db.prepare(`
    INSERT INTO email_verification_codes (email, code, academician_id)
    VALUES (?, ?, ?)
  `).run(email, otpCode, academicianId);

  console.log(`\n=============================================================`);
  console.log(`[E-POSTA DOĞRULAMA KODU SİMÜLASYONU]`);
  console.log(`Alıcı E-posta : ${email}`);
  console.log(`Profil ID     : ${academicianId} (${user.title} ${user.full_name})`);
  console.log(`DOĞRULAMA KODU: ${otpCode}`);
  console.log(`=============================================================\n`);

  res.json({
    message: 'Doğrulama kodu kurumsal e-posta adresinize iletildi.',
    email,
    simulatedCode: otpCode
  });
});

// 2. Verify OTP Code and Activate Profile
app.post('/api/auth/claim/verify', (req, res) => {
  const { academicianId, email, password, bio, code } = req.body;

  if (!academicianId || !email || !password || !code) {
    return res.status(400).json({ error: 'Tüm alanlar ve 6 haneli doğrulama kodu zorunludur.' });
  }

  const verificationRecord = db.prepare(`
    SELECT * FROM email_verification_codes
    WHERE email = ? AND academician_id = ? AND code = ?
  `).get(email, academicianId, code);

  if (!verificationRecord) {
    return res.status(400).json({ error: 'Girdiğiniz doğrulama kodu hatalı veya süresi dolmuş. Lütfen kontrol edip tekrar deneyin.' });
  }

  // Code verified! Delete OTP record
  db.prepare('DELETE FROM email_verification_codes WHERE email = ? AND academician_id = ?').run(email, academicianId);

  const passwordHash = bcrypt.hashSync(password, 10);
  db.prepare(`
    UPDATE users SET
      email = ?,
      password_hash = ?,
      bio = COALESCE(?, bio, 'Recep Tayyip Erdoğan Üniversitesi Akademisyeni'),
      is_claimed = 1,
      is_active = 1
    WHERE id = ?
  `).run(email, passwordHash, bio || null, academicianId);

  const updatedUser = db.prepare(`
    SELECT u.*, f.name as faculty_name, d.name as department_name
    FROM users u
    LEFT JOIN faculties f ON f.id = u.faculty_id
    LEFT JOIN departments d ON d.id = u.department_id
    WHERE u.id = ?
  `).get(academicianId);

  delete updatedUser.password_hash;
  attachUserTags(updatedUser);

  const token = jwt.sign({ id: updatedUser.id, email: updatedUser.email, name: updatedUser.full_name }, JWT_SECRET, { expiresIn: '7d' });

  // Add welcome notification
  db.prepare(`
    INSERT INTO notifications (user_id, title, body, link)
    VALUES (?, ?, ?, ?)
  `).run(
    updatedUser.id,
    'Tebrikler! Profiliniz ve E-postanız Başarıyla Doğrulandı',
    'AVESİS profilinizi kurumsal e-posta onay koduyla başarıyla sahiplendiniz.',
    '/dashboard'
  );

  res.json({ message: 'E-posta doğrulandı! Profil başarıyla sahiplenildi ve aktif edildi.', token, user: updatedUser });
});

// Claim Profile (AVESİS Arşiv Profilini Sahiplenme - Doğrudan / Geriye Dönük)
app.post('/api/auth/claim', (req, res) => {
  const { academicianId, email, password, bio } = req.body;

  if (!academicianId || !email || !password) {
    return res.status(400).json({ error: 'Profil ID, kurumsal e-posta ve şifre zorunludur.' });
  }

  // Kurumsal e-posta kontrolü (@erdogan.edu.tr)
  if (!email.toLowerCase().endsWith('@erdogan.edu.tr')) {
    return res.status(400).json({
      error: 'Profil sahiplenme işlemi yalnızca Recep Tayyip Erdoğan Üniversitesi kurumsal e-posta adresi (@erdogan.edu.tr) ile yapılabilir.'
    });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(academicianId);
  if (!user) {
    return res.status(404).json({ error: 'Akademisyen profili bulunamadı.' });
  }
  if (user.is_claimed === 1) {
    return res.status(400).json({ error: 'Bu profil zaten sahiplenilmiş ve aktif duruma geçirilmiştir.' });
  }

  // Check if email already used
  const existingEmail = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, academicianId);
  if (existingEmail) {
    return res.status(400).json({ error: 'Bu e-posta adresi başka bir hesapta kullanılmaktadır.' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  db.prepare(`
    UPDATE users SET
      email = ?,
      password_hash = ?,
      bio = COALESCE(?, bio, 'Recep Tayyip Erdoğan Üniversitesi Akademisyeni'),
      is_claimed = 1,
      is_active = 1
    WHERE id = ?
  `).run(email, passwordHash, bio || null, academicianId);

  const updatedUser = db.prepare(`
    SELECT u.*, f.name as faculty_name, d.name as department_name
    FROM users u
    LEFT JOIN faculties f ON f.id = u.faculty_id
    LEFT JOIN departments d ON d.id = u.department_id
    WHERE u.id = ?
  `).get(academicianId);

  delete updatedUser.password_hash;
  attachUserTags(updatedUser);

  const token = jwt.sign({ id: updatedUser.id, email: updatedUser.email, name: updatedUser.full_name }, JWT_SECRET, { expiresIn: '7d' });

  // Add welcome notification
  db.prepare(`
    INSERT INTO notifications (user_id, title, body, link)
    VALUES (?, ?, ?, ?)
  `).run(
    updatedUser.id,
    'Tebrikler! Profiliniz Başarıyla Doğrulandı',
    'AVESİS profilinizi başarıyla sahiplendiniz. Artık projelerinizi oluşturabilir veya mevcut projelere katılabilirsiniz.',
    '/dashboard'
  );

  res.json({ message: 'Profil başarıyla sahiplenildi ve aktif edildi!', token, user: updatedUser });
});

// Register New Academician (CSV'de olmayan yeni kayıt)
app.post('/api/auth/register', (req, res) => {
  const { fullName, title, email, password, facultyId, departmentId, researchAreaIds = [], bio, profileUrl } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ error: 'Ad Soyad, e-posta ve şifre zorunludur.' });
  }

  if (!email.toLowerCase().endsWith('@erdogan.edu.tr')) {
    return res.status(400).json({ error: 'Yalnızca kurumsal @erdogan.edu.tr e-posta adresinizle kayıt olabilirsiniz.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(400).json({ error: 'Bu e-posta adresi ile zaten kayıtlı bir kullanıcı var.' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (
      full_name, title, faculty_id, department_id, avesis_profile_url,
      email, password_hash, bio, is_claimed, is_active, has_research_fields
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?)
  `).run(
    fullName,
    title || 'Akademisyen',
    facultyId || null,
    departmentId || null,
    profileUrl || null,
    email,
    passwordHash,
    bio || 'Recep Tayyip Erdoğan Üniversitesi Akademisyeni',
    researchAreaIds.length > 0 ? 1 : 0
  );

  const newUserId = result.lastInsertRowid;
  const insertUserArea = db.prepare('INSERT OR IGNORE INTO user_research_areas (user_id, research_area_id) VALUES (?, ?)');
  for (const areaId of researchAreaIds) {
    insertUserArea.run(newUserId, areaId);
  }

  const user = db.prepare(`
    SELECT u.*, f.name as faculty_name, d.name as department_name
    FROM users u
    LEFT JOIN faculties f ON f.id = u.faculty_id
    LEFT JOIN departments d ON d.id = u.department_id
    WHERE u.id = ?
  `).get(newUserId);

  delete user.password_hash;
  attachUserTags(user);

  const token = jwt.sign({ id: user.id, email: user.email, name: user.full_name }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ message: 'Hesabınız başarıyla oluşturuldu!', token, user });
});

// Current User Info
app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = db.prepare(`
    SELECT u.*, f.name as faculty_name, d.name as department_name
    FROM users u
    LEFT JOIN faculties f ON f.id = u.faculty_id
    LEFT JOIN departments d ON d.id = u.department_id
    WHERE u.id = ?
  `).get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
  }

  delete user.password_hash;
  attachUserTags(user);
  res.json({ user });
});

// Update Profile & Research Areas (Kullanıcı Profil ve Araştırma Alanı Düzenleme)
app.put('/api/auth/profile', authMiddleware, (req, res) => {
  const { title, bio, photo_url, avesis_profile_url, faculty_id, department_id, researchAreaIds } = req.body;

  db.prepare(`
    UPDATE users SET
      title = COALESCE(?, title),
      bio = COALESCE(?, bio),
      photo_url = COALESCE(?, photo_url),
      avesis_profile_url = COALESCE(?, avesis_profile_url),
      faculty_id = COALESCE(?, faculty_id),
      department_id = COALESCE(?, department_id),
      has_research_fields = ?
    WHERE id = ?
  `).run(
    title !== undefined ? title : null,
    bio !== undefined ? bio : null,
    photo_url !== undefined ? photo_url : null,
    avesis_profile_url !== undefined ? avesis_profile_url : null,
    faculty_id !== undefined ? faculty_id : null,
    department_id !== undefined ? department_id : null,
    Array.isArray(researchAreaIds) && researchAreaIds.length > 0 ? 1 : 1,
    req.user.id
  );

  if (Array.isArray(researchAreaIds)) {
    db.prepare('DELETE FROM user_research_areas WHERE user_id = ?').run(req.user.id);
    const insertArea = db.prepare('INSERT OR IGNORE INTO user_research_areas (user_id, research_area_id) VALUES (?, ?)');
    for (const areaId of researchAreaIds) {
      insertArea.run(req.user.id, areaId);
    }
  }

  const updatedUser = db.prepare(`
    SELECT u.*, f.name as faculty_name, d.name as department_name
    FROM users u
    LEFT JOIN faculties f ON f.id = u.faculty_id
    LEFT JOIN departments d ON d.id = u.department_id
    WHERE u.id = ?
  `).get(req.user.id);

  delete updatedUser.password_hash;
  attachUserTags(updatedUser);

  res.json({ message: 'Profiliniz ve araştırma alanlarınız başarıyla güncellendi.', user: updatedUser });
});

// ==========================================
// 3. AKADEMİSYEN KEŞİF API'LERİ (Kayıtlı Akademisyenler Sayfası)
// ==========================================
app.get('/api/academicians', (req, res) => {
  try {
    const {
      search = '',
      faculty_id,
      department_id,
      title,
      tag_ids,
      claimed_only,
      sort = 'claimed_first',
      page = 1,
      limit = 24
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const params = [];
    const whereClauses = [];

    if (search.trim()) {
      whereClauses.push('(u.full_name LIKE ? OR u.title LIKE ? OR u.bio LIKE ?)');
      const q = `%${search.trim()}%`;
      params.push(q, q, q);
    }

    if (faculty_id) {
      whereClauses.push('u.faculty_id = ?');
      params.push(faculty_id);
    }

    if (department_id) {
      whereClauses.push('u.department_id = ?');
      params.push(department_id);
    }

    if (title) {
      whereClauses.push('u.title = ?');
      params.push(title);
    }

    if (claimed_only === '1' || claimed_only === 'true') {
      whereClauses.push('u.is_claimed = 1');
    }

    if (tag_ids) {
      const tagList = tag_ids.split(',').map(Number).filter(n => !isNaN(n));
      if (tagList.length > 0) {
        const placeholders = tagList.map(() => '?').join(',');
        whereClauses.push(`
          u.id IN (
            SELECT user_id FROM user_research_areas WHERE research_area_id IN (${placeholders})
          )
        `);
        params.push(...tagList);
      }
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    let orderBySQL = 'ORDER BY u.is_claimed DESC, u.id ASC';
    if (sort === 'name_asc') orderBySQL = 'ORDER BY u.full_name ASC';
    else if (sort === 'joined_desc') orderBySQL = 'ORDER BY u.id DESC';
    else if (sort === 'claimed_first') orderBySQL = 'ORDER BY u.is_claimed DESC, u.full_name ASC';

    // Count query
    const countRow = db.prepare(`SELECT COUNT(*) as count FROM users u ${whereSQL}`).get(...params);
    const totalCount = countRow.count;

    // Data query
    const users = db.prepare(`
      SELECT u.id, u.full_name, u.title, u.faculty_id, u.department_id, u.avesis_profile_url,
             u.bio, u.photo_url, u.is_claimed, u.is_active, u.has_research_fields,
             f.name as faculty_name, d.name as department_name
      FROM users u
      LEFT JOIN faculties f ON f.id = u.faculty_id
      LEFT JOIN departments d ON d.id = u.department_id
      ${whereSQL}
      ${orderBySQL}
      LIMIT ? OFFSET ?
    `).all(...params, Number(limit), offset);

    // Attach tags
    for (const u of users) {
      attachUserTags(u);
    }

    res.json({
      academicians: users,
      pagination: {
        total: totalCount,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalCount / Number(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Single Academician Profile
app.get('/api/academicians/:id', (req, res) => {
  try {
    const user = db.prepare(`
      SELECT u.*,
             f.name as faculty_name, d.name as department_name
      FROM users u
      LEFT JOIN faculties f ON f.id = u.faculty_id
      LEFT JOIN departments d ON d.id = u.department_id
      WHERE u.id = ?
    `).get(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'Akademisyen bulunamadı.' });
    }

    delete user.password_hash;
    attachUserTags(user);

    // Attach user's projects
    const projects = db.prepare(`
      SELECT p.*, pm.role as member_role
      FROM projects p
      JOIN project_members pm ON pm.project_id = p.id
      WHERE pm.user_id = ?
      ORDER BY p.id DESC
    `).all(user.id);

    for (const p of projects) {
      p.tags = db.prepare(`
        SELECT ra.id, ra.label
        FROM project_research_areas pra
        JOIN research_areas ra ON ra.id = pra.research_area_id
        WHERE pra.project_id = ?
      `).all(p.id);
    }

    res.json({ academician: user, projects });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. PROJELER & AKILLI EŞLEŞTİRME MOTORU
// ==========================================
app.get('/api/projects', (req, res) => {
  try {
    const { search = '', tag_id } = req.query;
    const params = [];
    let whereSQL = '';

    const clauses = [];
    if (search.trim()) {
      clauses.push('(p.title LIKE ? OR p.description LIKE ?)');
      const q = `%${search.trim()}%`;
      params.push(q, q);
    }

    if (tag_id) {
      clauses.push(`p.id IN (SELECT project_id FROM project_research_areas WHERE research_area_id = ?)`);
      params.push(tag_id);
    }

    if (clauses.length > 0) {
      whereSQL = `WHERE ${clauses.join(' AND ')}`;
    }

    const projects = db.prepare(`
      SELECT p.*, u.full_name as owner_name, u.title as owner_title, f.name as owner_faculty
      FROM projects p
      JOIN users u ON u.id = p.owner_id
      LEFT JOIN faculties f ON f.id = u.faculty_id
      ${whereSQL}
      ORDER BY p.id DESC
    `).all(...params);

    for (const p of projects) {
      p.tags = db.prepare(`
        SELECT ra.id, ra.label
        FROM project_research_areas pra
        JOIN research_areas ra ON ra.id = pra.research_area_id
        WHERE pra.project_id = ?
      `).all(p.id);

      p.member_count = db.prepare('SELECT COUNT(*) as c FROM project_members WHERE project_id = ?').get(p.id).c;
    }

    res.json({ projects });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Single Project Detail
app.get('/api/projects/:id', (req, res) => {
  try {
    const project = db.prepare(`
      SELECT p.*, u.full_name as owner_name, u.title as owner_title, f.name as owner_faculty
      FROM projects p
      JOIN users u ON u.id = p.owner_id
      LEFT JOIN faculties f ON f.id = u.faculty_id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Proje bulunamadı.' });
    }

    project.tags = db.prepare(`
      SELECT ra.id, ra.label
      FROM project_research_areas pra
      JOIN research_areas ra ON ra.id = pra.research_area_id
      WHERE pra.project_id = ?
    `).all(project.id);

    project.members = db.prepare(`
      SELECT u.id, u.full_name, u.title, u.photo_url, u.is_claimed, f.name as faculty_name, pm.role, pm.joined_at
      FROM project_members pm
      JOIN users u ON u.id = pm.user_id
      LEFT JOIN faculties f ON f.id = u.faculty_id
      WHERE pm.project_id = ?
    `).all(project.id);

    res.json({ project });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Project
app.post('/api/projects', authMiddleware, (req, res) => {
  const { title, description, objectives, teamSize = 3, duration, budget, researchAreaIds = [] } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'Proje başlığı ve açıklaması zorunludur.' });
  }

  const result = db.prepare(`
    INSERT INTO projects (title, description, objectives, owner_id, team_size, duration, budget, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'open')
  `).run(title, description, objectives || null, req.user.id, teamSize, duration || null, budget || null);

  const projectId = result.lastInsertRowid;

  // Add owner as leader
  db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)')
    .run(projectId, req.user.id, 'leader');

  // Add required tags
  const insertProjArea = db.prepare('INSERT OR IGNORE INTO project_research_areas (project_id, research_area_id) VALUES (?, ?)');
  for (const tagId of researchAreaIds) {
    insertProjArea.run(projectId, tagId);
  }

  res.status(201).json({ message: 'Proje başarıyla oluşturuldu!', projectId });
});

// Update Project
app.put('/api/projects/:id', authMiddleware, (req, res) => {
  const { title, description, objectives, teamSize = 3, duration, budget, researchAreaIds = [] } = req.body;
  const projectId = req.params.id;

  const project = db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(projectId);
  if (!project) {
    return res.status(404).json({ error: 'Proje bulunamadı.' });
  }

  if (project.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'Bu projeyi düzenleme yetkiniz bulunmamaktadır.' });
  }

  if (!title || !description) {
    return res.status(400).json({ error: 'Proje başlığı ve açıklaması zorunludur.' });
  }

  db.prepare(`
    UPDATE projects SET
      title = ?,
      description = ?,
      objectives = ?,
      team_size = ?,
      duration = ?,
      budget = ?
    WHERE id = ?
  `).run(title, description, objectives || null, teamSize, duration || null, budget || null, projectId);

  db.prepare('DELETE FROM project_research_areas WHERE project_id = ?').run(projectId);
  const insertProjArea = db.prepare('INSERT OR IGNORE INTO project_research_areas (project_id, research_area_id) VALUES (?, ?)');
  for (const tagId of researchAreaIds) {
    insertProjArea.run(projectId, tagId);
  }

  res.json({ message: 'Proje başarıyla güncellendi!' });
});


// Akıllı Eşleştirme Motoru (/api/projects/:id/match)
app.get('/api/projects/:id/match', authMiddleware, (req, res) => {
  try {
    const projectId = req.params.id;
    const project = db.prepare('SELECT id, owner_id, title FROM projects WHERE id = ?').get(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Proje bulunamadı.' });
    }

    if (project.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Bu projenin eşleştirme verilerine erişim yetkiniz bulunmamaktadır.' });
    }

    // Get project tags
    const projectTags = db.prepare(`
      SELECT ra.id, ra.label
      FROM project_research_areas pra
      JOIN research_areas ra ON ra.id = pra.research_area_id
      WHERE pra.project_id = ?
    `).all(projectId);

    if (projectTags.length === 0) {
      return res.json({ matches: [], message: 'Bu projede araştırma alanı etiketi belirtilmediği için eşleştirme yapılamadı.' });
    }

    const tagIds = projectTags.map(t => t.id);
    const placeholders = tagIds.map(() => '?').join(',');

    // Find academicians who share tags and are NOT already in the project
    const candidates = db.prepare(`
      SELECT u.id, u.full_name, u.title, u.faculty_id, u.department_id,
             u.photo_url, u.is_claimed, u.is_active,
             f.name as faculty_name, d.name as department_name
      FROM users u
      LEFT JOIN faculties f ON f.id = u.faculty_id
      LEFT JOIN departments d ON d.id = u.department_id
      WHERE u.id NOT IN (SELECT user_id FROM project_members WHERE project_id = ?)
        AND u.has_research_fields = 1
    `).all(projectId);

    const matches = [];
    for (const cand of candidates) {
      // Get candidate's tags that intersect with project
      const commonTags = db.prepare(`
        SELECT ra.id, ra.label
        FROM user_research_areas ura
        JOIN research_areas ra ON ra.id = ura.research_area_id
        WHERE ura.user_id = ? AND ura.research_area_id IN (${placeholders})
      `).all(cand.id, ...tagIds);

      if (commonTags.length > 0) {
        // Calculate match percentage
        const overlapRatio = commonTags.length / projectTags.length;
        // Bonus for claimed active accounts (+10%)
        const claimedBonus = cand.is_claimed ? 0.15 : 0;
        let score = Math.min(Math.round((overlapRatio + claimedBonus) * 100), 99);
        if (overlapRatio === 1) score = 98; // High score

        matches.push({
          academician: cand,
          match_score: score,
          common_tags: commonTags,
          common_count: commonTags.length
        });
      }
    }

    // Sort by match_score DESC, then claimed DESC
    matches.sort((a, b) => b.match_score - a.match_score || b.academician.is_claimed - a.academician.is_claimed);

    res.json({
      project_title: project.title,
      project_tags: projectTags,
      total_candidates_found: matches.length,
      matches: matches.slice(0, 30) // top 30 smart recommendations
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Invite Academician to Project
app.post('/api/projects/:id/invite', authMiddleware, (req, res) => {
  const { receiverId, message } = req.body;
  const projectId = req.params.id;

  const project = db.prepare('SELECT owner_id, title FROM projects WHERE id = ?').get(projectId);
  if (!project) return res.status(404).json({ error: 'Proje bulunamadı.' });

  if (project.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'Bu projeye davet gönderme yetkiniz bulunmamaktadır.' });
  }

  // Check if already invited or member
  const existing = db.prepare(`
    SELECT id FROM applications_invitations
    WHERE project_id = ? AND receiver_id = ? AND type = 'invitation' AND status = 'pending'
  `).get(projectId, receiverId);

  if (existing) {
    return res.status(400).json({ error: 'Bu akademisyene zaten bekleyen bir davet gönderdiniz.' });
  }

  const isMember = db.prepare('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, receiverId);
  if (isMember) {
    return res.status(400).json({ error: 'Bu akademisyen zaten bu projenin üyesidir.' });
  }

  db.prepare(`
    INSERT INTO applications_invitations (project_id, sender_id, receiver_id, type, status, message)
    VALUES (?, ?, ?, 'invitation', 'pending', ?)
  `).run(projectId, req.user.id, receiverId, message || `${project.title} projesine davet edildiniz.`);

  // Create notification
  db.prepare(`
    INSERT INTO notifications (user_id, title, body, link)
    VALUES (?, ?, ?, ?)
  `).run(
    receiverId,
    'Yeni Proje Daveti Aldınız!',
    `${req.user.name} sizi "${project.title}" projesine davet etti.`,
    '/dashboard'
  );

  res.json({ message: 'Davet başarıyla gönderildi!' });
});

// Apply to join a Project
app.post('/api/projects/:id/apply', authMiddleware, (req, res) => {
  const { message } = req.body;
  const projectId = req.params.id;

  const project = db.prepare('SELECT owner_id, title FROM projects WHERE id = ?').get(projectId);
  if (!project) return res.status(404).json({ error: 'Proje bulunamadı.' });

  const existing = db.prepare(`
    SELECT id FROM applications_invitations
    WHERE project_id = ? AND sender_id = ? AND type = 'application' AND status = 'pending'
  `).get(projectId, req.user.id);

  if (existing) {
    return res.status(400).json({ error: 'Bu projeye zaten başvuru yaptınız.' });
  }

  const isMember = db.prepare('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, req.user.id);
  if (isMember) {
    return res.status(400).json({ error: 'Zaten bu projenin üyesisiniz.' });
  }

  db.prepare(`
    INSERT INTO applications_invitations (project_id, sender_id, receiver_id, type, status, message)
    VALUES (?, ?, ?, 'application', 'pending', ?)
  `).run(projectId, req.user.id, project.owner_id, message || `${project.title} projenize katılmak istiyorum.`);

  // Create notification for owner
  db.prepare(`
    INSERT INTO notifications (user_id, title, body, link)
    VALUES (?, ?, ?, ?)
  `).run(
    project.owner_id,
    'Projenize Yeni Başvuru Var!',
    `${req.user.name}, "${project.title}" projesine katılma talebinde bulundu.`,
    '/dashboard'
  );

  res.json({ message: 'Katılım başvurunuz başarıyla iletildi!' });
});

// Respond to Invitation or Application
app.post('/api/invitations/:id/respond', authMiddleware, (req, res) => {
  const { status } = req.body; // 'accepted' | 'rejected'
  const inv = db.prepare('SELECT * FROM applications_invitations WHERE id = ?').get(req.params.id);

  if (!inv) return res.status(404).json({ error: 'Davet/başvuru bulunamadı.' });

  db.prepare('UPDATE applications_invitations SET status = ? WHERE id = ?').run(status, inv.id);

  const project = db.prepare('SELECT title FROM projects WHERE id = ?').get(inv.project_id);

  if (status === 'accepted') {
    // Add user to project members
    const memberId = inv.type === 'invitation' ? inv.receiver_id : inv.sender_id;
    db.prepare('INSERT OR IGNORE INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)')
      .run(inv.project_id, memberId, 'researcher');

    // Send notification
    db.prepare('INSERT INTO notifications (user_id, title, body, link) VALUES (?, ?, ?, ?)').run(
      memberId,
      'Katılım Onaylandı!',
      `"${project.title}" projesine katılımınız onaylandı.`,
      `/projects/${inv.project_id}`
    );
  }

  res.json({ message: `Talep durumu "${status === 'accepted' ? 'Kabul Edildi' : 'Reddedildi'}" olarak güncellendi.` });
});

// ==========================================
// 5. KULLANICI PANELS & BİLDİRİMLER (Dashboard)
// ==========================================
app.get('/api/dashboard', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;

    // My Created Projects
    const myProjects = db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
      FROM projects p
      WHERE p.owner_id = ?
      ORDER BY p.id DESC
    `).all(userId);

    // Joined Projects
    const joinedProjects = db.prepare(`
      SELECT p.*, pm.role as my_role
      FROM projects p
      JOIN project_members pm ON pm.project_id = p.id
      WHERE pm.user_id = ? AND p.owner_id != ?
      ORDER BY p.id DESC
    `).all(userId, userId);

    // Incoming Invitations & Applications
    const incomingRequests = db.prepare(`
      SELECT ai.*, p.title as project_title,
             u.full_name as sender_name, u.title as sender_title, u.photo_url as sender_photo
      FROM applications_invitations ai
      JOIN projects p ON p.id = ai.project_id
      JOIN users u ON u.id = ai.sender_id
      WHERE ai.receiver_id = ? AND ai.status = 'pending'
      ORDER BY ai.created_at DESC
    `).all(userId);

    // Notifications
    const notifications = db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY id DESC LIMIT 20
    `).all(userId);

    res.json({
      myProjects,
      joinedProjects,
      incomingRequests,
      notifications
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark notifications read
app.post('/api/notifications/read-all', authMiddleware, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ success: true });
});

// ==========================================
// CHAT / MESSAGING SYSTEM API
// ==========================================

// 1. Get Chat Contacts
app.get('/api/chat/contacts', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;

    const contacts = db.prepare(`
      SELECT DISTINCT 
        u.id, 
        u.full_name, 
        u.title, 
        u.photo_url,
        u.last_active_at,
        (
          SELECT m.message 
          FROM messages m 
          WHERE (m.sender_id = u.id AND m.receiver_id = ?) 
             OR (m.sender_id = ? AND m.receiver_id = u.id)
          ORDER BY m.id DESC LIMIT 1
        ) as last_message,
        (
          SELECT m.created_at 
          FROM messages m 
          WHERE (m.sender_id = u.id AND m.receiver_id = ?) 
             OR (m.sender_id = ? AND m.receiver_id = u.id)
          ORDER BY m.id DESC LIMIT 1
        ) as last_message_time,
        (
          SELECT COUNT(*) 
          FROM messages m 
          WHERE m.sender_id = u.id AND m.receiver_id = ? AND m.is_read = 0
        ) as unread_count
      FROM users u
      JOIN messages msg ON (msg.sender_id = u.id AND msg.receiver_id = ?) 
                       OR (msg.sender_id = ? AND msg.receiver_id = u.id)
      WHERE u.id != ?
      ORDER BY last_message_time DESC
    `).all(userId, userId, userId, userId, userId, userId, userId, userId);

    res.json({ contacts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Get Message History between current user and contactId
app.get('/api/chat/messages/:contactId', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.contactId;

    // Mark messages from contact to current user as read
    db.prepare(`
      UPDATE messages SET is_read = 1 
      WHERE sender_id = ? AND receiver_id = ?
    `).run(contactId, userId);

    // Fetch history
    const history = db.prepare(`
      SELECT * FROM messages
      WHERE (sender_id = ? AND receiver_id = ?)
         OR (sender_id = ? AND receiver_id = ?)
      ORDER BY id ASC
    `).all(userId, contactId, contactId, userId);

    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Send Message
app.post('/api/chat/messages', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const { receiverId, message, fileUrl, fileName } = req.body;

    if (!receiverId || (!message && !fileUrl)) {
      return res.status(400).json({ error: 'Alıcı ve mesaj içeriği veya dosya zorunludur.' });
    }

    const msgText = message ? message.trim() : (fileName || 'Dosya gönderdi');

    const result = db.prepare(`
      INSERT INTO messages (sender_id, receiver_id, message, file_url, file_name)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, receiverId, msgText, fileUrl || null, fileName || null);

    const messageId = result.lastInsertRowid;

    // Create a notification for the receiver
    const sender = db.prepare('SELECT title, full_name FROM users WHERE id = ?').get(userId);
    const senderName = sender ? `${sender.title || ''} ${sender.full_name}`.trim() : 'Bir Kullanıcı';
    
    db.prepare(`
      INSERT INTO notifications (user_id, title, body, link)
      VALUES (?, ?, ?, ?)
    `).run(
      receiverId,
      'Yeni Bir Mesajınız Var!',
      `${senderName} size bir mesaj gönderdi: "${msgText.substring(0, 40)}${msgText.length > 40 ? '...' : ''}"`,
      '/dashboard?tab=chat'
    );

    res.status(201).json({ 
      success: true, 
      message: {
        id: messageId,
        sender_id: userId,
        receiver_id: Number(receiverId),
        message: msgText,
        file_url: fileUrl || null,
        file_name: fileName || null,
        is_read: 0,
        created_at: new Date().toISOString()
      } 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Delete Chat Message
app.delete('/api/chat/messages/:id', authMiddleware, (req, res) => {
  try {
    const messageId = req.params.id;
    const userId = req.user.id;

    // Verify ownership
    const message = db.prepare('SELECT sender_id FROM messages WHERE id = ?').get(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Mesaj bulunamadı.' });
    }

    if (message.sender_id !== userId) {
      return res.status(403).json({ error: 'Bu mesajı silme yetkiniz bulunmamaktadır.' });
    }

    db.prepare('DELETE FROM messages WHERE id = ?').run(messageId);
    res.json({ success: true, message: 'Mesaj başarıyla silindi.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Upload File for Chat
app.post('/api/chat/upload', authMiddleware, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Lütfen yüklenecek bir dosya seçin.' });
    }
    const fileUrl = `/uploads/chat/${req.file.filename}`;
    res.json({ fileUrl, fileName: req.file.originalname });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Clear Chat History
app.delete('/api/chat/messages/clear/:contactId', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.contactId;

    db.prepare(`
      DELETE FROM messages
      WHERE (sender_id = ? AND receiver_id = ?)
         OR (sender_id = ? AND receiver_id = ?)
    `).run(userId, contactId, contactId, userId);

    res.json({ success: true, message: 'Sohbet geçmişi başarıyla temizlendi.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// MEETING SCHEDULER / CALENDAR API
// ==========================================

// 1. Get Meetings List
app.get('/api/meetings', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const meetings = db.prepare(`
      SELECT m.*, 
             uo.full_name as organizer_name, uo.title as organizer_title, uo.photo_url as organizer_photo,
             ug.full_name as guest_name, ug.title as guest_title, ug.photo_url as guest_photo,
             p.title as project_title
      FROM meetings m
      JOIN users uo ON uo.id = m.organizer_id
      JOIN users ug ON ug.id = m.guest_id
      LEFT JOIN projects p ON p.id = m.project_id
      WHERE m.organizer_id = ? OR m.guest_id = ?
      ORDER BY m.meeting_date ASC, m.meeting_time ASC
    `).all(userId, userId);
    res.json({ meetings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Schedule a Meeting
app.post('/api/meetings', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const { projectId, guestId, title, description, meetingType, meetingDate, meetingTime } = req.body;

    if (!guestId || !title || !meetingDate || !meetingTime) {
      return res.status(400).json({ error: 'Toplantı başlığı, konuk akademisyen, tarih ve saat zorunludur.' });
    }

    const result = db.prepare(`
      INSERT INTO meetings (project_id, organizer_id, guest_id, title, description, meeting_type, meeting_date, meeting_time, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(projectId || null, userId, guestId, title.trim(), description ? description.trim() : null, meetingType || 'zoom', meetingDate, meetingTime);

    // Create notification for guest
    const organizer = db.prepare('SELECT title, full_name FROM users WHERE id = ?').get(userId);
    const orgName = organizer ? `${organizer.title || ''} ${organizer.full_name}`.trim() : 'Bir Kullanıcı';
    
    db.prepare(`
      INSERT INTO notifications (user_id, title, body, link)
      VALUES (?, ?, ?, ?)
    `).run(
      guestId,
      'Yeni Görüşme Daveti Aldınız!',
      `${orgName} sizinle bir görüşme ayarlamak istiyor: "${title.trim()}"`,
      '/dashboard?tab=calendar'
    );

    res.status(201).json({ success: true, meetingId: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Respond to Meeting Invitation
app.post('/api/meetings/:id/respond', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const meetingId = req.params.id;
    const { status } = req.body; // 'accepted' | 'declined'

    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ error: 'Geçersiz yanıt statüsü.' });
    }

    const meeting = db.prepare('SELECT * FROM meetings WHERE id = ?').get(meetingId);
    if (!meeting) return res.status(404).json({ error: 'Toplantı bulunamadı.' });

    if (meeting.guest_id !== userId) {
      return res.status(403).json({ error: 'Bu toplantı davetine yanıt verme yetkiniz yoktur.' });
    }

    db.prepare('UPDATE meetings SET status = ? WHERE id = ?').run(status, meetingId);

    // Notify organizer
    const guest = db.prepare('SELECT title, full_name FROM users WHERE id = ?').get(userId);
    const guestName = guest ? `${guest.title || ''} ${guest.full_name}`.trim() : 'Bir Kullanıcı';
    const statusTxt = status === 'accepted' ? 'kabul etti' : 'reddetti';

    db.prepare(`
      INSERT INTO notifications (user_id, title, body, link)
      VALUES (?, ?, ?, ?)
    `).run(
      meeting.organizer_id,
      'Toplantı Davetiniz Yanıtlandı',
      `${guestName} "${meeting.title}" konulu toplantı davetinizi ${statusTxt}.`,
      '/dashboard?tab=calendar'
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



app.listen(PORT, () => {
  console.log(`🚀 AVESİS CoMatch API Server http://localhost:${PORT} adresinde çalışıyor!`);
});
