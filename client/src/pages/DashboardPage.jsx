import React, { useState, useEffect, useRef } from 'react';
import { fetchDashboard, respondToInvitation, fetchMetadata, updateUserProfile, updateProject, fetchProjectById, fetchChatContacts, fetchChatHistory, sendChatMessage, deleteChatMessage, uploadChatFile, clearChatHistory, fetchMeetings, createMeeting, respondToMeeting, BACKEND_URL, createResearchArea, fetchKMeansNeighbors, publishProject, fetchAcademicians } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, FolderGit2, Mail, Bell, CheckCircle2, XCircle, ArrowRight, Sparkles, Building2, Edit3, Save, X, Plus, BookOpen, AlertCircle, MessageSquare, Trash2, Paperclip, Calendar, FileText, Image, Download, MapPin, Video, Clock, UserCheck, Search } from 'lucide-react';

const cleanClusterName = (name) => {
  if (!name) return '';
  return name
    .replace(/ Akademik Yaylası \(Rize Yöresi\)/gi, ' Akademik Kümesi')
    .replace(/ Akademik Yaylası/gi, ' Akademik Kümesi')
    .replace(/ Yaylası/gi, ' Kümesi')
    .replace(/ \(Rize Yöresi\)/gi, '')
    .replace(/ Rize Yöresi/gi, '');
};

export default function DashboardPage({ onNavigate, routeParam }) {
  const { user, token, updateUser } = useAuth();
  const [data, setData] = useState(null);
  const [neighbors, setNeighbors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('projects'); // 'projects' | 'requests' | 'notifications' | 'edit-profile'

  // Edit Profile & Research Areas State
  const [editTitle, setEditTitle] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editPhoto, setEditPhoto] = useState('');
  const [editAvesisUrl, setEditAvesisUrl] = useState('');
  const [editTags, setEditTags] = useState([]);
  const [editCollaborationStatus, setEditCollaborationStatus] = useState('open');
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
  const messagesContainerRef = useRef(null);
  const lastMessagesCountRef = useRef(0);
  const lastContactIdRef = useRef(null);

  // Meetings / Calendar States
  const [meetings, setMeetings] = useState([]);
  const [meetingsLoading, setMeetingsLoading] = useState(false);
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDesc, setMeetingDesc] = useState('');
  const [meetingType, setMeetingType] = useState('zoom');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingProjectId, setMeetingProjectId] = useState('');

  // File Upload State & Ref
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);

  // Meeting Link State
  const [meetingLink, setMeetingLink] = useState('');

  // New Chat Search States
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [academiciansForChat, setAcademiciansForChat] = useState([]);

  useEffect(() => {
    if (!token) return;
    if (chatSearchQuery.trim().length >= 2 || showNewChatModal) {
      fetchAcademicians({ search: chatSearchQuery, limit: 12 }, token)
        .then(d => setAcademiciansForChat(d.academicians || []))
        .catch(() => {});
    }
  }, [chatSearchQuery, showNewChatModal, token]);

  const loadData = () => {
    if (!token) return;
    setLoading(true);
    fetchDashboard(token)
      .then(d => {
        setData(d);
        const targetUserId = (d && d.user && d.user.id) || (user && user.id);
        if (targetUserId) {
          fetchKMeansNeighbors(targetUserId).then(nRes => {
            if (nRes && nRes.neighbors) setNeighbors(nRes.neighbors);
          }).catch(() => {});
        }
      })
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

  const loadMeetings = () => {
    if (!token) return;
    setMeetingsLoading(true);
    fetchMeetings(token)
      .then(res => setMeetings(res.meetings || []))
      .catch(err => console.error("Toplantılar yüklenemedi:", err))
      .finally(() => setMeetingsLoading(false));
  };

  useEffect(() => {
    loadData();
    loadChatContacts();
    loadMeetings();
    fetchMetadata()
      .then(d => setAllTags(d.research_areas || []))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    const targetUserId = (data && data.user && data.user.id) || (user && user.id);
    if (targetUserId) {
      fetchKMeansNeighbors(targetUserId).then(nRes => {
        if (nRes && nRes.neighbors) setNeighbors(nRes.neighbors);
      }).catch(() => {});
    }
  }, [user?.id, data?.user?.id]);

  // Sync user info into edit form whenever user or tab changes
  useEffect(() => {
    if (user) {
      setEditTitle(user.title || '');
      setEditBio(user.bio || '');
      setEditPhoto(user.photo_url || '');
      setEditAvesisUrl(user.avesis_profile_url || '');
      setEditTags(user.research_areas || []);
      setEditCollaborationStatus(user.collaboration_status || 'open');
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

  const exactMatch = tagSearchInput.trim()
    ? allTags.some(t => t.label.toLowerCase() === tagSearchInput.trim().toLowerCase())
    : true;

  const handleCreateCustomTag = async () => {
    const label = tagSearchInput.trim();
    if (!label) return;
    try {
      const res = await createResearchArea(label, token);
      if (res.success && res.tag) {
        setAllTags(prev => {
          if (prev.some(t => t.id === res.tag.id)) return prev;
          return [...prev, res.tag].sort((a, b) => a.label.localeCompare(b.label));
        });
        if (!editTags.some(t => t.id === res.tag.id)) {
          setEditTags(prev => [...prev, res.tag]);
        }
        setTagSearchInput('');
      }
    } catch (err) {
      alert('Etiket oluşturulamadı: ' + err.message);
    }
  };

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
        researchAreaIds: editTags.map(t => t.id),
        collaborationStatus: editCollaborationStatus
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

  // Delete Message
  const handleDeleteMessage = async (messageId) => {
    try {
      await deleteChatMessage(messageId, token);
      setChatMessages(prev => prev.filter(m => m.id !== messageId));
      loadChatContacts();
    } catch (err) {
      alert('Mesaj silinemedi: ' + err.message);
    }
  };

  // Handle File Upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !token || !selectedContact) return;

    setUploadingFile(true);
    try {
      const uploadRes = await uploadChatFile(file, token);
      if (uploadRes.fileUrl) {
        const res = await sendChatMessage(selectedContact.id, '', token, uploadRes.fileUrl, uploadRes.fileName);
        if (res.success && res.message) {
          setChatMessages(prev => [...prev, res.message]);
          loadChatContacts();
        }
      }
    } catch (err) {
      alert('Dosya yüklenemedi: ' + err.message);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Clear Chat
  const handleClearChat = async () => {
    if (!selectedContact || !token) return;
    if (!confirm(`${selectedContact.title} ${selectedContact.full_name} ile olan tüm sohbet geçmişinizi silmek istediğinize emin misiniz?`)) return;

    try {
      await clearChatHistory(selectedContact.id, token);
      setChatMessages([]);
      loadChatContacts();
    } catch (err) {
      alert('Sohbet temizlenemedi: ' + err.message);
    }
  };

  // Handle Schedule Meeting
  const handleScheduleMeeting = async (e) => {
    e.preventDefault();
    if (!token || !selectedContact || !meetingTitle || !meetingDate || !meetingTime) return;

    try {
      await createMeeting({
        projectId: meetingProjectId ? Number(meetingProjectId) : null,
        guestId: selectedContact.id,
        title: meetingTitle,
        description: meetingDesc,
        meetingType: meetingType,
        meetingDate: meetingDate,
        meetingTime: meetingTime,
        meetingLink: meetingType === 'zoom' ? meetingLink : null
      }, token);

      alert('Toplantı daveti başarıyla gönderildi!');
      setMeetingModalOpen(false);
      setMeetingTitle('');
      setMeetingDesc('');
      setMeetingDate('');
      setMeetingTime('');
      setMeetingLink('');
      setMeetingProjectId('');
      loadMeetings();
    } catch (err) {
      alert('Toplantı daveti gönderilemedi: ' + err.message);
    }
  };

  // Handle Respond to Meeting
  const handleRespondToMeeting = async (meetingId, status) => {
    try {
      await respondToMeeting(meetingId, status, token);
      alert(status === 'accepted' ? 'Görüşme daveti kabul edildi!' : 'Görüşme daveti reddedildi.');
      loadMeetings();
    } catch (err) {
      alert('İşlem gerçekleştirilemedi: ' + err.message);
    }
  };

  const handlePublishProject = async (projectId) => {
    if (!token) return;
    try {
      await publishProject(projectId, token);
      alert('🚀 Projeniz başarıyla yayınlandı ve uyumlu araştırmacılara duyuruldu!');
      loadDashboard();
    } catch (err) {
      alert('Proje yayınlanamadı: ' + err.message);
    }
  };

  // Calculate Online / Last Active Status
  const getOnlineStatus = (lastActiveAt) => {
    if (!lastActiveAt) return { isOnline: false, text: 'Çevrimdışı' };
    const lastActive = new Date(lastActiveAt);
    const now = new Date();
    const diffMins = Math.abs(Math.floor((now - lastActive) / 60000));
    
    if (diffMins < 5) {
      return { isOnline: true, text: 'Çevrimiçi' };
    } else if (diffMins < 60) {
      return { isOnline: false, text: `${diffMins} dakika önce aktifti` };
    } else {
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) {
        return { isOnline: false, text: `${diffHours} saat önce aktifti` };
      } else {
        const diffDays = Math.floor(diffHours / 24);
        return { isOnline: false, text: `${diffDays || 1} gün önce aktifti` };
      }
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

  // Auto Scroll to Bottom of Chat (without scrolling the main page)
  useEffect(() => {
    if (activeTab === 'chat' && messagesContainerRef.current) {
      const currentCount = chatMessages.length;
      const contactChanged = lastContactIdRef.current !== (selectedContact ? selectedContact.id : null);
      const messageAdded = currentCount > lastMessagesCountRef.current;

      if (contactChanged || messageAdded) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: contactChanged ? 'auto' : 'smooth'
        });
      }

      // Update refs
      lastMessagesCountRef.current = currentCount;
      lastContactIdRef.current = selectedContact ? selectedContact.id : null;
    }
  }, [chatMessages, activeTab, selectedContact]);

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
  const pendingMeetingsCount = meetings.filter(m => m.guest_id === user.id && m.status === 'pending').length;

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '2.5rem 2rem 5rem' }}>
      {/* Profile Header Card */}
      <div className="card-glass" style={{ marginBottom: '2.5rem', padding: '2rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
              <span className="badge badge-claimed" style={{ margin: 0 }}>
                Aktif Akademisyen Hesabı
              </span>
              {(!user.collaboration_status || user.collaboration_status === 'open') && (
                <span className="badge" style={{ margin: 0, background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  ● Projelere Açık
                </span>
              )}
              {user.collaboration_status === 'looking' && (
                <span className="badge" style={{ margin: 0, background: 'rgba(56, 149, 255, 0.15)', color: 'var(--accent-primary)', border: '1px solid rgba(56, 149, 255, 0.3)' }}>
                  ● İş Birliğine Hazır
                </span>
              )}
              {user.collaboration_status === 'busy' && (
                <span className="badge" style={{ margin: 0, background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  ● Yoğun (Projeye Kapalı)
                </span>
              )}
              {(data?.user || user).metric_cluster && (
                <span className="badge" style={{ margin: 0, background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2))', color: '#e879f9', border: '1px solid rgba(236, 72, 153, 0.4)', fontWeight: 600 }}>
                  {(data?.user || user).metric_cluster.badge} (Yapay Zeka Profili)
                </span>
              )}
              {(data?.user || user).tag_cluster && (
                <span className="badge" style={{ margin: 0, background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                  🌐 {(data?.user || user).tag_cluster.name}
                </span>
              )}
            </div>
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
          onClick={() => setActiveTab('calendar')}
          style={{
            padding: '0.85rem 1.5rem',
            fontWeight: 700,
            borderBottom: activeTab === 'calendar' ? '3px solid var(--accent-primary)' : '3px solid transparent',
            color: activeTab === 'calendar' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Calendar size={18} />
          <span>Görüşme Takvimi</span>
          {pendingMeetingsCount > 0 && (
            <span style={{
              background: 'var(--danger)',
              color: '#fff',
              fontSize: '0.7rem',
              padding: '0.15rem 0.5rem',
              borderRadius: '9999px',
              fontWeight: 800
            }}>
              {pendingMeetingsCount}
            </span>
          )}
        </button>


      </div>

      {/* TAB 1: PROJECTS */}
      {activeTab === 'projects' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {/* Created by me */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.4rem', margin: 0 }}>Oluşturduğum Projeler</h3>
              <button onClick={() => onNavigate('create-project')} className="btn-primary" style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem' }}>
                <Plus size={16} />
                <span>Yeni Proje Oluştur</span>
              </button>
            </div>

            {myProjects.length === 0 ? (
              <div className="card-glass" style={{ textAlign: 'center', padding: '2.5rem' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>Henüz açtığınız bir proje veya kaydedilmiş taslak bulunmuyor.</p>
                <button onClick={() => onNavigate('create-project')} className="btn-primary" style={{ fontSize: '0.9rem' }}>
                  Hemen Proje Aç
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* 1. PUBLISHED PROJECTS */}
                {myProjects.filter(p => p.status !== 'draft').length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '1rem' }}>
                      🚀 Yayınlanan Aktif Projeler ({myProjects.filter(p => p.status !== 'draft').length})
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                      {myProjects.filter(p => p.status !== 'draft').map(p => (
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
                  </div>
                )}

                {/* 2. DRAFT PROJECTS */}
                {myProjects.filter(p => p.status === 'draft').length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--warning)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      💾 Taslak Projelerim ({myProjects.filter(p => p.status === 'draft').length}) — Yayınlanmadı
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                      {myProjects.filter(p => p.status === 'draft').map(p => (
                        <div
                          key={p.id}
                          className="card-glass"
                          style={{ borderLeft: '4px solid var(--warning)' }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                            <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)', fontWeight: 700 }}>
                              📝 Taslak Proje
                            </span>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button
                                onClick={() => handlePublishProject(p.id)}
                                className="btn-primary"
                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.25rem', margin: 0 }}
                              >
                                <Sparkles size={12} />
                                <span>Şimdi Yayınla</span>
                              </button>
                              <button
                                onClick={() => handleOpenEditProject(p)}
                                className="btn-secondary"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.25rem', margin: 0 }}
                              >
                                <Edit3 size={12} />
                                <span>Düzenle</span>
                              </button>
                            </div>
                          </div>
                          <h4 style={{ fontSize: '1.15rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{p.title}</h4>
                          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {p.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                      onClick={() => {
                        setSelectedContact({
                          id: reqItem.sender_id,
                          full_name: reqItem.sender_name,
                          title: reqItem.sender_title,
                          photo_url: reqItem.sender_photo
                        });
                        setActiveTab('chat');
                      }}
                      className="btn-secondary"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.65rem 1.25rem',
                        borderRadius: '8px',
                        margin: 0
                      }}
                    >
                      <MessageSquare size={16} color="var(--accent-primary)" />
                      <span>İletişime Geç</span>
                    </button>

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
          <div style={{ borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <MessageSquare size={17} color="var(--accent-primary)" />
                  <span>Mesajlaşmalarım</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowNewChatModal(true)}
                  className="btn-primary"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '0.3rem', margin: 0 }}
                  title="Yeni sohbet başlat"
                >
                  <Plus size={14} />
                  <span>Yeni Sohbet</span>
                </button>
              </div>

              {/* Quick Contact Search Input */}
              <div style={{ position: 'relative' }}>
                <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Sohbet veya araştırmacı ara..."
                  value={chatSearchQuery}
                  onChange={e => setChatSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.75rem 0.4rem 2.2rem',
                    borderRadius: '20px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    fontSize: '0.78rem',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
              </div>
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
                      <div style={{ position: 'relative' }}>
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
                        {getOnlineStatus(c.last_active_at).isOnline && (
                          <div style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: '#10b981',
                            border: '2px solid var(--border-color)'
                          }} />
                        )}
                      </div>

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
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'rgba(0,0,0,0.1)', overflow: 'hidden' }}>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem' }}>
                      <span
                        onClick={() => onNavigate('academician-detail', selectedContact.id)}
                        style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Profili Görüntüle
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>•</span>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        color: getOnlineStatus(selectedContact.last_active_at).isOnline ? '#10b981' : 'var(--text-muted)', 
                        fontWeight: getOnlineStatus(selectedContact.last_active_at).isOnline ? 600 : 400,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        {getOnlineStatus(selectedContact.last_active_at).isOnline && (
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                        )}
                        {getOnlineStatus(selectedContact.last_active_at).text}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      onClick={() => setMeetingModalOpen(true)}
                      className="btn-secondary"
                      style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem', margin: 0 }}
                    >
                      <Calendar size={14} />
                      <span>Görüşme Planla</span>
                    </button>
                    <button
                      onClick={handleClearChat}
                      className="btn-secondary"
                      style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem', margin: 0 }}
                    >
                      <Trash2 size={14} />
                      <span>Sohbeti Temizle</span>
                    </button>
                  </div>
                </div>

                {/* Messages Body */}
                <div ref={messagesContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
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
                      const isImage = msg.file_url && /\.(jpg|jpeg|png|webp|gif)$/i.test(msg.file_url);
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexDirection: isMe ? 'row-reverse' : 'row', maxWidth: '100%' }}>
                            <div style={{
                              background: isMe ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                              color: isMe ? '#fff' : 'var(--text-primary)',
                              padding: '0.75rem 1rem',
                              borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                              fontSize: '0.92rem',
                              lineHeight: 1.45,
                              boxShadow: 'var(--shadow-sm)',
                              border: isMe ? 'none' : '1px solid var(--border-color)',
                              wordBreak: 'break-word',
                              minWidth: msg.file_url ? '200px' : 'auto'
                            }}>
                              {msg.file_url ? (
                                isImage ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <img
                                      src={`${BACKEND_URL}${msg.file_url}`}
                                      alt={msg.file_name}
                                      style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '8px', cursor: 'pointer', objectFit: 'cover' }}
                                      onClick={() => window.open(`${BACKEND_URL}${msg.file_url}`, '_blank')}
                                    />
                                    {msg.message && <p style={{ margin: 0, fontSize: '0.9rem' }}>{msg.message}</p>}
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <div style={{ background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <FileText size={20} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {msg.file_name}
                                      </p>
                                      <a
                                        href={`${BACKEND_URL}${msg.file_url}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ fontSize: '0.78rem', color: isMe ? '#fff' : 'var(--accent-primary)', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '2px' }}
                                      >
                                        <Download size={12} />
                                        <span>İndir / Görüntüle</span>
                                      </a>
                                    </div>
                                  </div>
                                )
                              ) : (
                                msg.message
                              )}
                            </div>
                            {isMe && (
                              <button
                                onClick={() => {
                                  if (confirm('Bu mesajı silmek istediğinize emin misiniz?')) {
                                    handleDeleteMessage(msg.id);
                                  }
                                }}
                                title="Mesajı Sil"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--text-muted)',
                                  cursor: 'pointer',
                                  padding: '4px',
                                  borderRadius: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.2s',
                                  alignSelf: 'center'
                                }}
                                onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', padding: '0 4px' }}>
                            {msgTime}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />

                {/* Message Input Footer */}
                <form onSubmit={handleSendChatMessage} style={{ padding: '1.25rem', borderTop: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button
                    type="button"
                    disabled={uploadingFile}
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    className="btn-secondary"
                    title="Dosya veya Resim Ekle"
                    style={{ padding: '0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0, height: '42px', width: '42px', minWidth: '42px' }}
                  >
                    {uploadingFile ? (
                      <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid var(--text-muted)', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Paperclip size={18} />
                    )}
                  </button>

                  <input
                    type="text"
                    required={!uploadingFile}
                    className="form-input"
                    placeholder={uploadingFile ? "Dosya yükleniyor..." : "Mesajınızı yazın..."}
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    disabled={uploadingFile}
                    style={{ margin: 0, flex: 1 }}
                  />
                  <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1.5rem', height: '42px' }}>
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

                {(filteredTagSuggestions.length > 0 || (tagSearchInput.trim() && !exactMatch)) && (
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
                    {tagSearchInput.trim() && !exactMatch && (
                      <div
                        onClick={handleCreateCustomTag}
                        style={{
                          padding: '0.75rem 1rem',
                          borderBottom: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          color: 'var(--accent-primary)',
                          fontWeight: 'bold',
                          background: 'rgba(56,149,255,0.05)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span>+ "{tagSearchInput.trim()}" etiketini yeni oluştur ve ekle</span>
                        <span style={{ fontSize: '0.75rem', opacity: 0.8, color: 'var(--accent-primary)', fontWeight: 800 }}>YENİ OLUŞTUR</span>
                      </div>
                    )}
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
                İş Birliği & Projelere Katılım Durumu
              </label>
              <select
                className="form-select"
                value={editCollaborationStatus}
                onChange={e => setEditCollaborationStatus(e.target.value)}
              >
                <option value="open">Projelere Açık (Yeni teklif ve davetleri kabul ediyor)</option>
                <option value="looking">İş Birliğine Hazır (Aktif proje ortağı arıyor)</option>
                <option value="busy">Yoğun (Yeni projelere kapalı)</option>
              </select>
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

      {/* TAB: CALENDAR / MEETINGS */}
      {activeTab === 'calendar' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.4rem' }}>Görüşme Takvimi</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Diğer akademisyenlerle planladığınız online veya yüz yüze görüşmelerinizi buradan yönetin.</p>
            </div>
            <button
              onClick={() => {
                if (selectedContact) {
                  setMeetingModalOpen(true);
                } else {
                  alert('Toplantı ayarlamak için lütfen Mesajlar sekmesinden bir akademisyen seçin ve "Görüşme Planla" butonuna tıklayın.');
                  setActiveTab('chat');
                }
              }}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Calendar size={18} />
              <span>Görüşme Planla</span>
            </button>
          </div>

          {meetingsLoading ? (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
              <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTop: '3px solid var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Toplantılar yükleniyor...</p>
            </div>
          ) : meetings.length === 0 ? (
            <div className="card-glass" style={{ textAlign: 'center', padding: '5rem 2rem' }}>
              <Calendar size={48} color="var(--text-muted)" style={{ margin: '0 auto 1.5rem' }} />
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Henüz Görüşme Planlanmadı</h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
                Diğer akademisyenlerin profilleri veya mesajlaşma ekranı üzerinden toplantı talebi gönderebilir, gelen talepleri onaylayabilirsiniz.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
              
              {/* 1. PENDING INVITATIONS FOR ME */}
              {meetings.some(m => m.guest_id === user.id && m.status === 'pending') && (
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--warning)' }} />
                    Gelen Görüşme Davetleri
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
                    {meetings.filter(m => m.guest_id === user.id && m.status === 'pending').map(m => {
                      const initials = m.organizer_name ? m.organizer_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
                      return (
                        <div key={m.id} className="card-glass" style={{ borderLeft: '4px solid var(--warning)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                {m.organizer_photo ? (
                                  <img src={m.organizer_photo} alt={m.organizer_name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                                ) : (
                                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{initials}</div>
                                )}
                                <div>
                                  <h4 style={{ fontSize: '0.95rem', margin: 0 }}>{m.organizer_title} {m.organizer_name}</h4>
                                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Toplantı Sahibi</p>
                                </div>
                              </div>
                              <span className="badge" style={{ background: m.meeting_type === 'zoom' ? 'rgba(56,149,255,0.15)' : 'rgba(16,185,129,0.15)', color: m.meeting_type === 'zoom' ? 'var(--accent-primary)' : '#10b981' }}>
                                {m.meeting_type === 'zoom' ? 'Zoom (Online)' : 'Yüz Yüze'}
                              </span>
                            </div>

                            <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', fontWeight: 700 }}>{m.title}</h4>
                            {m.description && <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{m.description}</p>}
                            {m.project_title && (
                              <p style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', marginBottom: '1rem' }}>
                                <strong>Proje:</strong> {m.project_title}
                              </p>
                            )}

                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: '8px', display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', border: '1px solid var(--border-color)' }}>
                              <div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Tarih</span>
                                <strong style={{ fontSize: '0.9rem' }}>{m.meeting_date}</strong>
                              </div>
                              <div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Saat</span>
                                <strong style={{ fontSize: '0.9rem' }}>{m.meeting_time}</strong>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                            <button
                              type="button"
                              onClick={() => handleRespondToMeeting(m.id, 'accepted')}
                              className="btn-primary"
                              style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', background: '#10b981', borderColor: '#10b981' }}
                            >
                              Kabul Et
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRespondToMeeting(m.id, 'declined')}
                              className="btn-secondary"
                              style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', color: 'var(--danger)' }}
                            >
                              Reddet
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. UPCOMING CONFIRMED MEETINGS */}
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                  Planlanmış Gelecek Görüşmeler
                </h3>
                {meetings.filter(m => m.status === 'accepted').length === 0 ? (
                  <div className="card-glass" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Onaylanmış aktif bir görüşme bulunmuyor.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
                    {meetings.filter(m => m.status === 'accepted').map(m => {
                      const isOrganizer = m.organizer_id === user.id;
                      const partnerName = isOrganizer ? m.guest_name : m.organizer_name;
                      const partnerTitle = isOrganizer ? m.guest_title : m.organizer_title;
                      const partnerPhoto = isOrganizer ? m.guest_photo : m.organizer_photo;
                      const initials = partnerName ? partnerName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';

                      return (
                        <div key={m.id} className="card-glass" style={{ borderLeft: '4px solid #10b981', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                {partnerPhoto ? (
                                  <img src={partnerPhoto} alt={partnerName} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                                ) : (
                                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{initials}</div>
                                )}
                                <div>
                                  <h4 style={{ fontSize: '0.95rem', margin: 0 }}>{partnerTitle} {partnerName}</h4>
                                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>{isOrganizer ? 'Davet Edilen Konuk' : 'Davet Eden Sahibi'}</p>
                                </div>
                              </div>
                              <span className="badge" style={{ background: m.meeting_type === 'zoom' ? 'rgba(56,149,255,0.15)' : 'rgba(16,185,129,0.15)', color: m.meeting_type === 'zoom' ? 'var(--accent-primary)' : '#10b981' }}>
                                {m.meeting_type === 'zoom' ? 'Zoom (Online)' : 'Yüz Yüze'}
                              </span>
                            </div>

                            <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', fontWeight: 700 }}>{m.title}</h4>
                            {m.description && <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{m.description}</p>}
                            {m.project_title && (
                              <p style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', marginBottom: '1rem' }}>
                                <strong>Proje:</strong> {m.project_title}
                              </p>
                            )}

                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: '8px', display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', border: '1px solid var(--border-color)' }}>
                              <div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Tarih</span>
                                <strong style={{ fontSize: '0.9rem' }}>{m.meeting_date}</strong>
                              </div>
                              <div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Saat</span>
                                <strong style={{ fontSize: '0.9rem' }}>{m.meeting_time}</strong>
                              </div>
                            </div>
                          </div>

                          {m.meeting_type === 'zoom' && (
                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  let targetUrl = (m.meeting_link && m.meeting_link.trim()) ? m.meeting_link.trim() : 'https://zoom.us/join';
                                  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
                                    targetUrl = `https://${targetUrl}`;
                                  }
                                  window.open(targetUrl, '_blank', 'noopener,noreferrer');
                                }}
                                className="btn-primary"
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', margin: 0 }}
                              >
                                <Video size={16} />
                                <span>Görüşmeye Katıl {m.meeting_link ? '(Canlı Link)' : '(Zoom)'}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. SENT PENDING REQUESTS */}
              {meetings.some(m => m.organizer_id === user.id && m.status === 'pending') && (
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                    Gönderilen Bekleyen Talepler
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
                    {meetings.filter(m => m.organizer_id === user.id && m.status === 'pending').map(m => {
                      const initials = m.guest_name ? m.guest_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
                      return (
                        <div key={m.id} className="card-glass" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                {m.guest_photo ? (
                                  <img src={m.guest_photo} alt={m.guest_name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                                ) : (
                                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{initials}</div>
                                )}
                                <div>
                                  <h4 style={{ fontSize: '0.95rem', margin: 0 }}>{m.guest_title} {m.guest_name}</h4>
                                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Davet Edilen Konuk</p>
                                </div>
                              </div>
                              <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--warning)' }}>
                                Yanıt Bekleniyor
                              </span>
                            </div>

                            <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', fontWeight: 700 }}>{m.title}</h4>
                            {m.description && <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{m.description}</p>}

                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: '8px', display: 'flex', flexWrap: 'wrap', gap: '1rem', border: '1px solid var(--border-color)' }}>
                              <div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Tarih</span>
                                <strong style={{ fontSize: '0.9rem' }}>{m.meeting_date}</strong>
                              </div>
                              <div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Saat</span>
                                <strong style={{ fontSize: '0.9rem' }}>{m.meeting_time}</strong>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. PAST OR DECLINED MEETINGS */}
              {meetings.some(m => m.status === 'declined') && (
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-muted)' }}>
                    Geçmiş / İptal Edilen Görüşmeler
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
                    {meetings.filter(m => m.status === 'declined').map(m => {
                      const isOrganizer = m.organizer_id === user.id;
                      const partnerName = isOrganizer ? m.guest_name : m.organizer_name;
                      const partnerTitle = isOrganizer ? m.guest_title : m.organizer_title;
                      return (
                        <div key={m.id} className="card-glass" style={{ opacity: 0.6 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{partnerTitle} {partnerName}</span>
                            <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--danger)' }}>
                              Reddedildi
                            </span>
                          </div>
                          <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0.25rem 0' }}>{m.title}</h4>
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                            {m.meeting_date} • {m.meeting_time}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}

      {/* K-MEANS AKADEMİK MAHALLE & BENZER HOCALAR (KİŞİSEL ÖNERİLER) */}
      {(data?.user || user).tag_cluster && (
        <div className="card-glass" style={{ marginTop: '3rem', marginBottom: '2.5rem', border: '1px solid rgba(168, 85, 247, 0.3)', background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.05), rgba(56, 149, 255, 0.05))' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ padding: '0.55rem', borderRadius: '50%', background: 'rgba(168, 85, 247, 0.18)', color: '#c084fc', display: 'flex' }}>
                <UserCheck size={22} />
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>⚡ Yapay Zeka Öneri Motoru</span>
                <h3 style={{ fontSize: '1.4rem', margin: 0, color: 'var(--text-primary)' }}>
                  Akademik Küme Komşularınız: <span style={{ color: '#c084fc' }}>{cleanClusterName((data?.user || user).tag_cluster.name)}</span>
                </h3>
              </div>
            </div>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Vektör benzerliğine göre aynı kümedeki en yakın meslektaşlarınız.
            </span>
          </div>

          {neighbors.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', margin: 0 }}>
              Araştırma alanlarına en yakın benzer akademisyenler hesaplanıyor...
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {neighbors.slice(0, 4).map(nb => (
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
                        width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, #a855f7, #3b82f6)',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.95rem', flexShrink: 0, overflow: 'hidden'
                      }}>
                        {nb.photo_url ? (
                          <img src={nb.photo_url} alt={nb.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          nb.full_name.charAt(0)
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ fontSize: '0.98rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {nb.title} {nb.full_name}
                        </h4>
                        <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {nb.faculty_name}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.7rem' }}>
                      {(nb.research_areas || []).slice(0, 3).map(ra => (
                        <span key={ra.id} style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', padding: '0.18rem 0.45rem', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                          {ra.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.55rem', marginTop: 'auto' }}>
                    <span style={{ fontSize: '0.76rem', color: '#c084fc', fontWeight: 600 }}>
                      ⚡ %{nb.similarity_score} Benzerlik
                    </span>
                    <span style={{ fontSize: '0.73rem', background: 'rgba(168, 85, 247, 0.12)', color: '#e879f9', padding: '0.18rem 0.5rem', borderRadius: '999px' }}>
                      {nb.metric_badge}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
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

              {/* Objectives (Başvurulan Proje Selection) */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.5rem' }}>
                  Başvurulan Proje Türü
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {['BAP', 'TÜBİTAK', 'Uluslararası', 'Diğer Projeler'].map(opt => (
                    <label 
                      key={opt}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: 'var(--bg-secondary)',
                        border: editProjObjectives === opt ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.88rem',
                        color: editProjObjectives === opt ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <input
                        type="radio"
                        name="editProjectType"
                        value={opt}
                        checked={editProjObjectives === opt}
                        onChange={e => setEditProjObjectives(e.target.value)}
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

      {/* SCHEDULE MEETING MODAL */}
      {meetingModalOpen && selectedContact && (
        <div className="modal-overlay" onClick={() => setMeetingModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px', width: '90%', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.35rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={20} color="var(--accent-primary)" />
                <span>Görüşme Planla</span>
              </h3>
              <button onClick={() => setMeetingModalOpen(false)} style={{ color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleScheduleMeeting}>
              {/* Organizer & Guest info */}
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                <strong>Davetli Akademisyen:</strong> {selectedContact.title} {selectedContact.full_name}
              </p>

              {/* Project Link (Optional) */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.4rem' }}>
                  İlgili Proje (İsteğe Bağlı)
                </label>
                <select
                  className="form-select"
                  value={meetingProjectId}
                  onChange={e => setMeetingProjectId(e.target.value)}
                >
                  <option value="">-- Proje Seçilmedi --</option>
                  {myProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                  {joinedProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.4rem' }}>
                  Görüşme Konusu *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Proje İş Paketi Dağıtımı"
                  className="form-input"
                  value={meetingTitle}
                  onChange={e => setMeetingTitle(e.target.value)}
                />
              </div>

              {/* Description */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.4rem' }}>
                  Açıklama / Notlar
                </label>
                <textarea
                  rows={3}
                  placeholder="Toplantı gündemi, görüşülecek maddeler..."
                  className="form-textarea"
                  value={meetingDesc}
                  onChange={e => setMeetingDesc(e.target.value)}
                />
              </div>

              {/* Meeting Type */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.4rem' }}>
                  Görüşme Türü *
                </label>
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.25rem', marginBottom: meetingType === 'zoom' ? '1rem' : '0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="meetingType"
                      value="zoom"
                      checked={meetingType === 'zoom'}
                      onChange={() => setMeetingType('zoom')}
                    />
                    <Video size={16} color="var(--accent-primary)" />
                    <span>Zoom Görüşmesi (Online)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="meetingType"
                      value="face_to_face"
                      checked={meetingType === 'face_to_face'}
                      onChange={() => setMeetingType('face_to_face')}
                    />
                    <MapPin size={16} color="var(--accent-primary)" />
                    <span>Yüz Yüze Görüşme</span>
                  </label>
                </div>

                {/* Conditional Online Meeting Link Input */}
                {meetingType === 'zoom' && (
                  <div style={{ marginTop: '0.75rem', background: 'var(--bg-secondary)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-highlight)' }}>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', marginBottom: '0.4rem', color: 'var(--accent-primary)' }}>
                      🌐 Online Görüşme Bağlantısı (Zoom / Google Meet / Teams Linki)
                    </label>
                    <input
                      type="url"
                      className="form-input"
                      placeholder="https://zoom.us/j/... veya https://meet.google.com/..."
                      value={meetingLink}
                      onChange={e => setMeetingLink(e.target.value)}
                      style={{ margin: 0, fontSize: '0.85rem' }}
                    />
                  </div>
                )}
              </div>

              {/* Date and Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                    Tarih *
                  </label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={meetingDate}
                    onChange={e => setMeetingDate(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                    Saat *
                  </label>
                  <input
                    type="time"
                    required
                    className="form-input"
                    value={meetingTime}
                    onChange={e => setMeetingTime(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setMeetingModalOpen(false)}>
                  İptal
                </button>
                <button type="submit" className="btn-primary">
                  Davet Gönder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW CHAT SEARCH MODAL */}
      {showNewChatModal && (
        <div className="modal-overlay" onClick={() => setShowNewChatModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px', width: '90%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageSquare size={18} color="var(--accent-primary)" />
                <span>Yeni Sohbet Başlat</span>
              </h3>
              <button onClick={() => setShowNewChatModal(false)} style={{ color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                autoFocus
                className="form-input"
                placeholder="Araştırmacı adı, unvanı veya bölümü yazın..."
                value={chatSearchQuery}
                onChange={e => setChatSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: '200px' }}>
              {academiciansForChat.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Eşleşen araştırmacı bulunamadı. Lütfen ismi yazın.
                </div>
              ) : (
                academiciansForChat.map(a => (
                  <div
                    key={a.id}
                    onClick={() => {
                      setSelectedContact(a);
                      setShowNewChatModal(false);
                      setChatSearchQuery('');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: 'var(--bg-secondary)',
                      transition: 'all 0.2s'
                    }}
                    className="chat-contact-item"
                  >
                    {a.photo_url ? (
                      <img src={a.photo_url} alt={a.full_name} style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(56,149,255,0.15)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>
                        {a.full_name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{a.title} {a.full_name}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{a.department_name || a.faculty_name}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
