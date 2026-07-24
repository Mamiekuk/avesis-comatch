import React, { useState, useEffect } from 'react';
import { createProject, fetchMetadata } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PlusCircle, ArrowLeft, X, Sparkles, Tag, Save, Check } from 'lucide-react';

export default function CreateProjectPage({ onNavigate }) {
  const { token } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [objectives, setObjectives] = useState('TÜBİTAK 1001');
  const [teamSize, setTeamSize] = useState(4);
  const [duration, setDuration] = useState('18 Ay');
  const [budget, setBudget] = useState('');

  // Tag autocomplete & chips selector
  const [metadataTags, setMetadataTags] = useState([]);
  const [tagSearch, setTagSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);

  useEffect(() => {
    fetchMetadata().then(d => setMetadataTags(d.research_areas || [])).catch(() => {});
  }, []);

  const toggleTag = (tag) => {
    if (selectedTags.some(t => t.id === tag.id)) {
      setSelectedTags(prev => prev.filter(t => t.id !== tag.id));
    } else {
      setSelectedTags(prev => [...prev, tag]);
    }
  };

  const normalizeTR = (str) => {
    if (!str) return '';
    return str.toLowerCase('tr-TR')
      .replace(/i/g, 'i').replace(/ı/g, 'i')
      .replace(/g/g, 'g').replace(/ğ/g, 'g')
      .replace(/u/g, 'u').replace(/ü/g, 'u')
      .replace(/s/g, 's').replace(/ş/g, 's')
      .replace(/o/g, 'o').replace(/ö/g, 'o')
      .replace(/c/g, 'c').replace(/ç/g, 'c');
  };

  const tagSearchNorm = normalizeTR(tagSearch.trim());

  const filteredTags = tagSearchNorm
    ? metadataTags.filter(t => 
        normalizeTR(t.label).includes(tagSearchNorm) &&
        !selectedTags.some(s => s.id === t.id)
      ).slice(0, 15)
    : [];

  // Popular quick tags preview (top 20)
  const popularTags = metadataTags.slice(0, 24);

  const handleSubmit = async (e, projStatus = 'open') => {
    if (e) e.preventDefault();
    if (!token) return alert('Lütfen oturum açın.');
    if (!title.trim() || !description.trim()) {
      return alert('Lütfen proje başlığını ve açıklamasını doldurun.');
    }
    if (selectedTags.length === 0) {
      return alert('Akıllı eşleştirme motorunun çalışması için en az 1 araştırma alanı etiketi seçmelisiniz.');
    }

    if (projStatus === 'open') setLoading(true);
    else setDraftLoading(true);

    try {
      const res = await createProject({
        title,
        description,
        objectives,
        teamSize: Number(teamSize),
        duration,
        budget,
        researchAreaIds: selectedTags.map(t => t.id),
        status: projStatus
      }, token);

      if (projStatus === 'open') {
        alert('🚀 Proje başarıyla yayınlandı ve uyumlu araştırmacılara çağrı duyuruldu!');
        onNavigate('project-detail', res.projectId);
      } else {
        alert('💾 Projeniz taslak olarak kaydedildi. Dilediğiniz zaman Panelim sayfasından düzenleyip yayınlayabilirsiniz.');
        onNavigate('dashboard', { tab: 'projects' });
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
      setDraftLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', padding: '2.5rem 2rem 5rem' }}>
      <button
        onClick={() => onNavigate('projects')}
        className="btn-secondary"
        style={{ marginBottom: '2rem', padding: '0.5rem 1rem', fontSize: '0.88rem' }}
      >
        <ArrowLeft size={16} />
        <span>Projelere Dön</span>
      </button>

      <div className="card-glass" style={{ padding: '2.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.1rem', marginBottom: '0.4rem' }}>Yeni Akademik Proje İlanı</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Projenizin ihtiyaçlarını belirleyin, AVESİS Akıllı Eşleştirme Motoru en doğru araştırmacılarımızı önersin.
          </p>
        </div>

        <form onSubmit={(e) => handleSubmit(e, 'open')}>
          {/* TITLE */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
              Proje Başlığı *
            </label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="Örn: Karadeniz Kıyı Alanlarında İklim Değişikliği Dirençliliği Ve Modellemesi"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          {/* DESCRIPTION */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
              Proje Özeti & Detaylı Açıklama *
            </label>
            <textarea
              required
              rows={4}
              className="form-textarea"
              placeholder="Projenin amacı, kullanılan yöntemler, hedeflenen çıktılar ve ekibe katılacak akademisyenlerden beklenen katkıları detaylandırın..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* PROJECT TYPE / DESTINATION */}
          <div style={{ marginBottom: '1.75rem' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
              Proje Destek Programı / Türü
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {['TÜBİTAK 1001', 'TÜBİTAK 3501', 'TÜBİTAK 1002', 'BAP', 'AB Ufuk Avrupa (Horizon)', 'Uluslararası / Sanayi'].map(opt => (
                <label
                  key={opt}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 0.9rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid',
                    borderColor: objectives === opt ? 'var(--accent-primary)' : 'var(--border-color)',
                    background: objectives === opt ? 'rgba(56, 149, 255, 0.12)' : 'var(--bg-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: objectives === opt ? 700 : 500,
                    color: objectives === opt ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    transition: 'all 0.2s'
                  }}
                >
                  <input
                    type="radio"
                    name="projectType"
                    value={opt}
                    checked={objectives === opt}
                    onChange={e => setObjectives(e.target.value)}
                    style={{ accentColor: 'var(--accent-primary)' }}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>

          {/* RESEARCH AREA TAG PICKER */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-highlight)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            marginBottom: '1.75rem'
          }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.4rem', color: 'var(--accent-primary)' }}>
              🎯 Aranan Araştırma Alanı Etiketleri (Zorunlu — Akıllı Eşleştirme Motoru İçin)
            </label>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
              AVESİS taksonomisindeki ~1.400 etiket arasından yazarak ekleyin.
            </p>

            {/* Tag Search Autocomplete */}
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Arama ile ~1.400 etiket arasında bulun (Örn: Fizik, Biyomekanik...)"
                value={tagSearch}
                onChange={e => setTagSearch(e.target.value)}
              />

              {filteredTags.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 100,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--accent-primary)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
                  maxHeight: '280px',
                  overflowY: 'auto',
                  marginTop: '4px'
                }}>
                  {filteredTags.map(tag => (
                    <div
                      key={tag.id}
                      onClick={() => { toggleTag(tag); setTagSearch(''); }}
                      style={{
                        padding: '0.75rem 1.1rem',
                        borderBottom: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(56, 149, 255, 0.15)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>+</span>
                      <span>{tag.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Tags Display */}
            {selectedTags.length > 0 && (
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  SEÇİLEN ETİKETLER ({selectedTags.length}):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {selectedTags.map(tag => (
                    <span key={tag.id} className="badge badge-tag" style={{ padding: '0.45rem 0.9rem', fontSize: '0.84rem' }}>
                      {tag.label}
                      <X size={14} style={{ cursor: 'pointer', marginLeft: '4px' }} onClick={() => removeTag(tag.id)} />
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Grid Row for Size, Duration, Budget */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.4rem' }}>
                Aranan Ekip Büyüklüğü
              </label>
              <input
                type="number"
                min="2"
                max="20"
                className="form-input"
                value={teamSize}
                onChange={e => setTeamSize(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.4rem' }}>
                Planlanan Süre
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Örn: 18 Ay"
                value={duration}
                onChange={e => setDuration(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.4rem' }}>
                Tahmini Bütçe (Opsiyonel)
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Örn: 1.500.000 TL"
                value={budget}
                onChange={e => setBudget(e.target.value)}
              />
            </div>
          </div>

          {/* Action Buttons: Save Draft vs Publish */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              type="submit"
              disabled={loading || draftLoading}
              className="btn-primary"
              style={{ flex: 2, padding: '0.95rem', minWidth: '220px', justifyContent: 'center' }}
            >
              <PlusCircle size={20} />
              <span>{loading ? 'Yayınlanıyor...' : '🚀 Projeyi Yayınla & Eşleştirmeye Başla'}</span>
            </button>

            <button
              type="button"
              disabled={loading || draftLoading}
              onClick={(e) => handleSubmit(e, 'draft')}
              className="btn-secondary"
              style={{ flex: 1, padding: '0.95rem', minWidth: '180px', justifyContent: 'center' }}
            >
              <Save size={18} color="var(--accent-primary)" />
              <span>{draftLoading ? 'Kaydediliyor...' : '💾 Taslak Olarak Kaydet'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
