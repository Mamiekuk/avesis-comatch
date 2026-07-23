import React, { useState, useEffect } from 'react';
import { fetchMetadata, createProject } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PlusCircle, X, BookOpen, ArrowLeft, Sparkles } from 'lucide-react';

export default function CreateProjectPage({ onNavigate }) {
  const { token, user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [objectives, setObjectives] = useState('BAP');
  const [teamSize, setTeamSize] = useState(4);
  const [duration, setDuration] = useState('24 Ay');
  const [budget, setBudget] = useState('');
  
  // Tag autocomplete
  const [metadataTags, setMetadataTags] = useState([]);
  const [tagSearch, setTagSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMetadata().then(d => setMetadataTags(d.research_areas || [])).catch(() => {});
  }, []);

  const addTag = (tag) => {
    if (!selectedTags.some(t => t.id === tag.id)) {
      setSelectedTags(prev => [...prev, tag]);
    }
    setTagSearch('');
  };

  const removeTag = (id) => {
    setSelectedTags(prev => prev.filter(t => t.id !== id));
  };

  const filteredTags = tagSearch.trim()
    ? metadataTags.filter(t => 
        t.label.toLowerCase().includes(tagSearch.toLowerCase()) &&
        !selectedTags.some(s => s.id === t.id)
      ).slice(0, 8)
    : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return alert('Lütfen oturum açın.');
    if (selectedTags.length === 0) {
      return alert('Akıllı eşleştirme motorunun çalışması için en az 1 araştırma alanı etiketi seçmelisiniz.');
    }

    setLoading(true);
    try {
      const res = await createProject({
        title,
        description,
        objectives,
        teamSize: Number(teamSize),
        duration,
        budget,
        researchAreaIds: selectedTags.map(t => t.id)
      }, token);

      alert('Proje başarıyla oluşturuldu!');
      onNavigate('project-detail', res.projectId);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', padding: '2.5rem 2rem 5rem' }}>
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
            Projenizin ihtiyaçlarını belirleyin, AVESİS Akıllı Eşleştirme Motoru en doğru hocalarımızı önersin.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.92rem', marginBottom: '0.4rem' }}>
              Proje Başlığı *
            </label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="Örn: Doğu Karadeniz Kıyı Yapılarının Hibrit Malzemelerle Güçlendirilmesi"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.92rem', marginBottom: '0.4rem' }}>
              Proje Özet Açıklaması *
            </label>
            <textarea
              rows={4}
              required
              className="form-textarea"
              placeholder="Projenin amacı, kapsamı ve temel hedefi..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Objectives (Başvurulan Proje Selection) */}
          <div style={{ marginBottom: '1.75rem' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.92rem', marginBottom: '0.6rem' }}>
              Başvurulan Proje Türü
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              {['BAP', 'TÜBİTAK', 'Uluslararası', 'Diğer Projeler'].map(opt => (
                <label 
                  key={opt}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'var(--bg-secondary)',
                    border: objectives === opt ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    padding: '0.65rem 1.25rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
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

            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Etiket arayın (Örn: İnşaat Mühendisliği, Biyomekanik, Yapay Zeka...)"
                value={tagSearch}
                onChange={e => setTagSearch(e.target.value)}
              />

              {filteredTags.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 20,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-highlight)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-md)',
                  marginTop: '4px'
                }}>
                  {filteredTags.map(tag => (
                    <div
                      key={tag.id}
                      onClick={() => addTag(tag)}
                      style={{
                        padding: '0.65rem 1rem',
                        borderBottom: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                      }}
                    >
                      + {tag.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {selectedTags.map(tag => (
                <span key={tag.id} className="badge badge-tag" style={{ padding: '0.45rem 0.9rem' }}>
                  {tag.label}
                  <X size={14} style={{ cursor: 'pointer' }} onClick={() => removeTag(tag.id)} />
                </span>
              ))}
            </div>
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

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', padding: '0.95rem' }}
          >
            <PlusCircle size={20} />
            <span>{loading ? 'Yayınlanıyor...' : 'Projeyi Yayınla & Eşleştirmeye Başla'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
