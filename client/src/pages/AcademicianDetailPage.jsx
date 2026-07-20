import React, { useState, useEffect } from 'react';
import { fetchAcademicianById, inviteToProject, fetchDashboard, fetchKMeansNeighbors } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ExternalLink, CheckCircle2, ShieldAlert, Award, Send, UserCheck, ArrowLeft, Building2, BookOpen, MessageSquare } from 'lucide-react';

export default function AcademicianDetailPage({ id, onNavigate, onOpenClaimModal }) {
  const { user, token } = useAuth();
  const [data, setData] = useState(null);
  const [neighbors, setNeighbors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Invite Modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [myProjects, setMyProjects] = useState([]);
  const [hasNoProjects, setHasNoProjects] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [inviteMsg, setInviteMsg] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchAcademicianById(id).catch(() => null),
      fetchKMeansNeighbors(id).catch(() => ({ neighbors: [] }))
    ]).then(([d, nRes]) => {
      if (d) setData(d);
      if (nRes && nRes.neighbors) setNeighbors(nRes.neighbors);
    }).finally(() => setLoading(false));
  }, [id]);

  const openInviteModal = () => {
    if (!token) return;
    fetchDashboard(token).then(res => {
      const projs = res.myProjects || [];
      setHasNoProjects(projs.length === 0);
      
      const alreadyInIds = (data && data.projects) ? data.projects.map(p => p.id) : [];
      const eligibleProjs = projs.filter(p => !alreadyInIds.includes(p.id));
      setMyProjects(eligibleProjs);
      if (eligibleProjs.length > 0) {
        setSelectedProjectId(eligibleProjs[0].id);
      } else {
        setSelectedProjectId('');
      }
      setInviteModalOpen(true);
    });
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    try {
      await inviteToProject(selectedProjectId, data.academician.id, inviteMsg, token);
      setInviteSuccess(true);
      setTimeout(() => {
        setInviteModalOpen(false);
        setInviteSuccess(false);
      }, 1500);
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '6rem' }}>
        <div style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Profil bilgileri yükleniyor...</div>
      </div>
    );
  }

  if (!data || !data.academician) {
    return (
      <div style={{ textAlign: 'center', padding: '6rem' }}>
        <h3>Akademisyen bulunamadı.</h3>
      </div>
    );
  }

  const { academician, projects } = data;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 2rem 5rem' }}>
      <button
        onClick={() => onNavigate('academicians')}
        className="btn-secondary"
        style={{ marginBottom: '2rem', padding: '0.5rem 1rem', fontSize: '0.88rem' }}
      >
        <ArrowLeft size={16} />
        <span>Geri Dön: Kayıtlı Akademisyenler</span>
      </button>

      {/* HEADER CARD */}
      <div className="card-glass" style={{ marginBottom: '2.5rem', padding: '2.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'flex-start' }}>
          {/* Avatar */}
          <div style={{
            width: 110,
            height: 110,
            borderRadius: '24px',
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
            fontWeight: 800,
            color: '#fff',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-glow)'
          }}>
            {academician.photo_url ? (
              <img src={academician.photo_url} alt={academician.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              academician.full_name.charAt(0)
            )}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h1 style={{ fontSize: '2.2rem' }}>
                {academician.title} {academician.full_name}
              </h1>

              {academician.is_claimed ? (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="badge badge-claimed" style={{ margin: 0 }}>
                    <CheckCircle2 size={14} />
                    Doğrulanmış Aktif Profil
                  </span>
                  {(!academician.collaboration_status || academician.collaboration_status === 'open') && (
                    <span className="badge" style={{ margin: 0, background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                      ● Projelere Açık
                    </span>
                  )}
                  {academician.collaboration_status === 'looking' && (
                    <span className="badge" style={{ margin: 0, background: 'rgba(56, 149, 255, 0.15)', color: 'var(--accent-primary)', border: '1px solid rgba(56, 149, 255, 0.3)' }}>
                      ● İş Birliğine Hazır
                    </span>
                  )}
                  {academician.collaboration_status === 'busy' && (
                    <span className="badge" style={{ margin: 0, background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                      ● Yoğun (Projeye Kapalı)
                    </span>
                  )}
                </div>
              ) : (
                <span className="badge badge-unclaimed">
                  AVESİS Arşiv Profili — Henüz Sahiplenilmedi
                </span>
              )}

              {academician.metric_cluster && (
                <span className="badge" style={{ margin: 0, background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2))', color: '#e879f9', border: '1px solid rgba(236, 72, 153, 0.4)', fontWeight: 600 }}>
                  {academician.metric_cluster.badge} (Yapay Zeka Profili)
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Building2 size={17} color="var(--accent-primary)" />
                <span>{academician.faculty_name} — {academician.department_name}</span>
              </div>

              {academician.avesis_profile_url && (
                <a
                  href={academician.avesis_profile_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-primary)', fontWeight: 600 }}
                >
                  <span>Resmi AVESİS Sayfası</span>
                  <ExternalLink size={15} />
                </a>
              )}
            </div>

            {academician.bio && (
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                {academician.bio}
              </p>
            )}

            {/* CTA Buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              {!academician.is_claimed && (
                <button
                  onClick={() => onOpenClaimModal(academician)}
                  className="btn-primary"
                  style={{ background: 'linear-gradient(135deg, hsl(38, 92%, 50%), hsl(25, 95%, 53%))' }}
                >
                  <UserCheck size={18} />
                  <span>Bu Sizin Profiliniz mi? Hemen Sahiplenin (@erdogan.edu.tr)</span>
                </button>
              )}

              {user && user.id !== academician.id && (
                <>
                  <button onClick={openInviteModal} className="btn-primary">
                    <Send size={18} />
                    <span>Projeme Davet Et</span>
                  </button>

                  <button
                    onClick={() => onNavigate('dashboard', { tab: 'chat', contact: academician })}
                    className="btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <MessageSquare size={18} color="var(--accent-primary)" />
                    <span>Mesaj Gönder</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ACADEMIC METRICS SECTION */}
      <div className="card-glass" style={{ marginBottom: '2.5rem', padding: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <Award size={22} color="var(--accent-primary)" />
          <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Akademik Performans Metrikleri</h2>
        </div>

        {/* Top Summary Badges */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            background: 'rgba(56, 149, 255, 0.05)',
            border: '1px solid rgba(56, 149, 255, 0.15)',
            borderRadius: '16px',
            padding: '1.25rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Toplam Yayın</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
              {academician.pub_total || 0}
            </div>
          </div>
          
          <div style={{
            background: 'rgba(236, 72, 153, 0.05)',
            border: '1px solid rgba(236, 72, 153, 0.15)',
            borderRadius: '16px',
            padding: '1.25rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Proje Sayısı</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'rgb(236, 72, 153)' }}>
              {academician.project_count || 0}
            </div>
          </div>

          <div style={{
            background: 'rgba(16, 185, 129, 0.05)',
            border: '1px solid rgba(16, 185, 129, 0.15)',
            borderRadius: '16px',
            padding: '1.25rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Tez Danışmanlığı</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'rgb(16, 185, 129)' }}>
              {academician.thesis_advising || 0}
            </div>
          </div>

          <div style={{
            background: 'rgba(245, 158, 11, 0.05)',
            border: '1px solid rgba(245, 158, 11, 0.15)',
            borderRadius: '16px',
            padding: '1.25rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Açık Erişim</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'rgb(245, 158, 11)' }}>
              {academician.open_access || 0}
            </div>
          </div>
        </div>

        {/* Detailed Metrics Table/Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem'
        }}>
          {/* Web of Science & Scopus */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', color: 'var(--text-primary)' }}>
              Web of Science & Scopus
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>WoS Yayın Sayısı</span>
                <span style={{ fontWeight: 600 }}>{academician.pub_wos || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>WoS Atıf Sayısı</span>
                <span style={{ fontWeight: 600 }}>{academician.cite_wos || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>WoS H-İndeksi</span>
                <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{academician.h_index_wos || 0}</span>
              </div>
              <hr style={{ border: 'none', borderTop: '1px dashed var(--border-color)', margin: '0.25rem 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Scopus Yayın Sayısı</span>
                <span style={{ fontWeight: 600 }}>{academician.pub_scopus || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Scopus Atıf Sayısı</span>
                <span style={{ fontWeight: 600 }}>{academician.cite_scopus || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Scopus H-İndeksi</span>
                <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{academician.h_index_scopus || 0}</span>
              </div>
            </div>
          </div>

          {/* Google Scholar & National Indexes */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', color: 'var(--text-primary)' }}>
              Google Scholar & Ulusal Dizinler
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Scholar Atıf Sayısı</span>
                <span style={{ fontWeight: 600 }}>{academician.cite_scholar || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Scholar H-İndeksi</span>
                <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{academician.h_index_scholar || 0}</span>
              </div>
              <hr style={{ border: 'none', borderTop: '1px dashed var(--border-color)', margin: '0.25rem 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>TR Dizin Atıf</span>
                <span style={{ fontWeight: 600 }}>{academician.cite_tr_dizin || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>TR Dizin H-İndeksi</span>
                <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{academician.h_index_tr_dizin || 0}</span>
              </div>
              <hr style={{ border: 'none', borderTop: '1px dashed var(--border-color)', margin: '0.25rem 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Sobiad Atıf</span>
                <span style={{ fontWeight: 600 }}>{academician.cite_sobiad || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Sobiad H-İndeksi</span>
                <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{academician.h_index_sobiad || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Other Metrics */}
        {academician.other_metrics && (
          <div style={{
            marginTop: '1.5rem',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed var(--border-color)',
            borderRadius: '12px',
            padding: '1.25rem',
            fontSize: '0.9rem',
            color: 'var(--text-secondary)'
          }}>
            <strong>Diğer Akademik Metrikler:</strong> {academician.other_metrics}
          </div>
        )}
      </div>

      {/* RESEARCH AREAS SECTION */}
      <div className="card-glass" style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <BookOpen size={22} color="var(--accent-primary)" />
          <h2 style={{ fontSize: '1.5rem' }}>Araştırma ve Uzmanlık Alanları</h2>
        </div>

        {academician.has_research_fields === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>
            Bu akademisyen için AVESİS sisteminde araştırma alanı etiketi belirtilmemiştir.
          </p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
            {(academician.research_areas || []).map(tag => (
              <span key={tag.id} className="badge badge-tag" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
                {tag.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* K-MEANS AKADEMİK MAHALLE & BENZER HOCALAR SECTION */}
      {academician.tag_cluster && (
        <div className="card-glass" style={{ marginBottom: '2.5rem', border: '1px solid rgba(168, 85, 247, 0.3)', background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.04), rgba(56, 149, 255, 0.04))' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: '50%', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', display: 'flex' }}>
                <UserCheck size={22} />
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Yapay Zeka K-Means Kümelemesi</span>
                <h2 style={{ fontSize: '1.45rem', margin: 0, color: 'var(--text-primary)' }}>
                  Akademik Mahalle: <span style={{ color: '#c084fc' }}>{academician.tag_cluster.name}</span>
                </h2>
              </div>
            </div>
            {academician.metric_cluster && (
              <span style={{ padding: '0.4rem 0.9rem', borderRadius: '999px', background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6', border: '1px solid rgba(236, 72, 153, 0.3)', fontSize: '0.88rem', fontWeight: 600 }}>
                {academician.metric_cluster.badge}
              </span>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.94rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            K-Means denetimsiz yapay zeka öğrenme algoritması, {academician.title} {academician.full_name} isimli akademisyenin araştırma alanı vektörlerini analiz ederek <strong>{academician.tag_cluster.name}</strong> kümesine (mahallesine) yerleştirmiştir. Aşağıda aynı mahallede yer alan ve interdisipliner iş birliği potansiyeli en yüksek benzer meslektaşları görebilirsiniz:
          </p>

          {neighbors.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>Bu mahallede henüz başka benzer akademisyen bulunamadı.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {neighbors.map(nb => (
                <div
                  key={nb.id}
                  onClick={() => onNavigate('academician-detail', nb.id)}
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#c084fc'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'none'; }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #a855f7, #3b82f6)',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1rem', flexShrink: 0, overflow: 'hidden'
                      }}>
                        {nb.photo_url ? (
                          <img src={nb.photo_url} alt={nb.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          nb.full_name.charAt(0)
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ fontSize: '1rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {nb.title} {nb.full_name}
                        </h4>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {nb.faculty_name}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.8rem' }}>
                      {(nb.research_areas || []).map(ra => (
                        <span key={ra.id} style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.5rem', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                          {ra.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.6rem', marginTop: 'auto' }}>
                    <span style={{ fontSize: '0.78rem', color: '#c084fc', fontWeight: 600 }}>
                      ⚡ %{nb.similarity_score} Mahalle Benzerliği
                    </span>
                    <span style={{ fontSize: '0.75rem', background: 'rgba(168, 85, 247, 0.12)', color: '#e879f9', padding: '0.2rem 0.5rem', borderRadius: '999px' }}>
                      {nb.metric_badge}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PROJECTS SECTION */}
      <div className="card-glass">
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.25rem' }}>Yer Aldığı veya Yürüttüğü Projeler</h2>
        {projects.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Sistemde kayıtlı henüz bir proje kaydı bulunmamaktadır.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {projects.map(p => (
              <div
                key={p.id}
                onClick={() => onNavigate('project-detail', p.id)}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className="badge" style={{ background: 'rgba(56,149,255,0.15)', color: 'var(--accent-primary)' }}>
                    {p.member_role === 'leader' ? 'Proje Lideri' : 'Araştırmacı'}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.duration || ''}</span>
                </div>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{p.title}</h4>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{p.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* INVITE MODAL */}
      {inviteModalOpen && (
        <div className="modal-overlay" onClick={() => setInviteModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.35rem', marginBottom: '1rem' }}>Projeye Davet Gönder</h3>
            {hasNoProjects ? (
              <p style={{ color: 'var(--text-secondary)' }}>
                Önce bir proje oluşturmanız gerekmektedir.
              </p>
            ) : myProjects.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>
                Bu akademisyen zaten oluşturduğunuz tüm projelerde yer almaktadır.
              </p>
            ) : (
              <form onSubmit={handleSendInvite}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Projenizi Seçin
                  </label>
                  <select
                    className="form-select"
                    value={selectedProjectId}
                    onChange={e => setSelectedProjectId(e.target.value)}
                  >
                    {myProjects.map(mp => (
                      <option key={mp.id} value={mp.id}>{mp.title}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Davet Mesajınız
                  </label>
                  <textarea
                    rows={3}
                    className="form-textarea"
                    placeholder="Hocama projenizdeki rolünü ve davet nedeninizi belirtin..."
                    value={inviteMsg}
                    onChange={e => setInviteMsg(e.target.value)}
                  />
                </div>

                {inviteSuccess ? (
                  <div style={{ padding: '0.85rem', background: 'var(--success-bg)', color: 'var(--success)', borderRadius: '8px', textAlign: 'center' }}>
                    ✓ Davet başarıyla gönderildi!
                  </div>
                ) : (
                  <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                    Daveti İlet
                  </button>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
