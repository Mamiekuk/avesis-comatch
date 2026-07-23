import React, { useState, useEffect } from 'react';
import { fetchProjectSmartMatches, inviteToProject } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Send, CheckCircle2, Award } from 'lucide-react';

const cleanClusterName = (name) => {
  if (!name) return '';
  return name
    .replace(/ Akademik Yaylası \(Rize Yöresi\)/gi, ' Akademik Kümesi')
    .replace(/ Akademik Yaylası/gi, ' Akademik Kümesi')
    .replace(/ Yaylası/gi, ' Kümesi')
    .replace(/ \(Rize Yöresi\)/gi, '')
    .replace(/ Rize Yöresi/gi, '');
};

export default function SmartMatchingPanel({ projectId, onNavigateAcademician }) {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedClusterId, setSelectedClusterId] = useState('ALL');
  const [invitingId, setInvitingId] = useState(null);
  const [invitedMap, setInvitedMap] = useState({});

  useEffect(() => {
    setLoading(true);
    fetchProjectSmartMatches(projectId, token, selectedClusterId)
      .then(d => { setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId, token, selectedClusterId]);

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
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          {data?.message || 'Seçilen K-Means kümesinde projenizle eşleşen veya ortak araştırma alanına sahip akademisyen bulunamadı.'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* HEADER BAR */}
      <div className="card-glass" style={{ padding: '1.75rem', background: 'linear-gradient(135deg, rgba(56, 149, 255, 0.08), rgba(168, 85, 247, 0.08))', border: '1px solid rgba(56, 149, 255, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.7rem', borderRadius: '12px', background: 'rgba(56, 149, 255, 0.2)', color: 'var(--accent-primary)' }}>
            <Sparkles size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.35rem', margin: 0 }}>Akıllı Araştırmacı Eşleştirme Önerileri</h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Proje etiketleriniz ve K-Means akademik kümeniz baz alınarak 1.233 araştırmacı tarandı.
            </p>

            {/* K-Means Cluster Selector Dropdown */}
            <div style={{ marginTop: '0.85rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                🎯 Hedef Akademik Küme:
              </span>
              <select
                value={selectedClusterId}
                onChange={(e) => setSelectedClusterId(e.target.value)}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(168, 85, 247, 0.45)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="ALL">🌟 Tüm Akademik Kümeler</option>
                {data.all_clusters && data.all_clusters.map(c => (
                  <option key={c.id} value={String(c.id)}>
                    🌐 {cleanClusterName(c.name)} ({c.member_count} Araştırmacı) {data.owner_cluster && data.owner_cluster.id === c.id ? ' [Yürütücü Kümesi]' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="badge badge-claimed" style={{ fontSize: '0.88rem', padding: '0.5rem 1.1rem', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(56, 149, 255, 0.2))', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
          {data.matches.length} Uygun Araştırmacı Bulundu
        </div>
      </div>

      {/* MATCH CARDS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '1.5rem' }}>
        {data.matches.map(m => {
          const acc = m.academician;
          const scoreColor = m.similarity_score > 70 ? 'var(--success)' : m.similarity_score > 40 ? 'var(--accent-primary)' : 'var(--warning)';

          return (
            <div
              key={acc.id}
              className="card-glass"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-primary)'
              }}
            >
              <div>
                {/* Header: Name, Title & Score */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {acc.photo_url ? (
                      <img src={acc.photo_url} alt={acc.full_name} style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(56,149,255,0.15)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                        {acc.full_name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h4
                        onClick={() => onNavigateAcademician(acc.id)}
                        style={{ fontSize: '1.05rem', margin: 0, cursor: 'pointer', color: 'var(--text-primary)' }}
                        className="hover-underline"
                      >
                        {acc.title} {acc.full_name}
                      </h4>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>
                        {acc.faculty_name} — {acc.department_name}
                      </span>
                    </div>
                  </div>

                  {/* MATCH % BADGE */}
                  <div style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '20px',
                    background: 'rgba(56, 149, 255, 0.15)',
                    border: `1px solid ${scoreColor}`,
                    color: scoreColor,
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}>
                    <Award size={14} />
                    <span>%{m.similarity_score} Uyum</span>
                  </div>
                </div>

                {/* COMMON TAGS OVERLAP */}
                {m.common_tags && m.common_tags.length > 0 && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase' }}>
                      🎯 Örtüşen Uzmanlık Alanları ({m.common_tags.length}):
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {m.common_tags.map(t => (
                        <span key={t.id} className="badge badge-tag" style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem' }}>
                          ✓ {t.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* FOOTER ACTIONS */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => onNavigateAcademician(acc.id)}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '0.55rem 0.85rem', fontSize: '0.82rem', justifyContent: 'center' }}
                >
                  Profil İncele
                </button>

                <button
                  onClick={() => handleQuickInvite(acc.id, acc.full_name)}
                  disabled={invitingId === acc.id || invitedMap[acc.id]}
                  className="btn-primary"
                  style={{ flex: 1, padding: '0.55rem 0.85rem', fontSize: '0.82rem', justifyContent: 'center' }}
                >
                  {invitedMap[acc.id] ? (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Davet Edildi</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>{invitingId === acc.id ? 'Gönderiliyor...' : 'Hızlı Davet Et'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
