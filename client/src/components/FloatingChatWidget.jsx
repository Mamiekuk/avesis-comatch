import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  MessageSquare, ChevronUp, ChevronDown, Edit3, MoreHorizontal, X, 
  Send, Paperclip, ArrowLeft, FileText, Download, Trash2, Search 
} from 'lucide-react';
import { 
  fetchChatContacts, fetchChatHistory, sendChatMessage, 
  deleteChatMessage, uploadChatFile, fetchAcademicians, BACKEND_URL 
} from '../services/api';

export default function FloatingChatWidget() {
  const { user, token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allAcademicians, setAllAcademicians] = useState([]);
  const [showSearch, setShowSearch] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const widgetRef = useRef(null);

  const prevUnreadRef = useRef(0);

  // Play notification chime using Web Audio API
  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  };

  // Poll contacts always when logged in (even when widget is collapsed)
  useEffect(() => {
    if (!token) return;

    const loadContacts = () => {
      fetchChatContacts(token)
        .then(res => {
          const list = res.contacts || [];
          setContacts(list);
          const totalUnread = list.reduce((sum, c) => sum + (c.unread_count || 0), 0);
          if (totalUnread > prevUnreadRef.current && prevUnreadRef.current >= 0) {
            playChime();
          }
          prevUnreadRef.current = totalUnread;
        })
        .catch(err => console.error('Floating chat contacts load error:', err));
    };

    loadContacts();
    const interval = setInterval(loadContacts, 5000);
    return () => clearInterval(interval);
  }, [token]);

  // Poll messages when active chat is open
  useEffect(() => {
    if (!token || !isOpen || !activeContact) return;

    const loadMessages = () => {
      fetchChatHistory(activeContact.id, token)
        .then(res => {
          setMessages(res.history || []);
          setContacts(prev => prev.map(c => c.id === activeContact.id ? { ...c, unread_count: 0 } : c));
        })
        .catch(err => console.error('Floating chat messages load error:', err));
    };

    loadMessages();
    const interval = setInterval(loadMessages, 3500);
    return () => clearInterval(interval);
  }, [token, isOpen, activeContact]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Search academicians when search query changes
  useEffect(() => {
    if (!token || !searchQuery.trim()) {
      setAllAcademicians([]);
      return;
    }

    const delayDebounce = setTimeout(() => {
      fetchAcademicians({ search: searchQuery })
        .then(res => {
          // Filter out current logged in user
          const list = (res.academicians || []).filter(a => a.id !== user.id);
          setAllAcademicians(list);
        })
        .catch(err => console.error('Search academicians error:', err));
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [token, searchQuery, user]);

  if (!token || !user) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeContact) return;
    const txt = inputText.trim();
    setInputText('');

    try {
      const res = await sendChatMessage(activeContact.id, txt, token);
      if (res.success && res.message) {
        setMessages(prev => [...prev, res.message]);
      }
    } catch (err) {
      console.error('Send message error:', err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeContact) return;

    setUploadingFile(true);
    try {
      const uploadRes = await uploadChatFile(file, token);
      if (uploadRes.fileUrl) {
        const res = await sendChatMessage(activeContact.id, '', token, uploadRes.fileUrl, uploadRes.fileName);
        if (res.success && res.message) {
          setMessages(prev => [...prev, res.message]);
        }
      }
    } catch (err) {
      alert('Dosya yüklenemedi: ' + err.message);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteMsg = async (msgId) => {
    if (!confirm('Bu mesajı silmek istediğinize emin misiniz?')) return;
    try {
      await deleteChatMessage(msgId, token);
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch (err) {
      alert('Mesaj silinemedi.');
    }
  };

  const getOnlineStatus = (lastActiveAt) => {
    if (!lastActiveAt) return false;
    const diffMins = Math.abs(Math.floor((new Date() - new Date(lastActiveAt)) / 60000));
    return diffMins < 5;
  };

  // Filter existing contacts
  const filteredContacts = contacts.filter(c => 
    c.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selfInitials = user.full_name ? user.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
  const totalUnread = contacts.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  return (
    <div 
      ref={widgetRef}
      style={{
        position: 'fixed',
        bottom: 0,
        right: '24px',
        width: isOpen ? '340px' : '280px',
        height: isOpen ? '500px' : '48px',
        background: 'var(--bg-card)',
        border: totalUnread > 0 && !isOpen ? '1px solid rgba(239, 68, 68, 0.6)' : '1px solid var(--border-color)',
        borderRadius: '12px 12px 0 0',
        boxShadow: totalUnread > 0 && !isOpen ? '0 0 25px rgba(239, 68, 68, 0.4)' : 'var(--shadow-md)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        backdropFilter: 'blur(16px)',
        overflow: 'visible'
      }}
    >
      {/* Floating Unread Alert Popover when closed */}
      {!isOpen && totalUnread > 0 && (
        <div 
          onClick={() => setIsOpen(true)}
          style={{
            position: 'absolute',
            top: '-46px',
            right: '0',
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            color: '#ffffff',
            padding: '0.45rem 0.95rem',
            borderRadius: '8px',
            fontSize: '0.82rem',
            fontWeight: 700,
            boxShadow: '0 4px 15px rgba(239, 68, 68, 0.5), 0 0 10px rgba(239, 68, 68, 0.4)',
            cursor: 'pointer',
            animation: 'fadeInUp 300ms ease-out',
            whiteSpace: 'nowrap',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <span>💬 {totalUnread} Yeni Mesajınız Var!</span>
        </div>
      )}

      {/* HEADER */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          height: '48px',
          padding: '0 1rem',
          background: 'rgba(255,255,255,0.03)',
          borderBottom: isOpen ? '1px solid var(--border-color)' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {/* Self Avatar */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            {user.photo_url ? (
              <img 
                src={user.photo_url} 
                alt={user.full_name} 
                style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }}
              />
            ) : (
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {selfInitials}
              </div>
            )}
            <span style={{ position: 'absolute', bottom: -2, right: -2, width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', border: '2px solid var(--bg-card)' }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Mesajlaşma</span>
          {totalUnread > 0 && (
            <span style={{
              fontSize: '0.72rem',
              background: '#ef4444',
              color: '#fff',
              padding: '0.12rem 0.55rem',
              borderRadius: '999px',
              fontWeight: 800,
              boxShadow: '0 0 10px rgba(239, 68, 68, 0.6)',
              animation: 'pulseGlow 2s infinite ease-in-out'
            }}>
              {totalUnread} Yeni
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }} onClick={e => e.stopPropagation()}>
          <button 
            onClick={() => { setIsOpen(true); setShowSearch(!showSearch); }}
            style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
            title="Yeni Mesaj"
          >
            <Edit3 size={15} />
          </button>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
          >
            {isOpen ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
          </button>
        </div>
      </div>

      {/* CONTENT (Only when open) */}
      {isOpen && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: 'calc(100% - 48px)' }}>
          {activeContact ? (
            /* ACTIVE CHAT AREA */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
              {/* Active Contact Sub-Header */}
              <div style={{ 
                padding: '0.6rem 0.85rem', 
                borderBottom: '1px solid var(--border-color)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                background: 'rgba(255,255,255,0.01)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                  <button 
                    onClick={() => setActiveContact(null)}
                    style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>
                      {activeContact.title} {activeContact.full_name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: getOnlineStatus(activeContact.last_active_at) ? '#10b981' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {getOnlineStatus(activeContact.last_active_at) && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }} />}
                      {getOnlineStatus(activeContact.last_active_at) ? 'Çevrimiçi' : 'Çevrimdışı'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages List */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', padding: '2rem' }}>
                    Henüz mesaj yok. Merhaba deyin!
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.sender_id === user.id;
                    const isImage = msg.file_url && /\.(jpg|jpeg|png|webp|gif)$/i.test(msg.file_url);
                    return (
                      <div 
                        key={msg.id}
                        style={{
                          alignSelf: isMe ? 'flex-end' : 'flex-start',
                          maxWidth: '85%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isMe ? 'flex-end' : 'flex-start'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexDirection: isMe ? 'row-reverse' : 'row', width: '100%' }}>
                          <div style={{
                            background: isMe ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                            color: isMe ? '#fff' : 'var(--text-primary)',
                            padding: '0.5rem 0.75rem',
                            borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                            fontSize: '0.82rem',
                            lineHeight: 1.4,
                            border: isMe ? 'none' : '1px solid var(--border-color)',
                            wordBreak: 'break-word'
                          }}>
                            {msg.file_url ? (
                              isImage ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <img 
                                    src={`${BACKEND_URL}${msg.file_url}`} 
                                    alt={msg.file_name} 
                                    style={{ maxWidth: '100%', maxHeight: '120px', borderRadius: '4px', cursor: 'pointer' }}
                                    onClick={() => window.open(`${BACKEND_URL}${msg.file_url}`, '_blank')}
                                  />
                                  {msg.message && <p style={{ margin: 0, fontSize: '0.78rem' }}>{msg.message}</p>}
                                </div>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <FileText size={16} />
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                                      {msg.file_name}
                                    </div>
                                    <a 
                                      href={`${BACKEND_URL}${msg.file_url}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      style={{ fontSize: '0.7rem', color: isMe ? '#fff' : 'var(--accent-primary)', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '2px', marginTop: '2px' }}
                                    >
                                      <Download size={10} /> İndir
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
                              onClick={() => handleDeleteMsg(msg.id)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                              title="Mesajı Sil"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <form 
                onSubmit={handleSend}
                style={{ 
                  padding: '0.5rem 0.75rem', 
                  borderTop: '1px solid var(--border-color)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  background: 'rgba(255,255,255,0.01)'
                }}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  style={{ display: 'none' }} 
                />
                <button
                  type="button"
                  disabled={uploadingFile}
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}
                >
                  {uploadingFile ? (
                    <div style={{ width: '12px', height: '12px', border: '2px solid var(--text-muted)', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Paperclip size={15} />
                  )}
                </button>
                <input 
                  type="text"
                  required={!uploadingFile}
                  placeholder={uploadingFile ? "Yükleniyor..." : "Mesaj yazın..."}
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  disabled={uploadingFile}
                  style={{ 
                    flex: 1, 
                    background: 'var(--bg-secondary)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '20px', 
                    padding: '0.4rem 0.85rem', 
                    fontSize: '0.82rem',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  style={{ color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          ) : (
            /* CONTACTS LIST AREA */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
              {/* Search Bar */}
              {(showSearch || searchQuery) && (
                <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Search size={14} color="var(--text-muted)" />
                  <input
                    type="text"
                    placeholder="Ara veya yeni sohbet başlat..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      fontSize: '0.8rem',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      <X size={12} />
                    </button>
                  )}
                </div>
              )}

              {/* List Container */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0.4rem' }}>
                {searchQuery.trim() ? (
                  /* SEARCH STATE */
                  <>
                    {/* 1. Existing Contacts Search Results */}
                    {filteredContacts.length > 0 && (
                      <div style={{ marginBottom: '0.75rem' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', padding: '0.25rem 0.5rem', textTransform: 'uppercase' }}>
                          Mevcut Sohbetler
                        </div>
                        {filteredContacts.map(c => (
                          <div 
                            key={c.id}
                            onClick={() => { setActiveContact(c); setSearchQuery(''); setShowSearch(false); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.5rem', borderRadius: '6px', cursor: 'pointer' }}
                            className="chat-contact-item"
                          >
                            <div style={{ position: 'relative' }}>
                              {c.photo_url ? (
                                <img src={c.photo_url} alt={c.full_name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600 }}>
                                  {c.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              {getOnlineStatus(c.last_active_at) && <span style={{ position: 'absolute', bottom: 0, right: 0, width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', border: '1.5px solid var(--bg-card)' }} />}
                            </div>
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{c.title} {c.full_name}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 2. New Academicians Search Results */}
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', padding: '0.25rem 0.5rem', textTransform: 'uppercase' }}>
                        Yeni Sohbet Başlat
                      </div>
                      {allAcademicians.length === 0 ? (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '0.5rem' }}>Eşleşen akademisyen bulunamadı.</div>
                      ) : (
                        allAcademicians.map(a => (
                          <div 
                            key={a.id}
                            onClick={() => { setActiveContact(a); setSearchQuery(''); setShowSearch(false); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.5rem', borderRadius: '6px', cursor: 'pointer' }}
                            className="chat-contact-item"
                          >
                            <div style={{ position: 'relative' }}>
                              {a.photo_url ? (
                                <img src={a.photo_url} alt={a.full_name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600 }}>
                                  {a.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              {getOnlineStatus(a.last_active_at) && <span style={{ position: 'absolute', bottom: 0, right: 0, width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', border: '1.5px solid var(--bg-card)' }} />}
                            </div>
                            <div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{a.title} {a.full_name}</div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{a.department_name}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  /* DEFAULT RECENT CONTACTS STATE */
                  contacts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Aktif bir sohbetiniz bulunmuyor. Yeni bir sohbet başlatmak için arama simgesine tıklayın.
                    </div>
                  ) : (
                    contacts.map(c => {
                      const initials = c.full_name ? c.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
                      return (
                        <div 
                          key={c.id}
                          onClick={() => {
                            setActiveContact(c);
                            setContacts(prev => prev.map(item => item.id === c.id ? { ...item, unread_count: 0 } : item));
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.55rem',
                            padding: '0.55rem 0.75rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            marginBottom: '0.2rem'
                          }}
                          className="chat-contact-item"
                        >
                          <div style={{ position: 'relative', display: 'flex' }}>
                            {c.photo_url ? (
                              <img src={c.photo_url} alt={c.full_name} style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                                {initials}
                              </div>
                            )}
                            {getOnlineStatus(c.last_active_at) && <span style={{ position: 'absolute', bottom: 0, right: 0, width: '9px', height: '9px', borderRadius: '50%', background: '#10b981', border: '1.5px solid var(--bg-card)' }} />}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {c.title} {c.full_name}
                              </span>
                              {c.unread_count > 0 && (
                                <span style={{ background: 'var(--danger)', color: '#fff', fontSize: '0.65rem', padding: '1px 5px', borderRadius: '99px', fontWeight: 800 }}>
                                  {c.unread_count}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                              {c.last_message || 'Dosya paylaştı.'}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
