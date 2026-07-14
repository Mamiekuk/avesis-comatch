import React, { useState, useEffect } from 'react';
import { fetchProjects } from '../services/api';
import { FolderGit2, Search, PlusCircle, Users, ArrowRight } from 'lucide-react';

export default function ProjectsPage({ onNavigate, onOpenLogin, user }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadProjects = (query = '') => {
    setLoading(true);
    fetchProjects({ search: query })
      .then(d => setProjects(d.projects || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProjects('');
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    loadProjects(search);
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2.5rem 2rem 5rem' }}>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2.5rem',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2.4rem', marginBottom: '0.4rem' }}>Akademik Proje İlanları</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Disiplinlerarası projelere göz atın, araştırma alanınızla eşleşen ekibe katılın.
          </p>
        </div>

        <button
          onClick={() => {
            if (!user) onOpenLogin();
            else onNavigate('create-project');
          }}
          className="btn-primary"
        >
          <PlusCircle size={18} />
          <span>Yeni Proje Oluştur</span>
        </button>
      </div>

      {/* SEARCH BAR */}
      <form onSubmit={handleSearch} style={{ marginBottom: '2.5rem', maxWidth: '600px' }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Proje başlığı veya anahtar kelime arayın..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button type="submit" style={{ position: 'absolute', right: '12px', top: '10px', color: 'var(--accent-primary)' }}>
            <Search size={20} />
          </button>
        </div>
      </form>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem' }}>
          <div style={{ color: 'var(--text-secondary)' }}>Projeler yükleniyor...</div>
        </div>
      ) : projects.length === 0 ? (
        <div className="card-glass" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <h3>Aramanızla eşleşen proje bulunamadı.</h3>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.75rem' }}>
          {projects.map(proj => (
            <div
              key={proj.id}
              onClick={() => onNavigate('project-detail', proj.id)}
              className="card-glass"
              style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                    {proj.owner_faculty || 'Fakülte Belirtilmemiş'}
                  </span>
                  <span className="badge" style={{ background: 'rgba(56,149,255,0.12)', color: 'var(--accent-primary)' }}>
                    <Users size={12} />
                    {proj.member_count} / {proj.team_size} Kişi
                  </span>
                </div>

                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                  {proj.title}
                </h3>

                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.9rem',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  marginBottom: '1rem'
                }}>
                  {proj.description}
                </p>

                {/* Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.25rem' }}>
                  {(proj.tags || []).map(tag => (
                    <span key={tag.id} className="badge badge-tag">
                      {tag.label}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{
                borderTop: '1px solid var(--border-color)',
                paddingTop: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.85rem',
                color: 'var(--text-muted)'
              }}>
                <span>Lider: <strong style={{ color: 'var(--text-primary)' }}>{proj.owner_title} {proj.owner_name}</strong></span>
                <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>İncele →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
