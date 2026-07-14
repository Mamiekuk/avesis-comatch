import React, { useState, useEffect } from 'react';
import { fetchDashboard, respondToInvitation, fetchMetadata, updateUserProfile, updateProject, fetchProjectById, fetchChatContacts, fetchChatHistory, sendChatMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, FolderGit2, Mail, Bell, CheckCircle2, XCircle, ArrowRight, Sparkles, Building2, Edit3, Save, X, Plus, BookOpen, AlertCircle, MessageSquare } from 'lucide-react';

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

  // Edit Project State
  const [editingProject, setEditingProject] = useState(null);
  const [editProjTitle, setEditProjTitle] = useState('');
  const [editProjDesc, setEditProjDesc] = useState('');
  const [editProjObjectives, setEditProjObjectives] = useState('');
  const [editProjTeamSize, setEditProjTeamSize] = useState(4);
  const [editProjDuration, setEditProjDuration] = useState('24 Ay');
  const [editProjBudget, setEditProjBudget] = useState('');
  const [editProjTags, setEditProjTags] = useState([]);
  const [editProjTagSearch, setEditProjTagSearch] = useState('');
  const [editProjLoading, setEditProjLoading] = useState(false);
  const [editProjSuccess, setEditProjSuccess] = useState(false);

  // Chat States
  const [chatContacts, setChatContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatContactsLoading, setChatContactsLoading] = useState(false);

  const loadData = () => {
    if (!token) return;
    setLoading(true);
    fetchDashboard(token)
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const loadChatContacts = async () => {
    if (!token) return;
    setChatContactsLoading(true);
    try {
      const res = await fetchChatContacts(token);
      setChatContacts(res.contacts || []);
    } catch (err) {
      console.error('Sohbet kişileri yüklenemedi:', err);
    } finally {
      setChatContactsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadChatContacts();
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

  const handleOpenEditProject = async (p) => {
    try {
      const detail = await fetchProjectById(p.id);
      const fullProj = detail.project;
      setEditingProject(fullProj);
      setEditProjTitle(fullProj.title || '');
      setEditProjDesc(fullProj.description || '');
      setEditProjObjectives(fullProj.objectives || '');
      setEditProjTeamSize(fullProj.team_size || 4);
      setEditProjDuration(fullProj.duration || '24 Ay');
      setEditProjBudget(fullProj.budget || '');
      setEditProjTags(fullProj.tags || []);
      setEditProjTagSearch('');
      setEditProjSuccess(false);
    } catch (err) {
      alert('Proje detayları alınamadı: ' + err.message);
    }
  };

  const addTagToEditProj = (tag) => {
    if (!editProjTags.some(t => t.id === tag.id)) {
      setEditProjTags(prev => [...prev, tag]);
    }
    setEditProjTagSearch('');
  };

  const removeTagFromEditProj = (id) => {
    setEditProjTags(prev => prev.filter(t => t.id !== id));
  };

  const handleSaveProject = async (e) => {
    e.preventDefault();
    if (!editingProject) return;
    if (editProjTags.length === 0) {
      return alert('Akıllı eşleştirme motorunun çalışması için en az 1 araştırma alanı etiketi seçmelisiniz.');
    }

    setEditProjLoading(true);
    try {
      await updateProject(editingProject.id, {
        title: editProjTitle,
        description: editProjDesc,
        objectives: editProjObjectives,
        teamSize: Number(editProjTeamSize),
        duration: editProjDuration,
        budget: editProjBudget,
        researchAreaIds: editProjTags.map(t => t.id)
      }, token);

      setEditProjSuccess(true);
      setTimeout(() => {
        setEditingProject(null);
        setEditProjSuccess(false);
        loadData();
      }, 1500);
    } catch (err) {
      alert(err.message);
    } finally {
      setEditProjLoading(false);
    }
  };

  const filteredProjTagSuggestions = editProjTagSearch.trim()
    ? allTags.filter(t => 
        t.label.toLowerCase().includes(editProjTagSearch.toLowerCase()) &&
        !editProjTags.some(st => st.id === t.id)
      ).slice(0, 8)
    : [];

  // Load Chat History
  const loadChatHistory = async (contactId) => {
    if (!token || !contactId) return;
    setChatLoading(true);
    try {
      const res = await fetchChatHistory(contactId, token);
      setChatMessages(res.history || []);
      // Refresh contacts to update unread badge
      loadChatContacts();
    } catch (err) {
      console.error('Sohbet geçmişi yüklenemedi:', err);
    } finally {
      setChatLoading(false);
    }
  };

  // Send Message
  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!token || !selectedContact || !chatInput.trim()) return;

    const msgText = chatInput.trim();
    setChatInput(''); // smooth UX

    try {
      const res = await sendChatMessage(selectedContact.id, msgText, token);
      if (res.success && res.message) {
        setChatMessages(prev => [...prev, res.message]);
        loadChatContacts();
      }
    } catch (err) {
      alert('Mesaj gönderilemedi: ' + err.message);
    }
  };

  // Load chat history when selected contact changes
  useEffect(() => {
    if (selectedContact) {
      loadChatHistory(selectedContact.id);
    }
  }, [selectedContact]);

  // Handle routeParam (for deep linking to chat from other pages)
  useEffect(() => {
    if (routeParam && routeParam.tab === 'chat') {
      setActiveTab('chat');
      const targetContact = routeParam.contact;
      if (targetContact) {
        setSelectedContact(targetContact);
        setChatContacts(prev => {
          if (!prev.some(c => c.id === targetContact.id)) {
            return [
              {
                id: targetContact.id,
                full_name: targetContact.full_name,
                title: targetContact.title,
                photo_url: targetContact.photo_url,
                last_message: 'Sohbeti başlatın...',
                unread_count: 0
              },
              ...prev
            ];
          }
          return prev;
        });
      }
    }
  }, [routeParam]);

  // Chat Polling loop (real-time experience)
  useEffect(() => {
    let interval;
    if (activeTab === 'chat' && token) {
      interval = setInterval(() => {
        loadChatContacts();
        if (selectedContact) {
          fetchChatHistory(selectedContact.id, token)
            .then(res => {
              setChatMessages(res.history || []);
            })
            .catch(() => {});
        }
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [activeTab, selectedContact, token]);

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
  const totalUnreadMessages = chatContacts.reduce((sum, c) => sum + (c.unread_count || 0), 0);

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
          onClick={() => setActiveTab('chat')}
          style={{
            padding: '0.85rem 1.5rem',
            fontWeight: 700,
            borderBottom: activeTab === 'chat' ? '3px solid var(--accent-primary)' : '3px solid transparent',
            color: activeTab === 'chat' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <MessageSquare size={18} />
          <span>Mesajlarım</span>
          {totalUnreadMessages > 0 && (
            <span style={{
              background: 'var(--danger)',
              color: '#fff',
              fontSize: '0.7rem',
              padding: '0.15rem 0.5rem',
              borderRadius: '9999px',
              fontWeight: 800
            }}>
              {totalUnreadMessages}
            </span>
          )}
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                      <span className="badge" style={{ background: 'rgba(56,149,255,0.15)', color: 'var(--accent-primary)' }}>
                        Proje Sahibi ({p.member_count} Üye)
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditProject(p);
                        }}
                        className="btn-secondary"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.25rem', margin: 0 }}
                      >
                        <Edit3 size={12} />
                        <span>Düzenle</span>
                      </button>
                    </div>
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

                    <h4 
                      onClick={() => onNavigate('project-detail', reqItem.project_id)}
                      style={{ fontSize: '1.15rem', marginBottom: '0.35rem', cursor: 'pointer', color: 'var(--accent-primary)', textDecoration: 'underline' }}
                      title="Proje detaylarını görüntülemek için tıklayın"
                    >
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

      {/* TAB: CHAT / MESSAGING */}
      {activeTab === 'chat' && (
        <div className="card-glass" style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 320px) 1fr', minHeight: '600px', height: 'calc(100vh - 350px)', padding: 0, overflow: 'hidden', marginBottom: '2.5rem' }}>
          {/* Contacts Pane (Left) */}
          <div style={{ borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
              <h3 style={{ fontSize: '1.15rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageSquare size={18} color="var(--accent-primary)" />
                <span>Mesajlaşmalarım</span>
              </h3>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
              {chatContactsLoading && chatContacts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Yükleniyor...</div>
              ) : chatContacts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  <p>Henüz aktif bir sohbetiniz bulunmamaktadır.</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Akademisyenlerin profil sayfalarındaki "Mesaj Gönder" butonunu kullanarak sohbet başlatabilirsiniz.</p>
                </div>
              ) : (
                chatContacts.map(c => {
                  const isSelected = selectedContact && selectedContact.id === c.id;
                  const initials = c.full_name ? c.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedContact(c)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.85rem 1rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(56,149,255,0.1)' : 'transparent',
                        borderLeft: isSelected ? '3px solid var(--accent-primary)' : '3px solid transparent',
                        transition: 'all 0.2s',
                        marginBottom: '0.25rem'
                      }}
                      className="chat-contact-item"
                    >
                      {/* Avatar */}
                      {c.photo_url ? (
                        <img
                          src={c.photo_url}
                          alt={c.full_name}
                          style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          background: isSelected ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                          color: isSelected ? '#fff' : 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          border: '1px solid var(--border-color)'
                        }}>
                          {initials}
                        </div>
                      )}

                      {/* Details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.15rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.92rem', color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {c.title} {c.full_name}
                          </span>
                          {c.unread_count > 0 && (
                            <span style={{
                              background: 'var(--danger)',
                              color: '#fff',
                              fontSize: '0.68rem',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '9999px',
                              fontWeight: 800
                            }}>
                              {c.unread_count}
                            </span>
                          )}
                        </div>
                        <p style={{
                          fontSize: '0.78rem',
                          color: c.unread_count > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                          margin: 0,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontWeight: c.unread_count > 0 ? 600 : 400
                        }}>
                          {c.last_message}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat Window (Right) */}
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'rgba(0,0,0,0.1)' }}>
            {selectedContact ? (
              <>
                {/* Chat Header */}
                <div style={{
                  padding: '0.85rem 1.5rem',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.02)'
                }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                      {selectedContact.title} {selectedContact.full_name}
                    </h4>
                    <span
                      onClick={() => onNavigate('academician-detail', selectedContact.id)}
                      style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Profili Görüntüle →
                    </span>
                  </div>
                </div>

                {/* Messages Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {chatLoading && chatMessages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Mesajlar yükleniyor...</div>
                  ) : chatMessages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 1rem', fontSize: '0.9rem' }}>
                      Henüz mesaj bulunmuyor. İlk mesajı göndererek sohbeti başlatın!
                    </div>
                  ) : (
                    chatMessages.map(msg => {
                      const isMe = msg.sender_id === user.id;
                      const msgTime = msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                      return (
                        <div
                          key={msg.id}
                          style={{
                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                            maxWidth: '70%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isMe ? 'flex-end' : 'flex-start'
                          }}
                        >
                          <div style={{
                            background: isMe ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                            color: isMe ? '#fff' : 'var(--text-primary)',
                            padding: '0.75rem 1rem',
                            borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            fontSize: '0.92rem',
                            lineHeight: 1.45,
                            boxShadow: 'var(--shadow-sm)',
                            border: isMe ? 'none' : '1px solid var(--border-color)',
                            wordBreak: 'break-word'
                          }}>
                            {msg.message}
                          </div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', padding: '0 4px' }}>
                            {msgTime}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Message Input Footer */}
                <form onSubmit={handleSendChatMessage} style={{ padding: '1.25rem', borderTop: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)', display: 'flex', gap: '0.75rem' }}>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="Mesajınızı yazın..."
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    style={{ margin: 0 }}
                  />
                  <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
                    <span>Gönder</span>
                  </button>
                </form>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', padding: '2rem', textAlign: 'center' }}>
                <MessageSquare size={48} color="var(--border-color)" style={{ marginBottom: '1rem' }} />
                <h4 style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Sohbet Seçilmedi</h4>
                <p style={{ fontSize: '0.85rem', maxWidth: '320px' }}>Soldaki listeden bir akademisyen seçin veya yeni bir sohbet başlatmak için akademisyen profil sayfasına gidin.</p>
              </div>
            )}
          </div>
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

      {/* EDIT PROJECT MODAL */}
      {editingProject && (
        <div className="modal-overlay" onClick={() => setEditingProject(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '780px', width: '90%', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.35rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FolderGit2 size={20} color="var(--accent-primary)" />
                <span>Projeyi Düzenle</span>
              </h3>
              <button onClick={() => setEditingProject(null)} style={{ color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProject}>
              {/* Title */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.4rem' }}>
                  Proje Başlığı *
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={editProjTitle}
                  onChange={e => setEditProjTitle(e.target.value)}
                />
              </div>

              {/* Description */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.4rem' }}>
                  Proje Özet Açıklaması *
                </label>
                <textarea
                  rows={4}
                  required
                  className="form-textarea"
                  value={editProjDesc}
                  onChange={e => setEditProjDesc(e.target.value)}
                />
              </div>

              {/* Objectives */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.4rem' }}>
                  İş Paketi ve Hedefler
                </label>
                <textarea
                  rows={3}
                  className="form-textarea"
                  value={editProjObjectives}
                  onChange={e => setEditProjObjectives(e.target.value)}
                />
              </div>

              {/* RESEARCH AREA TAG PICKER */}
              <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-highlight)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                marginBottom: '1.25rem'
              }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.4rem', color: 'var(--accent-primary)' }}>
                  🎯 Aranan Araştırma Alanı Etiketleri ({editProjTags.length} Seçili)
                </label>
                
                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Etiket arayın (Örn: Yapay Zeka, Mekanik...)"
                    value={editProjTagSearch}
                    onChange={e => setEditProjTagSearch(e.target.value)}
                  />

                  {filteredProjTagSuggestions.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 100,
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-highlight)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-md)',
                      marginTop: '4px',
                      maxHeight: '180px',
                      overflowY: 'auto'
                    }}>
                      {filteredProjTagSuggestions.map(tag => (
                        <div
                          key={tag.id}
                          onClick={() => addTagToEditProj(tag)}
                          style={{
                            padding: '0.65rem 1rem',
                            borderBottom: '1px solid var(--border-color)',
                            cursor: 'pointer',
                            fontSize: '0.88rem'
                          }}
                        >
                          + {tag.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {editProjTags.map(tag => (
                    <span key={tag.id} className="badge badge-tag" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      {tag.label}
                      <X size={12} style={{ cursor: 'pointer' }} onClick={() => removeTagFromEditProj(tag.id)} />
                    </span>
                  ))}
                </div>
              </div>

              {/* Size, Duration, Budget */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                    Ekip Büyüklüğü
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="20"
                    className="form-input"
                    value={editProjTeamSize}
                    onChange={e => setEditProjTeamSize(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                    Süre
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={editProjDuration}
                    onChange={e => setEditProjDuration(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                    Bütçe
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={editProjBudget}
                    onChange={e => setEditProjBudget(e.target.value)}
                  />
                </div>
              </div>

              {editProjSuccess ? (
                <div style={{ padding: '0.85rem', background: 'var(--success-bg)', color: 'var(--success)', borderRadius: '8px', textAlign: 'center', fontWeight: 600 }}>
                  ✓ Proje başarıyla güncellendi!
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn-secondary" onClick={() => setEditingProject(null)}>
                    İptal
                  </button>
                  <button type="submit" className="btn-primary" disabled={editProjLoading}>
                    {editProjLoading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
