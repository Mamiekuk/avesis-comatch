import React, { useState, useEffect } from 'react';
import { fetchProjectSmartMatches, inviteToProject } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Send, CheckCircle2, Award, UserPlus, Zap } from 'lucide-react';

export default function SmartMatchingPanel({ projectId, onNavigateAcademician }) {
  const { user, token } = useAuth();
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
        {selectedClusterId !== 'ALL' && (
          <button
            onClick={() => setSelectedClusterId('ALL')}
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <span>🌟 Tüm Kümelerde Araştır</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Engine explanation banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(56, 149, 255, 0.15))',
        border: '1px solid rgba(168, 85, 247, 0.35)',
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
          <div style={{ padding: '0.6rem', borderRadius: '50%', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', display: 'flex' }}>
            <Zap size={24} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span>Akıllı Eşleştirme & K-Means Yapay Zeka Motoru</span>
              <span style={{ fontSize: '0.72rem', background: 'rgba(168, 85, 247, 0.2)', color: '#e879f9', padding: '0.15rem 0.6rem', borderRadius: '999px', border: '1px solid rgba(236, 72, 153, 0.3)' }}>
                Denetimsiz Öğrenme + Etiket Vektör Benzerliği
              </span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Projenizin etiketleri ve K-Means disiplinlerarası akademik mahalleniz temel alınarak 1.233 akademisyen analiz edilmiştir.
            </div>
            {data.owner_cluster && (
              <div style={{ fontSize: '0.82rem', color: '#c084fc', marginTop: '0.4rem', fontWeight: 600 }}>
                🌐 Proje Yürütücüsünün K-Means Kümesi: <span style={{ color: 'var(--text-primary)' }}>{data.owner_cluster.name}</span>
              </div>
            )}

            {/* K-Means Cluster Selector Dropdown */}
            <div style={{ marginTop: '0.85rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                🎯 Hedef K-Means Kümesi (Alan Filtresi):
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
                <option value="ALL">🌟 Tüm K-Means Akademik Kümeleri (Ortak Etiketlere Göre)</option>
                {data.all_clusters && data.all_clusters.map(c => (
                  <option key={c.id} value={String(c.id)}>
                    🌐 {c.name} ({c.member_count} Hoca) {data.owner_cluster && data.owner_cluster.id === c.id ? ' [Proje Yürütücüsünün Kümesi]' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="badge badge-claimed" style={{ fontSize: '0.88rem', padding: '0.5rem 1.1rem', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(56, 149, 255, 0.2))', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
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
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-primary)'
              }}
            >
              <div>
                {/* Score & Status Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <div style={{
                    padding: '0.35rem 0.85rem',
                    borderRadius: '9999px',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    background: `${scoreColor}22`,
                    color: scoreColor,
                    border: `1px solid ${scoreColor}44`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}>
                    <span>% {m.match_score} Uyumlu</span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    {acc.is_claimed ? (
                      <span className="badge badge-claimed" style={{ margin: 0 }}>Aktif Profil</span>
                    ) : (
                      <span className="badge badge-unclaimed" style={{ margin: 0 }}>AVESİS Arşivi</span>
                    )}
                  </div>
                </div>

                {/* K-Means Breakdown Pill */}
                <div style={{
                  fontSize: '0.72rem',
                  background: 'rgba(168, 85, 247, 0.08)',
                  border: '1px solid rgba(168, 85, 247, 0.22)',
                  borderRadius: '6px',
                  padding: '0.35rem 0.6rem',
                  marginBottom: '0.85rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.6rem',
                  alignItems: 'center'
                }}>
                  <span style={{ color: '#c084fc', fontWeight: 600 }}>⚡ K-Means Kosinüs Benzerliği: %{m.cosine_similarity_pct !== undefined ? m.cosine_similarity_pct : 0}</span>
                  <span>● Etiket Kesişimi: %{m.overlap_ratio_pct !== undefined ? m.overlap_ratio_pct : 0}</span>
                </div>

                {/* Metric Profile & Cluster Badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.85rem' }}>
                  {m.metric_badge && (
                    <span style={{
                      fontSize: '0.72rem',
                      background: 'rgba(56, 149, 255, 0.12)',
                      color: 'var(--accent-primary)',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '4px',
                      border: '1px solid rgba(56, 149, 255, 0.25)'
                    }}>
                      {m.metric_badge}
                    </span>
                  )}
                  {m.tag_cluster_name && (
                    <span style={{
                      fontSize: '0.72rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--text-secondary)',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '4px'
                    }}>
                      🌐 {m.tag_cluster_name.split(' & ')[0]}
                    </span>
                  )}
                </div>

                {/* Academician Name */}
                <h4
                  onClick={() => onNavigateAcademician(acc.id)}
                  style={{ fontSize: '1.15rem', cursor: 'pointer', marginBottom: '0.3rem', color: 'var(--text-primary)' }}
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
                    {m.common_tags && m.common_tags.map(t => (
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
