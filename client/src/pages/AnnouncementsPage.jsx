import React, { useState, useEffect } from 'react';
import { fetchTubitakCalls } from '../services/api';
import { Megaphone, ExternalLink, Search, ArrowLeft, Sparkles, Building2, Calendar } from 'lucide-react';

export default function AnnouncementsPage({ onNavigate }) {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchTubitakCalls()
      .then(res => setCalls(res.calls || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredCalls = calls.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 2rem 5rem' }}>
      {/* Header Back Button */}
      <button
        onClick={() => onNavigate('home')}
        className="btn-secondary"
        style={{ marginBottom: '2rem', padding: '0.5rem 1rem', fontSize: '0.88rem' }}
      >
        <ArrowLeft size={16} />
        <span>Ana Sayfaya Dön</span>
      </button>

      {/* Hero Banner */}
      <div className="card-glass" style={{ padding: '2.5rem', marginBottom: '2.5rem', border: '1px solid rgba(56, 149, 255, 0.3)', background: 'linear-gradient(135deg, rgba(56, 149, 255, 0.08), rgba(168, 85, 247, 0.08))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{ padding: '0.6rem', borderRadius: '12px', background: 'rgba(56, 149, 255, 0.2)', color: 'var(--accent-primary)' }}>
            <Megaphone size={26} />
          </div>
          <div>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
              Otomatik Web Scraper Entegrasyonu
            </span>
            <h1 style={{ fontSize: '2.2rem', margin: 0, color: 'var(--text-primary)' }}>
              Resmi Çağrı Duyuruları
            </h1>
          </div>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.96rem', marginTop: '0.75rem', maxWidth: '780px' }}>
          TÜBİTAK (tubitak.gov.tr) ve resmi kurumlardan anlık olarak çekilen en güncel açık proje çağrıları. Uzmanlık alanlarınıza uygun çağrılara başvurabilir veya AVESİS CoMatch üzerinde yeni proje ekibi kurabilirsiniz.
        </p>

        {/* Search Bar */}
        <div style={{ marginTop: '1.75rem', position: 'relative', maxWidth: '520px' }}>
          <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Çağrı başlığı veya anahtar kelime ara (Örn: 1001, Yapay Zeka, Sanayi...)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.8rem' }}
          />
        </div>
      </div>

      {/* Calls Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
          Resmi TÜBİTAK çağrıları yükleniyor...
        </div>
      ) : filteredCalls.length === 0 ? (
        <div className="card-glass" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Megaphone size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Çağrı Bulunamadı</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Arama kriterinize uygun aktif bir TÜBİTAK açık çağrısı bulunmamaktadır.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {filteredCalls.map(c => (
            <div
              key={c.id}
              className="card-glass"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '1.5rem',
                border: '1px solid var(--border-color)',
                transition: 'all 0.25s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--accent-primary)';
                e.currentTarget.style.transform = 'translateY(-3px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                  <span className="badge" style={{ background: 'rgba(56, 149, 255, 0.15)', color: 'var(--accent-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Building2 size={13} />
                    <span>{c.source || 'TÜBİTAK'} Resmi Açık Çağrı</span>
                  </span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Calendar size={12} />
                    <span>{new Date(c.created_at).toLocaleDateString('tr-TR')}</span>
                  </span>
                </div>

                <h3 style={{ fontSize: '1.12rem', fontWeight: 700, lineHeight: 1.4, color: 'var(--text-primary)', marginBottom: '1rem' }}>
                  {c.title}
                </h3>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                  style={{ flex: 1, textDecoration: 'none', padding: '0.55rem 0.85rem', fontSize: '0.85rem', justifyContent: 'center' }}
                >
                  <span>Resmi İlanı İncele</span>
                  <ExternalLink size={15} />
                </a>

                <button
                  onClick={() => onNavigate('create-project')}
                  className="btn-secondary"
                  title="Bu Çağrı İçin Proje İlanı Oluştur"
                  style={{ padding: '0.55rem 0.85rem', fontSize: '0.85rem' }}
                >
                  <Sparkles size={15} color="var(--accent-primary)" />
                  <span>Proje Başlat</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
