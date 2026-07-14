import React, { useState, useEffect } from 'react';
import { fetchProjectById, applyToProject } from '../services/api';
import { useAuth } from '../context/AuthContext';
import SmartMatchingPanel from '../components/SmartMatchingPanel';
import { FolderGit2, Users, Sparkles, ArrowLeft, Send, CheckCircle2, Award, Calendar, DollarSign } from 'lucide-react';

export default function ProjectDetailPage({ id, onNavigate }) {
  const { user, token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'matching'
  const [applyMsg, setApplyMsg] = useState('');
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    fetchProjectById(id)
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleApply = async (e) => {
    e.preventDefault();
    if (!token) return alert('Lütfen giriş yapın.');
    try {
      await applyToProject(id, applyMsg, token);
      setApplied(true);
      setTimeout(() => setApplyModalOpen(false), 1500);
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '6rem' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Proje yükleniyor...</div>
      </div>
    );
  }

  if (!data || !data.project) {
    return (
      <div style={{ textAlign: 'center', padding: '6rem' }}>
        <h3>Proje bulunamadı.</h3>
      </div>
    );
  }

  const { project } = data;
  const isOwnerOrLeader = user && String(user.id) === String(project.owner_id);

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '2.5rem 2rem 5rem' }}>
      <button
        onClick={() => onNavigate('projects')}
        className="btn-secondary"
        style={{ marginBottom: '2rem', padding: '0.5rem 1rem', fontSize: '0.88rem' }}
      >
        <ArrowLeft size={16} />
        <span>Tüm Projelere Dön</span>
      </button>

      {/* HEADER BANNER */}
      <div className="card-glass" style={{ marginBottom: '2rem', padding: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ maxWidth: '800px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              {project.owner_faculty || 'Recep Tayyip Erdoğan Üniversitesi'}
            </div>
            <h1 style={{ fontSize: '2.2rem', marginBottom: '1rem', lineHeight: 1.3 }}>
              {project.title}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              {project.description}
            </p>

            {/* Tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {(project.tags || []).map(t => (
                <span key={t.id} className="badge badge-tag" style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem' }}>
                  {t.label}
                </span>
              ))}
            </div>
          </div>

          {/* Quick Info & Action */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            minWidth: '260px'
          }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Proje Lideri</div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                {project.owner_title} {project.owner_name}
              </div>
            </div>

            {project.duration && (
              <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={16} color="var(--accent-primary)" />
                <span style={{ fontSize: '0.9rem' }}><strong>Süre:</strong> {project.duration}</span>
              </div>
            )}

            {project.budget && (
              <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <DollarSign size={16} color="var(--success)" />
                <span style={{ fontSize: '0.9rem' }}><strong>Bütçe:</strong> {project.budget}</span>
              </div>
            )}

            {user && !isOwnerOrLeader && (
              applied ? (
                <div style={{ padding: '0.75rem', background: 'var(--success-bg)', color: 'var(--success)', borderRadius: '8px', textAlign: 'center', fontWeight: 600 }}>
                  ✓ Başvurunuz Alındı
                </div>
              ) : (
                <button
                  onClick={() => setApplyModalOpen(true)}
                  className="btn-primary"
                  style={{ width: '100%' }}
                >
                  <Send size={16} />
                  <span>Katılım Talebi Gönder</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* TABS HEADER */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '2px solid var(--border-color)',
        marginBottom: '2rem'
      }}>
        <button
          onClick={() => setActiveTab('info')}
          style={{
            padding: '0.85rem 1.5rem',
            fontSize: '1rem',
            fontWeight: 700,
            borderBottom: activeTab === 'info' ? '3px solid var(--accent-primary)' : '3px solid transparent',
            color: activeTab === 'info' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            marginBottom: '-2px'
          }}
        >
          Proje Hedefleri & Ekip Üyeleri
        </button>

        <button
          onClick={() => setActiveTab('matching')}
          style={{
            padding: '0.85rem 1.5rem',
            fontSize: '1rem',
            fontWeight: 700,
            borderBottom: activeTab === 'matching' ? '3px solid var(--accent-primary)' : '3px solid transparent',
            color: activeTab === 'matching' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Sparkles size={18} />
          <span>Akıllı Eşleştirme Önerileri</span>
        </button>
      </div>

      {/* TAB CONTENT */}
      {activeTab === 'info' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
          {/* Objectives */}
          <div className="card-glass">
            <h3 style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>Proje Hedefleri & İş Paketi</h3>
            <pre style={{
              fontFamily: 'var(--font-body)',
              color: 'var(--text-secondary)',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.7,
              fontSize: '0.95rem'
            }}>
              {project.objectives || 'Proje hedefleri yakında güncellenecektir.'}
            </pre>
          </div>

          {/* Members */}
          <div className="card-glass">
            <h3 style={{ fontSize: '1.4rem', marginBottom: '1.25rem' }}>
              Mevcut Ekip Üyeleri ({project.members?.length || 0} / {project.team_size})
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {(project.members || []).map(m => (
                <div
                  key={m.id}
                  onClick={() => onNavigate('academician-detail', m.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.98rem' }}>{m.title} {m.full_name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{m.faculty_name}</div>
                  </div>
                  <span className="badge" style={{ background: 'rgba(56,149,255,0.15)', color: 'var(--accent-primary)' }}>
                    {m.role === 'leader' ? 'Lider' : 'Araştırmacı'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* SMART MATCHING TAB */
        <SmartMatchingPanel
          projectId={project.id}
          onNavigateAcademician={id => onNavigate('academician-detail', id)}
        />
      )}

      {/* APPLY MODAL */}
      {applyModalOpen && (
        <div className="modal-overlay" onClick={() => setApplyModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.35rem', marginBottom: '1rem' }}>Projeye Katılım Talebi</h3>
            <form onSubmit={handleApply}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Katılım Amacınız ve Uzmanlık Alanınız
                </label>
                <textarea
                  rows={3}
                  required
                  className="form-textarea"
                  placeholder="Projede hangi alanda katkı sağlayabileceğinizi belirtin..."
                  value={applyMsg}
                  onChange={e => setApplyMsg(e.target.value)}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                Başvuruyu İlet
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
