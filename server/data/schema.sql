-- AVESİS CoMatch Database Schema

CREATE TABLE IF NOT EXISTS faculties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    faculty_id INTEGER,
    name TEXT NOT NULL,
    FOREIGN KEY(faculty_id) REFERENCES faculties(id)
);

CREATE TABLE IF NOT EXISTS research_areas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    title TEXT,
    faculty_id INTEGER,
    department_id INTEGER,
    avesis_profile_url TEXT,
    email TEXT UNIQUE,
    password_hash TEXT,
    bio TEXT,
    photo_url TEXT,
    is_claimed INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 0,
    has_research_fields INTEGER DEFAULT 1,
    pub_total INTEGER DEFAULT 0,
    pub_wos INTEGER DEFAULT 0,
    pub_scopus INTEGER DEFAULT 0,
    cite_wos INTEGER DEFAULT 0,
    h_index_wos INTEGER DEFAULT 0,
    cite_scopus INTEGER DEFAULT 0,
    h_index_scopus INTEGER DEFAULT 0,
    cite_scholar INTEGER DEFAULT 0,
    h_index_scholar INTEGER DEFAULT 0,
    cite_tr_dizin INTEGER DEFAULT 0,
    h_index_tr_dizin INTEGER DEFAULT 0,
    cite_sobiad INTEGER DEFAULT 0,
    h_index_sobiad INTEGER DEFAULT 0,
    project_count INTEGER DEFAULT 0,
    thesis_advising INTEGER DEFAULT 0,
    open_access INTEGER DEFAULT 0,
    other_metrics TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(faculty_id) REFERENCES faculties(id),
    FOREIGN KEY(department_id) REFERENCES departments(id)
);

CREATE TABLE IF NOT EXISTS user_research_areas (
    user_id INTEGER,
    research_area_id INTEGER,
    PRIMARY KEY(user_id, research_area_id),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(research_area_id) REFERENCES research_areas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    objectives TEXT,
    owner_id INTEGER NOT NULL,
    team_size INTEGER DEFAULT 3,
    duration TEXT,
    budget TEXT,
    status TEXT DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS project_research_areas (
    project_id INTEGER,
    research_area_id INTEGER,
    PRIMARY KEY(project_id, research_area_id),
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY(research_area_id) REFERENCES research_areas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_members (
    project_id INTEGER,
    user_id INTEGER,
    role TEXT DEFAULT 'member',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(project_id, user_id),
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS applications_invitations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    link TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indices for high performance searching across 1,233+ academicians and ~1,400 tags
CREATE INDEX IF NOT EXISTS idx_users_faculty ON users(faculty_id);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_claimed ON users(is_claimed);
CREATE INDEX IF NOT EXISTS idx_users_name ON users(full_name);
CREATE INDEX IF NOT EXISTS idx_user_research_areas_user ON user_research_areas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_research_areas_area ON user_research_areas(research_area_id);

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

