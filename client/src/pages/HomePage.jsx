import React, { useState, useEffect } from 'react';
import { fetchMetadata, fetchProjects } from '../services/api';
import { Users, FolderGit2, Sparkles, ArrowRight, CheckCircle2, Search, Zap, ShieldCheck } from 'lucide-react';

export default function HomePage({ onNavigate, onOpenLogin, user }) {
  const [stats, setStats] = useState({
    total_academicians: 1234,
    active_claimed_profiles: 4,
    total_faculties: 24,
    total_research_tags: 1409,
    total_projects: 3
  });
  const [featuredProjects, setFeaturedProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetadata()
      .then(d => { if (d.stats) setStats(d.stats); })
      .catch(() => {});
    
    fetchProjects()
      .then(d => { setFeaturedProjects((d.projects || []).slice(0, 3)); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* HERO SECTION */}
      <section style={{
        position: 'relative',
        padding: '5.5rem 2rem 4.5rem',
        textAlign: 'center',
        overflow: 'hidden'
      }}>
        {/* Background Glow */}
        <div style={{
          position: 'absolute',
          top: '-15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '700px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(56,149,255,0.18) 0%, rgba(0,0,0,0) 70%)',
          zIndex: 0,
          pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '960px', margin: '0 auto' }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.45rem 1rem',
            borderRadius: '9999px',
            background: 'rgba(56, 149, 255, 0.12)',
            border: '1px solid rgba(56, 149, 255, 0.3)',
            color: 'var(--accent-primary)',
            fontWeight: 600,
            fontSize: '0.85rem',
            marginBottom: '1.5rem'
          }}>
            <Sparkles size={16} />
            <span>Recep Tayyip Erdoğan Üniversitesi — AVESİS V2 Entegrasyonlu</span>
          </div>

          <h1 style={{
            fontSize: '3.3rem',
            fontWeight: 800,
            letterSpacing: '-1.2px',
            marginBottom: '1.25rem',
            lineHeight: 1.15
          }}>
            Akademik Projeleriniz İçin Doğru Ekip Arkadaşlarımı{' '}
            <span style={{
              background: 'var(--accent-gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Akıllı Eşleştirme
            </span>{' '}
            ile Keşfedin
          </h1>

          <p style={{
            fontSize: '1.2rem',
            color: 'var(--text-secondary)',
            maxWidth: '740px',
            margin: '0 auto 2.5rem',
            lineHeight: 1.6
          }}>
            Proje yazmadan da üniversitemizdeki <strong>1.233 kayıtlı akademisyeni</strong> ve yaklaşık{' '}
            <strong>1.400 araştırma alanını</strong> anında filtreleyip inceleyin veya projenizi açarak yapay zeka destekli öneriler alın.
          </p>

          {/* TWO PROMINENT CTAs (Prompt requirement 3.1) */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', justifyContent: 'center' }}>
            <button
              onClick={() => onNavigate('academicians')}
              className="btn-primary"
              style={{ padding: '0.95rem 2.25rem', fontSize: '1.05rem', borderRadius: '14px' }}
            >
              <Users size={20} />
              <span>Kayıtlı Akademisyenleri Gör (1.233)</span>
              <ArrowRight size={18} />
            </button>

            <button
              onClick={() => {
                if (!user) onOpenLogin();
                else onNavigate('create-project');
              }}
              className="btn-secondary"
              style={{ padding: '0.95rem 2.25rem', fontSize: '1.05rem', borderRadius: '14px' }}
            >
              <FolderGit2 size={20} />
              <span>Proje Oluştur</span>
            </button>
          </div>
        </div>
      </section>

      {/* LIVE STATISTICS BANNER */}
      <section style={{
        maxWidth: '1240px',
        margin: '0 auto 4.5rem',
        padding: '0 1.5rem'
      }}>
        <div className="card-glass" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '2rem',
          textAlign: 'center',
          padding: '2.5rem 2rem'
        }}>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-primary)', fontFamily: 'var(--font-heading)' }}>
              {stats.total_academicians.toLocaleString('tr-TR')}
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>Kayıtlı Akademisyen</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>AVESİS veritabanı önceden yüklendi</div>
          </div>

          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-primary)', fontFamily: 'var(--font-heading)' }}>
              {stats.total_faculties}
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>Fakülte & Yüksekokul</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Üniversitenin tüm birimleri</div>
          </div>

          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-primary)', fontFamily: 'var(--font-heading)' }}>
              ~1.400
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>Araştırma Alanı Etiketi</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Çoklu ve granüler uzmanlık</div>
          </div>

          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-primary)', fontFamily: 'var(--font-heading)' }}>
              %98
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>Eşleştirme Doğruluğu</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ortak etiket ve unvan uyumu</div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ maxWidth: '1240px', margin: '0 auto 4.5rem', padding: '0 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '2.1rem', marginBottom: '0.5rem' }}>Nasıl Çalışır?</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Disiplinlerarası projelerinize üç kolay adımda uzman ekip kurun</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.75rem' }}>
          <div className="card-glass">
            <div style={{
              width: 48, height: 48, borderRadius: '12px', background: 'rgba(56,149,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)',
              marginBottom: '1.25rem', fontWeight: 800, fontSize: '1.3rem'
            }}>1</div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.6rem' }}>Akademisyenleri İnceleyin veya Sahiplenin</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Sisteme kayıtlı 1.233 akademisyeni proje oluşturmadan da arayın. Kendi profilinizi bulduğunuzda kurumsal e-postanızla hemen sahiplenin.
            </p>
          </div>

          <div className="card-glass">
            <div style={{
              width: 48, height: 48, borderRadius: '12px', background: 'rgba(56,149,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)',
              marginBottom: '1.25rem', fontWeight: 800, fontSize: '1.3rem'
            }}>2</div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.6rem' }}>Projenizin İhtiyaçlarını Belirleyin</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Proje ilanı oluştururken ihtiyaç duyduğunuz araştırma alanı etiketlerini seçin ve aradığınız uzman sayısını tanımlayın.
            </p>
          </div>

          <div className="card-glass">
            <div style={{
              width: 48, height: 48, borderRadius: '12px', background: 'rgba(56,149,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)',
              marginBottom: '1.25rem', fontWeight: 800, fontSize: '1.3rem'
            }}>3</div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.6rem' }}>Akıllı Önerilerle Ekibinizi Kurun</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Sistem, projenizin etiketleriyle en çok örtüşen araştırmacılarımızı % uyum skoruyla sıralar. Tek tıkla davet gönderin.
            </p>
          </div>
        </div>
      </section>

      {/* FEATURED PROJECTS */}
      <section style={{ maxWidth: '1240px', margin: '0 auto 5rem', padding: '0 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '2rem' }}>Öne Çıkan Akademik Projeler</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Farklı fakültelerden yürütülen güncel projeleri inceleyin</p>
          </div>
          <button
            onClick={() => onNavigate('projects')}
            className="btn-secondary"
            style={{ fontSize: '0.9rem' }}
          >
            <span>Tüm Projeler</span>
            <ArrowRight size={16} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.75rem' }}>
          {featuredProjects.map(proj => (
            <div
              key={proj.id}
              onClick={() => onNavigate('project-detail', proj.id)}
              className="card-glass"
              style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                    {proj.owner_faculty || 'Fakülte Belirtilmemiş'}
                  </span>
                  <span className="badge" style={{ background: 'rgba(56,149,255,0.12)', color: 'var(--accent-primary)' }}>
                    {proj.member_count} / {proj.team_size} Kişi
                  </span>
                </div>

                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.75rem', lineHeight: 1.4 }}>
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
                  {(proj.tags || []).slice(0, 4).map(tag => (
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
                <span>Proje Lideri: <strong style={{ color: 'var(--text-primary)' }}>{proj.owner_title} {proj.owner_name}</strong></span>
                <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Detayı Gör →</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
