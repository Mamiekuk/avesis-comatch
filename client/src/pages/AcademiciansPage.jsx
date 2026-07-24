import React, { useState, useEffect } from 'react';
import { fetchAcademicians, fetchMetadata, fetchKMeansClusters } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Search, Filter, LayoutGrid, List, ChevronLeft, ChevronRight, ExternalLink, CheckCircle2, AlertCircle, Award, UserPlus, X, Sparkles } from 'lucide-react';

const cleanClusterName = (name) => {
  if (!name) return '';
  return name
    .replace(/ Akademik Yaylası \(Rize Yöresi\)/gi, ' Akademik Kümesi')
    .replace(/ Akademik Yaylası/gi, ' Akademik Kümesi')
    .replace(/ Yaylası/gi, ' Kümesi')
    .replace(/ \(Rize Yöresi\)/gi, '')
    .replace(/ Rize Yöresi/gi, '');
};

export default function AcademiciansPage({ onNavigate, onOpenLogin, user }) {
  const { token } = useAuth();
  const [academicians, setAcademicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState({ faculties: [], departments: [], research_areas: [], titles: [] });
  const [kmeansSummary, setKmeansSummary] = useState({ tagClusters: [], metricClusters: [] });

  // Filters State
  const [search, setSearch] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedTitle, setSelectedTitle] = useState('');
  const [claimedOnly, setClaimedOnly] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]); // Array of tag objects {id, label}
  const [tagSearchInput, setTagSearchInput] = useState('');
  const [selectedMetricCluster, setSelectedMetricCluster] = useState('');
  const [selectedTagCluster, setSelectedTagCluster] = useState('');
  const [sort, setSort] = useState('name_asc');

  // View Mode & Pagination
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [pagination, setPagination] = useState({ total: 1234, page: 1, limit: 24, totalPages: 52 });

  useEffect(() => {
    fetchMetadata().then(d => setMetadata(d)).catch(() => {});
    fetchKMeansClusters().then(d => setKmeansSummary(d)).catch(() => {});
  }, []);

  const loadData = (pageNo = 1) => {
    setLoading(true);
    const tagIds = selectedTags.map(t => t.id).join(',');
    fetchAcademicians({
      search,
      faculty_id: selectedFaculty,
      department_id: selectedDept,
      title: selectedTitle,
      tag_ids: tagIds,
      claimed_only: claimedOnly ? '1' : '',
      metric_cluster: selectedMetricCluster,
      tag_cluster: selectedTagCluster,
      sort,
      page: pageNo,
      limit: 24
    }, token)
      .then(d => {
        setAcademicians(d.academicians || []);
        if (d.pagination) setPagination(d.pagination);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData(1);
  }, [selectedFaculty, selectedDept, selectedTitle, claimedOnly, sort, selectedTags, selectedMetricCluster, selectedTagCluster]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData(1);
  };

  const addTagFilter = (tag) => {
    if (!selectedTags.some(t => t.id === tag.id)) {
      setSelectedTags(prev => [...prev, tag]);
    }
    setTagSearchInput('');
  };

  const removeTagFilter = (tagId) => {
    setSelectedTags(prev => prev.filter(t => t.id !== tagId));
  };

  const filteredTagSuggestions = tagSearchInput.trim()
    ? (metadata.research_areas || []).filter(ra => 
        ra.label.toLowerCase().includes(tagSearchInput.toLowerCase()) &&
        !selectedTags.some(st => st.id === ra.id)
      ).slice(0, 8)
    : [];

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '2.5rem 2rem 5rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2.4rem', marginBottom: '0.4rem' }}>
            Kayıtlı Akademisyenler <span style={{ color: 'var(--accent-primary)', fontSize: '1.4rem' }}>({pagination.total.toLocaleString('tr-TR')})</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            RTEÜ akademisyenlerini, araştırma alanlarını ve projelerini keşfedin.
          </p>
        </div>

        {/* View Toggle */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.35rem', borderRadius: 'var(--radius-md)' }}>
          <button
            onClick={() => setViewMode('grid')}
            style={{
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: viewMode === 'grid' ? 'var(--accent-primary)' : 'transparent',
              color: viewMode === 'grid' ? '#fff' : 'var(--text-secondary)'
            }}
          >
            <LayoutGrid size={17} />
            <span>Kart Görünümü</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            style={{
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: viewMode === 'list' ? 'var(--accent-primary)' : 'transparent',
              color: viewMode === 'list' ? '#fff' : 'var(--text-secondary)'
            }}
          >
            <List size={17} />
            <span>Liste Görünümü</span>
          </button>
        </div>
      </div>

      {/* ADVANCED FILTER PANEL */}
      <div className="card-glass" style={{ marginBottom: '2.5rem', padding: '1.75rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
          {/* Search Bar */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              İsim veya Unvanla Ara
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Örn: Murat Yaylacı..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button type="submit" style={{ position: 'absolute', right: '10px', top: '10px', color: 'var(--accent-primary)' }}>
                <Search size={18} />
              </button>
            </div>
          </div>

          {/* Faculty Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Fakülte / Yüksekokul ({metadata.faculties.length})
            </label>
            <select
              className="form-select"
              value={selectedFaculty}
              onChange={e => { setSelectedFaculty(e.target.value); setSelectedDept(''); }}
            >
              <option value="">Tüm Fakülteler</option>
              {metadata.faculties.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Bölüm
            </label>
            <select
              className="form-select"
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              disabled={!selectedFaculty}
            >
              <option value="">Tüm Bölümler</option>
              {metadata.departments
                .filter(d => String(d.faculty_id) === String(selectedFaculty))
                .map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
            </select>
          </div>

          {/* Title Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Unvan
            </label>
            <select
              className="form-select"
              value={selectedTitle}
              onChange={e => setSelectedTitle(e.target.value)}
            >
              <option value="">Tüm Unvanlar</option>
              {metadata.titles.map((t, idx) => (
                <option key={idx} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Sıralama
            </label>
            <select
              className="form-select"
              value={sort}
              onChange={e => setSort(e.target.value)}
            >
              <option value="name_asc">Ad Soyad (A - Z)</option>
              <option value="richness_desc">Profil Zenginliği (Dolu → Boş)</option>
              <option value="claimed_first">Önce Aktif Profiller</option>
              <option value="joined_desc">Kayıt Numarasına Göre</option>
            </select>
          </div>

          {/* K-Means Metric Cluster Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#e879f9', marginBottom: '0.4rem' }}>
              ⚡ Yapay Zeka Profili
            </label>
            <select
              className="form-select"
              style={{ borderColor: 'rgba(236, 72, 153, 0.4)' }}
              value={selectedMetricCluster}
              onChange={e => setSelectedMetricCluster(e.target.value)}
            >
              <option value="">Tüm Yapay Zeka Profilleri</option>
              {(kmeansSummary.metricClusters || []).map(mc => (
                <option key={mc.id} value={mc.label}>{mc.badge} ({mc.member_count} Araştırmacı)</option>
              ))}
            </select>
          </div>

          {/* K-Means Tag Cluster Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#c084fc', marginBottom: '0.4rem' }}>
              🌐 Akademik Küme
            </label>
            <select
              className="form-select"
              style={{ borderColor: 'rgba(168, 85, 247, 0.4)' }}
              value={selectedTagCluster}
              onChange={e => setSelectedTagCluster(e.target.value)}
            >
              <option value="">Tüm Akademik Kümeler</option>
              {(kmeansSummary.tagClusters || []).map(tc => (
                <option key={tc.id} value={tc.id}>{cleanClusterName(tc.name)} ({tc.member_count} Araştırmacı)</option>
              ))}
            </select>
          </div>
        </form>

        {/* Research Area Autocomplete Tag Picker */}
        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
            Araştırma Alanına Göre Filtrele
          </label>
          <input
            type="text"
            className="form-input"
            placeholder="Etiket adı yazın (Örn: Yapay Zeka, İnşaat, Tıp...)"
            value={tagSearchInput}
            onChange={e => setTagSearchInput(e.target.value)}
          />

          {filteredTagSuggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 50,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-highlight)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-md)',
              marginTop: '4px'
            }}>
              {filteredTagSuggestions.map(tag => (
                <div
                  key={tag.id}
                  onClick={() => addTagFilter(tag)}
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

        {/* Selected Tags Badge Row */}
        {selectedTags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
            {selectedTags.map(tag => (
              <span key={tag.id} className="badge badge-tag" style={{ padding: '0.4rem 0.85rem' }}>
                {tag.label}
                <X size={14} style={{ cursor: 'pointer' }} onClick={() => removeTagFilter(tag.id)} />
              </span>
            ))}
          </div>
        )}

        {/* Toggle Claimed Only Switch */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={claimedOnly}
              onChange={e => setClaimedOnly(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: 'var(--accent-primary)' }}
            />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              Sadece Doğrulanmış / Sahiplenilmiş Aktif Profilleri Göster
            </span>
          </label>

          {(search || selectedFaculty || selectedDept || selectedTitle || selectedTags.length > 0 || claimedOnly) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedFaculty('');
                setSelectedDept('');
                setSelectedTitle('');
                setSelectedTags([]);
                setClaimedOnly(false);
              }}
              style={{ fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 600 }}
            >
              Filtreleri Sıfırlayıp Tümünü Gör
            </button>
          )}
        </div>
      </div>

      {/* CARDS LIST OR GRID */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Akademisyen profilleri yükleniyor...
          </div>
        </div>
      ) : academicians.length === 0 ? (
        <div className="card-glass" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <AlertCircle size={48} color="var(--warning)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Eşleşen Akademisyen Bulunamadı</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Filtreleri sıfırlayarak veya arama kriterini değiştirerek tekrar deneyin.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '1.75rem' }}>
          {academicians.map(item => (
            <div
              key={item.id}
              onClick={() => onNavigate('academician-detail', item.id)}
              className="card-glass"
              style={{
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderLeft: item.is_claimed ? '4px solid var(--success)' : undefined
              }}
            >
              <div>
                {/* Badge Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  {item.is_claimed ? (
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <span className="badge badge-claimed" style={{ margin: 0 }}>
                        <CheckCircle2 size={13} />
                        Aktif Hesap
                      </span>
                      {(!item.collaboration_status || item.collaboration_status === 'open') && (
                        <span className="badge" style={{ margin: 0, padding: '0.15rem 0.5rem', fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                          ● Açık
                        </span>
                      )}
                      {item.collaboration_status === 'looking' && (
                        <span className="badge" style={{ margin: 0, padding: '0.15rem 0.5rem', fontSize: '0.72rem', background: 'rgba(56, 149, 255, 0.15)', color: 'var(--accent-primary)', border: '1px solid rgba(56, 149, 255, 0.3)' }}>
                          ● İş Birliği
                        </span>
                      )}
                      {item.collaboration_status === 'busy' && (
                        <span className="badge" style={{ margin: 0, padding: '0.15rem 0.5rem', fontSize: '0.72rem', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                          ● Yoğun
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="badge badge-unclaimed">
                      Sahiplenilmedi
                    </span>
                  )}

                  {item.has_research_fields === 0 && (
                    <span className="badge" style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--danger)' }}>
                      Alan Yok
                    </span>
                  )}

                  {user && item.match_score > 0 && (
                    <span className="badge" style={{ margin: 0, padding: '0.2rem 0.6rem', fontSize: '0.78rem', background: 'rgba(56, 149, 255, 0.18)', color: 'var(--accent-primary)', border: '1px solid rgba(56, 149, 255, 0.4)', fontWeight: 800 }}>
                      ⚡ %{item.match_score} Uyum
                    </span>
                  )}
                </div>

                {item.metric_cluster && (
                  <div style={{ marginBottom: '0.6rem' }}>
                    <span style={{ fontSize: '0.74rem', background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.18), rgba(236, 72, 153, 0.18))', color: '#e879f9', padding: '0.2rem 0.6rem', borderRadius: '999px', border: '1px solid rgba(236, 72, 153, 0.35)', fontWeight: 600, display: 'inline-block', marginBottom: '0.25rem' }}>
                      {item.metric_cluster.badge}
                    </span>
                    {item.tag_cluster && (
                      <span style={{ fontSize: '0.73rem', color: '#c084fc', display: 'block', fontWeight: 500 }}>
                        🌐 {cleanClusterName(item.tag_cluster.name)}
                      </span>
                    )}
                  </div>
                )}

                {/* Name & Title */}
                <h3 style={{ fontSize: '1.18rem', marginBottom: '0.35rem', lineHeight: 1.35 }}>
                  {item.title} {item.full_name}
                </h3>

                {/* Faculty & Dept */}
                <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.faculty_name}</div>
                  <div>{item.department_name}</div>
                </div>

                {/* Bio snippet if active */}
                {item.bio && item.is_claimed === 1 && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.bio}
                  </p>
                )}

                {/* Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1.25rem' }}>
                  {(item.research_areas || []).slice(0, 4).map(tag => (
                    <span key={tag.id} className="badge badge-tag" style={{ fontSize: '0.72rem' }}>
                      {tag.label}
                    </span>
                  ))}
                  {(item.research_areas || []).length > 4 && (
                    <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                      +{(item.research_areas.length - 4)} daha
                    </span>
                  )}
                </div>
              </div>

              {/* Footer action */}
              <div style={{
                borderTop: '1px solid var(--border-color)',
                paddingTop: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.85rem'
              }}>
                {item.avesis_profile_url && (
                  <a
                    href={item.avesis_profile_url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)' }}
                  >
                    <span>AVESİS Linki</span>
                    <ExternalLink size={13} />
                  </a>
                )}
                <span style={{ color: 'var(--accent-primary)', fontWeight: 600, marginLeft: 'auto' }}>
                  Profili Gör →
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="card-glass" style={{ padding: 0, overflow: 'hidden' }}>
          {academicians.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => onNavigate('academician-detail', item.id)}
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: idx === academicians.length - 1 ? 'none' : '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                cursor: 'pointer',
                transition: 'background 150ms'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(56,149,255,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.3rem' }}>
                  <h4 style={{ fontSize: '1.1rem' }}>{item.title} {item.full_name}</h4>
                  {item.is_claimed ? (
                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                      <span className="badge badge-claimed" style={{ fontSize: '0.7rem' }}>Aktif</span>
                      {(!item.collaboration_status || item.collaboration_status === 'open') && (
                        <span className="badge" style={{ padding: '0.1rem 0.4rem', fontSize: '0.68rem', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' }}>
                          ● Açık
                        </span>
                      )}
                      {item.collaboration_status === 'looking' && (
                        <span className="badge" style={{ padding: '0.1rem 0.4rem', fontSize: '0.68rem', background: 'rgba(56, 149, 255, 0.15)', color: 'var(--accent-primary)' }}>
                          ● İş Birliği
                        </span>
                      )}
                      {item.collaboration_status === 'busy' && (
                        <span className="badge" style={{ padding: '0.1rem 0.4rem', fontSize: '0.68rem', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)' }}>
                          ● Yoğun
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="badge badge-unclaimed" style={{ fontSize: '0.7rem' }}>Sahiplenilmedi</span>
                  )}
                  {item.metric_cluster && (
                    <span style={{ fontSize: '0.72rem', background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.18), rgba(236, 72, 153, 0.18))', color: '#e879f9', padding: '0.15rem 0.55rem', borderRadius: '999px', border: '1px solid rgba(236, 72, 153, 0.35)', fontWeight: 600 }}>
                      {item.metric_cluster.badge}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {item.faculty_name} — {item.department_name}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.5rem' }}>
                  {(item.research_areas || []).slice(0, 5).map(tag => (
                    <span key={tag.id} className="badge badge-tag" style={{ fontSize: '0.7rem' }}>
                      {tag.label}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ color: 'var(--accent-primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                Profili İncele →
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PAGINATION */}
      {pagination.totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '1rem',
          marginTop: '3.5rem'
        }}>
          <button
            onClick={() => loadData(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="btn-secondary"
            style={{ padding: '0.6rem 1.25rem', opacity: pagination.page <= 1 ? 0.5 : 1 }}
          >
            <ChevronLeft size={18} />
            <span>Önceki</span>
          </button>

          <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Sayfa {pagination.page} / {pagination.totalPages}
          </span>

          <button
            onClick={() => loadData(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            className="btn-secondary"
            style={{ padding: '0.6rem 1.25rem', opacity: pagination.page >= pagination.totalPages ? 0.5 : 1 }}
          >
            <span>Sonraki</span>
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
