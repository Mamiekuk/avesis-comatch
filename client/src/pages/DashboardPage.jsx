import React, { useState, useEffect } from 'react';
import { fetchDashboard, respondToInvitation, fetchMetadata, updateUserProfile } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, FolderGit2, Mail, Bell, CheckCircle2, XCircle, ArrowRight, Sparkles, Building2, Edit3, Save, X, Plus, BookOpen, AlertCircle } from 'lucide-react';

export default function DashboardPage({ onNavigate }) {
  const { user, token, updateUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('projects'); // 'projects' | 'requests' | 'notifications' | 'edit-profile'

  // Edit Profile & Research Areas State
  const [editTitle, setEditTitle] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editPhoto, setEditPhoto] = useState('');
  const [editAvesisUrl, setEditAvesisUrl] = useState('');
  const [editTags, setEditTags] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [tagSearchInput, setTagSearchInput] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const loadData = () => {
    if (!token) return;
    setLoading(true);
    fetchDashboard(token)
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    fetchMetadata()
      .then(d => setAllTags(d.research_areas || []))
      .catch(() => {});
  }, [token]);

  // Sync user info into edit form whenever user or tab changes
  useEffect(() => {
    if (user) {
      setEditTitle(user.title || '');
      setEditBio(user.bio || '');
      setEditPhoto(user.photo_url || '');
      setEditAvesisUrl(user.avesis_profile_url || '');
      setEditTags(user.research_areas || []);
    }
  }, [user]);

  const handleResponse = async (invId, status) => {
    try {
      await respondToInvitation(invId, status, token);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const addTagToEdit = (tagObj) => {
    if (!editTags.some(t => t.id === tagObj.id)) {
      setEditTags(prev => [...prev, tagObj]);
    }
    setTagSearchInput('');
  };

  const removeTagFromEdit = (tagId) => {
    setEditTags(prev => prev.filter(t => t.id !== tagId));
  };

  const filteredTagSuggestions = tagSearchInput.trim()
    ? allTags.filter(t => 
        t.label.toLowerCase().includes(tagSearchInput.toLowerCase()) &&
        !editTags.some(st => st.id === t.id)
      ).slice(0, 10)
    : [];

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    setSaveMsg(null);
    setSaveError(null);

    try {
      const res = await updateUserProfile({
        title: editTitle,
        bio: editBio,
        photo_url: editPhoto,
        avesis_profile_url: editAvesisUrl,
        researchAreaIds: editTags.map(t => t.id)
      }, token);

      if (res.user) {
        updateUser(res.user);
      }
      setSaveMsg('Araştırma alanlarınız ve profil bilgileriniz başarıyla kaydedildi!');
      setTimeout(() => setSaveMsg(null), 4000);
    } catch (err) {
      setSaveError(err.message || 'Profil güncellenirken bir hata oluştu.');
    } finally {
      setSaveLoading(false);
    }
  };

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '6rem' }}>
        <h3>Lütfen oturum açın.</h3>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '6rem' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Kullanıcı paneli yükleniyor...</div>
      </div>
    );
  }

  const { myProjects = [], joinedProjects = [], incomingRequests = [], notifications = [] } = data || {};

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '2.5rem 2rem 5rem' }}>
      {/* Profile Header Card */}
      <div className="card-glass" style={{ marginBottom: '2.5rem', padding: '2rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem' }}>
          <div>
            <span className="badge badge-claimed" style={{ marginBottom: '0.6rem' }}>
              Aktif Akademisyen Hesabı
            </span>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>
              {user.title} {user.full_name}
            </h1>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              {user.faculty_name} — {user.department_name}
            </div>

            {/* Selected Tags summary badge row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.85rem' }}>
              {(user.research_areas || []).slice(0, 6).map(t => (
                <span key={t.id} className="badge badge-tag" style={{ fontSize: '0.75rem' }}>
                  {t.label}
                </span>
              ))}
              {(user.research_areas || []).length > 6 && (
                <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                  +{(user.research_areas.length - 6)} alan daha
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            <button
              onClick={() => setActiveTab('edit-profile')}
              className="btn-primary"
              style={{ fontSize: '0.9rem', padding: '0.65rem 1.25rem' }}
            >
              <Edit3 size={17} />
              <span>Araştırma Alanlarımı Düzenle</span>
            </button>

            <button
              onClick={() => onNavigate('academician-detail', user.id)}
              className="btn-secondary"
              style={{ fontSize: '0.9rem' }}
            >
              <span>Kamuya Açık Profilim</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '2px solid var(--border-color)', marginBottom: '2.5rem' }}>
        <button
          onClick={() => setActiveTab('projects')}
          style={{
            padding: '0.85rem 1.5rem',
            fontWeight: 700,
            borderBottom: activeTab === 'projects' ? '3px solid var(--accent-primary)' : '3px solid transparent',
            color: activeTab === 'projects' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <FolderGit2 size={18} />
          <span>Projelerim ({myProjects.length + joinedProjects.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          style={{
            padding: '0.85rem 1.5rem',
            fontWeight: 700,
            borderBottom: activeTab === 'requests' ? '3px solid var(--accent-primary)' : '3px solid transparent',
            color: activeTab === 'requests' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Mail size={18} />
          <span>Gelen Davet & Başvurular ({incomingRequests.length})</span>
          {incomingRequests.length > 0 && (
            <span style={{
              background: 'var(--danger)',
              color: '#fff',
              fontSize: '0.7rem',
              padding: '0.15rem 0.5rem',
              borderRadius: '9999px',
              fontWeight: 800
            }}>
              {incomingRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          style={{
            padding: '0.85rem 1.5rem',
            fontWeight: 700,
            borderBottom: activeTab === 'notifications' ? '3px solid var(--accent-primary)' : '3px solid transparent',
            color: activeTab === 'notifications' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Bell size={18} />
          <span>Bildirimlerim ({notifications.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('edit-profile')}
          style={{
            padding: '0.85rem 1.5rem',
            fontWeight: 700,
            borderBottom: activeTab === 'edit-profile' ? '3px solid var(--accent-primary)' : '3px solid transparent',
            color: activeTab === 'edit-profile' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Edit3 size={18} />
          <span>Uzmanlık Alanları & Profil Ayarları</span>
        </button>
      </div>

      {/* TAB 1: PROJECTS */}
      {activeTab === 'projects' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {/* Created by me */}
          <div>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '1.25rem' }}>Oluşturduğum Projeler</h3>
            {myProjects.length === 0 ? (
              <div className="card-glass" style={{ textAlign: 'center', padding: '2.5rem' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>Henüz açtığınız bir proje bulunmuyor.</p>
                <button onClick={() => onNavigate('create-project')} className="btn-primary" style={{ fontSize: '0.9rem' }}>
                  Hemen Proje Aç
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {myProjects.map(p => (
                  <div
                    key={p.id}
                    onClick={() => onNavigate('project-detail', p.id)}
                    className="card-glass"
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="badge" style={{ background: 'rgba(56,149,255,0.15)', color: 'var(--accent-primary)', marginBottom: '0.6rem' }}>
                      Proje Sahibi ({p.member_count} Üye)
                    </span>
                    <h4 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>{p.title}</h4>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {p.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Joined projects */}
          {joinedProjects.length > 0 && (
            <div>
              <h3 style={{ fontSize: '1.4rem', marginBottom: '1.25rem' }}>Araştırmacı Olarak Katıldığım Projeler</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {joinedProjects.map(p => (
                  <div
                    key={p.id}
                    onClick={() => onNavigate('project-detail', p.id)}
                    className="card-glass"
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="badge badge-claimed" style={{ marginBottom: '0.6rem' }}>
                      Araştırmacı Üye
                    </span>
                    <h4 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>{p.title}</h4>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                      {p.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INCOMING REQUESTS */}
      {activeTab === 'requests' && (
        <div>
          {incomingRequests.length === 0 ? (
            <div className="card-glass" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <Mail size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
              <h4 style={{ fontSize: '1.25rem', marginBottom: '0.4rem' }}>Bekleyen Talebiniz Yok</h4>
              <p style={{ color: 'var(--text-secondary)' }}>Size gelen proje davetleri veya projelerinize yapılan başvurular burada görünür.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {incomingRequests.map(reqItem => (
                <div key={reqItem.id} className="card-glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                      <span className="badge" style={{ background: reqItem.type === 'invitation' ? 'rgba(56,149,255,0.15)' : 'rgba(245,158,11,0.15)', color: reqItem.type === 'invitation' ? 'var(--accent-primary)' : 'var(--warning)' }}>
                        {reqItem.type === 'invitation' ? 'Proje Daveti' : 'Katılım Başvurusu'}
                      </span>
                      <strong style={{ color: 'var(--text-primary)' }}>{reqItem.sender_title} {reqItem.sender_name}</strong>
                    </div>

                    <h4 style={{ fontSize: '1.15rem', marginBottom: '0.35rem' }}>
                      Proje: {reqItem.project_title}
                    </h4>

                    {reqItem.message && (
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '8px', marginTop: '0.5rem' }}>
                        "{reqItem.message}"
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      onClick={() => handleResponse(reqItem.id, 'accepted')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.65rem 1.25rem',
                        background: 'var(--success)',
                        color: '#fff',
                        fontWeight: 600,
                        borderRadius: '8px'
                      }}
                    >
                      <CheckCircle2 size={16} />
                      <span>Kabul Et</span>
                    </button>

                    <button
                      onClick={() => handleResponse(reqItem.id, 'rejected')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.65rem 1.25rem',
                        background: 'transparent',
                        border: '1px solid var(--danger)',
                        color: 'var(--danger)',
                        fontWeight: 600,
                        borderRadius: '8px'
                      }}
                    >
                      <XCircle size={16} />
                      <span>Reddet</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {notifications.length === 0 ? (
            <div className="card-glass" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <Bell size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Henüz yeni bildirim bulunmamaktadır.</p>
            </div>
          ) : (
            notifications.map(notif => (
              <div
                key={notif.id}
                className="card-glass"
                style={{ padding: '1.25rem 1.5rem' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <h4 style={{ fontSize: '1.05rem', color: 'var(--accent-primary)' }}>{notif.title}</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Yeni</span>
                </div>
                <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
                  {notif.body}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 4: EDIT PROFILE & RESEARCH AREAS */}
      {activeTab === 'edit-profile' && (
        <div className="card-glass" style={{ padding: '2.5rem' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <BookOpen size={24} color="var(--accent-primary)" />
              <span>Araştırma & Uzmanlık Alanlarını ve Bilgileri Düzenle</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              AVESİS veritabanından aktarılan veya eksik olan araştırma alanlarınızı ekleyebilir, gereksiz etiketleri çıkarabilirsiniz. Akıllı eşleştirme algoritması buradaki etiketlerinizi baz alır.
            </p>
          </div>

          {saveMsg && (
            <div style={{
              padding: '1rem 1.25rem',
              background: 'var(--success-bg)',
              color: 'var(--success)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              fontWeight: 600
            }}>
              <CheckCircle2 size={20} />
              <span>{saveMsg}</span>
            </div>
          )}

          {saveError && (
            <div style={{
              padding: '1rem 1.25rem',
              background: 'var(--danger-bg)',
              color: 'var(--danger)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              fontWeight: 600
            }}>
              <AlertCircle size={20} />
              <span>{saveError}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile}>
            {/* 1. RESEARCH AREAS EDITOR (TOP PRIORITY) */}
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-highlight)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem',
              marginBottom: '2rem'
            }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.4rem', color: 'var(--accent-primary)' }}>
                🎯 Araştırma Alanları & Etiketler ({editTags.length} Alan Seçili)
              </label>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Aşağıdaki arama kutusuna yazarak ~1.400 AVESİS etiketi arasından uzmanlığınızı ekleyin veya mevcut etiketlerdeki çarpı (x) butonuna basarak çıkarın.
              </p>

              {/* Tag Autocomplete Search */}
              <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="+ Yeni etiket arayın (Örn: İnşaat Mühendisliği, Katı Cisimler Mekaniği, Yapay Zeka...)"
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
                    marginTop: '4px',
                    maxHeight: '260px',
                    overflowY: 'auto'
                  }}>
                    {filteredTagSuggestions.map(tag => (
                      <div
                        key={tag.id}
                        onClick={() => addTagToEdit(tag)}
                        style={{
                          padding: '0.75rem 1rem',
                          borderBottom: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{tag.label}</span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 700 }}>+ EKLE</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Current Selected Tags Badges */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', minHeight: '50px' }}>
                {editTags.length === 0 ? (
                  <div style={{ color: 'var(--warning)', fontSize: '0.88rem', fontWeight: 600 }}>
                    ⚠️ Henüz araştırma alanı eklemediniz. Akıllı eşleştirme için etiket ekleyin.
                  </div>
                ) : (
                  editTags.map(tag => (
                    <span
                      key={tag.id}
                      className="badge badge-tag"
                      style={{
                        padding: '0.5rem 0.95rem',
                        fontSize: '0.88rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <span>{tag.label}</span>
                      <button
                        type="button"
                        onClick={() => removeTagFromEdit(tag.id)}
                        style={{
                          color: 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '2px'
                        }}
                        title="Bu etiketi kaldır"
                      >
                        <X size={15} />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* 2. ACADEMIC TITLE & BIO */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                  Akademik Unvan
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Örn: Prof. Dr., Doç. Dr., Dr. Öğr. Üyesi"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                  Resmi AVESİS Profil Linki
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Örn: https://avesis.erdogan.edu.tr/..."
                  value={editAvesisUrl}
                  onChange={e => setEditAvesisUrl(e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                Profil Fotoğrafı URL (Opsiyonel)
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Örn: https://avesis.erdogan.edu.tr/user/image/..."
                value={editPhoto}
                onChange={e => setEditPhoto(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: '2.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                Kısa Biyografi / Çalışma Özeti
              </label>
              <textarea
                rows={4}
                className="form-textarea"
                placeholder="Çalışma alanlarınız, ilgilendiğiniz projeler ve uzmanlık detaylarınız..."
                value={editBio}
                onChange={e => setEditBio(e.target.value)}
              />
            </div>

            {/* Submit Button */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setActiveTab('projects')}
                className="btn-secondary"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={saveLoading}
                className="btn-primary"
                style={{ padding: '0.85rem 2rem', fontSize: '1rem' }}
              >
                <Save size={19} />
                <span>{saveLoading ? 'Kaydediliyor...' : 'Tüm Değişiklikleri Kaydet'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
