import React, { useState, useEffect } from 'react';
import { fetchProjectSmartMatches, inviteToProject } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Send, CheckCircle2, Award, UserPlus, Zap } from 'lucide-react';

export default function SmartMatchingPanel({ projectId, onNavigateAcademician }) {
  const { user, token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invitingId, setInvitingId] = useState(null);
  const [invitedMap, setInvitedMap] = useState({});

  useEffect(() => {
    fetchProjectSmartMatches(projectId)
      .then(d => { setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleQuickInvite = async (academicianId, name) => {
    if (!token) return alert('Lütfen önce giriş yapın.');
    setInvitingId(academicianId);
    try {
      await inviteToProject(projectId, academicianId, `Merhaba Sayın ${name}, projemizin araştırma alanlarıyla % yüksek uyumunuz nedeniyle ekibimize katılmanızı dileriz.`, token);
      setInvitedMap(prev => ({ ...prev, [academicianId]: true }));
    } catch (err) {
      alert(err.message);
    } finally {
      setInvitingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Yapay Zeka & Eşleştirme Algoritması Çalışıyor...</div>
      </div>
    );
  }

  if (!data || !data.matches || data.matches.length === 0) {
    return (
      <div className="card-glass" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
        <Sparkles size={40} color="var(--accent-primary)" style={{ margin: '0 auto 1rem' }} />
        <h4 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Eşleşen Öneri Bulunamadı</h4>
        <p style={{ color: 'var(--text-secondary)' }}>
          {data?.message || 'Projenize araştırma alanı etiketleri eklediğinizde sistem otomatik olarak üniversitemizdeki en uygun akademisyenleri sıralar.'}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Engine explanation banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(56, 149, 255, 0.15), rgba(16, 185, 129, 0.12))',
        border: '1px solid rgba(56, 149, 255, 0.3)',
        borderRadius: 'var(--radius-md)',
        padding: '1.25rem 1.5rem',
        marginBottom: '2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Zap size={24} color="var(--accent-primary)" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>Akıllı Eşleştirme Motoru Önerileri</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Projenizin etiketleriyle üniversitemizin 1.233 akademisyeninin araştırma alanları analiz edilmiştir.
            </div>
          </div>
        </div>
        <div className="badge badge-claimed" style={{ fontSize: '0.85rem', padding: '0.45rem 1rem' }}>
          {data.matches.length} Uygun Akademisyen Bulundu
        </div>
      </div>

      {/* MATCH CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '1.5rem' }}>
        {data.matches.map(m => {
          const acc = m.academician;
          const scoreColor = m.match_score > 70 ? 'var(--success)' : m.match_score > 40 ? 'var(--accent-primary)' : 'var(--warning)';

          return (
            <div
              key={acc.id}
              className="card-glass"
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div>
                {/* Score & Status Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{
                    padding: '0.35rem 0.85rem',
                    borderRadius: '9999px',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    background: `${scoreColor}22`,
                    color: scoreColor,
                    border: `1px solid ${scoreColor}44`
                  }}>
                    % {m.match_score} Uyumlu
                  </div>

                  {acc.is_claimed ? (
                    <span className="badge badge-claimed">Aktif Profil</span>
                  ) : (
                    <span className="badge badge-unclaimed">AVESİS Arşivi</span>
                  )}
                </div>

                {/* Academician Name */}
                <h4
                  onClick={() => onNavigateAcademician(acc.id)}
                  style={{ fontSize: '1.15rem', cursor: 'pointer', marginBottom: '0.3rem' }}
                >
                  {acc.title} {acc.full_name}
                </h4>

                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  {acc.faculty_name} — {acc.department_name}
                </div>

                {/* Overlap Tags */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                    Ortak Araştırma Alanları ({m.common_count})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {m.common_tags.map(t => (
                      <span
                        key={t.id}
                        className="badge"
                        style={{
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: 'var(--success)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          fontSize: '0.75rem'
                        }}
                      >
                        ✓ {t.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div style={{
                borderTop: '1px solid var(--border-color)',
                paddingTop: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <button
                  onClick={() => onNavigateAcademician(acc.id)}
                  style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}
                >
                  Profili İncele
                </button>

                {user && user.id !== acc.id && (
                  invitedMap[acc.id] ? (
                    <span style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <CheckCircle2 size={16} /> Davet Edildi
                    </span>
                  ) : (
                    <button
                      disabled={invitingId === acc.id}
                      onClick={() => handleQuickInvite(acc.id, acc.full_name)}
                      className="btn-primary"
                      style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}
                    >
                      <Send size={14} />
                      <span>{invitingId === acc.id ? '...' : 'Projeye Davet Et'}</span>
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
