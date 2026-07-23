import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, FolderGit2, PlusCircle, Sun, Moon, LogIn, LayoutDashboard, LogOut, Award, Bell, CheckCircle2, ExternalLink } from 'lucide-react';
import { fetchNotifications, markNotificationsRead } from '../services/api';

export default function Navbar({ currentRoute, onNavigate, onOpenLogin }) {
  const { user, token, theme, toggleTheme, logout } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!user || !token) return;

    const loadNotifications = () => {
      fetchNotifications(token)
        .then(res => {
          setNotifications(res.notifications || []);
          setUnreadCount(res.unreadCount || 0);
        })
        .catch(() => {});
    };

    loadNotifications();
    const interval = setInterval(loadNotifications, 6000);
    return () => clearInterval(interval);
  }, [user, token]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async () => {
    if (!token) return;
    try {
      await markNotificationsRead(token);
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (e) {}
  };

  const handleNotifClick = (notif) => {
    setNotifOpen(false);
    if (notif.link) {
      if (notif.link.includes('project-detail')) {
        const urlParams = new URLSearchParams(notif.link.split('?')[1]);
        const id = urlParams.get('id');
        if (id) onNavigate('project-detail', id);
        else onNavigate('dashboard');
      } else {
        onNavigate('dashboard');
      }
    } else {
      onNavigate('dashboard');
    }
  };

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'var(--bg-glass)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-color)',
      padding: '0.85rem 2rem'
    }}>
      <div style={{
        maxWidth: '1360px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Brand Logo */}
        <div 
          onClick={() => onNavigate('home')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
        >
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '12px',
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <Award color="#fff" size={22} />
          </div>
          <div>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-heading)', letterSpacing: '-0.5px' }}>
              AVESİS <span style={{ color: 'var(--accent-primary)' }}>CoMatch</span>
            </span>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Akademik Ekip & Keşif Platformu
            </div>
          </div>
        </div>

        {/* Center Navigation Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => onNavigate('academicians')}
            style={{
              padding: '0.55rem 1.1rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '0.9rem',
              color: currentRoute === 'academicians' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              background: currentRoute === 'academicians' ? 'rgba(56, 149, 255, 0.12)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              transition: 'all 0.2s'
            }}
          >
            <Users size={18} />
            <span>Tüm Akademisyenler (1.233)</span>
          </button>

          <button
            onClick={() => onNavigate('projects')}
            style={{
              padding: '0.55rem 1.1rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '0.9rem',
              color: currentRoute === 'projects' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              background: currentRoute === 'projects' ? 'rgba(56, 149, 255, 0.12)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              transition: 'all 0.2s'
            }}
          >
            <FolderGit2 size={18} />
            <span>Akademik Projeler</span>
          </button>

          <button
            onClick={() => {
              if (user) onNavigate('create-project');
              else onOpenLogin();
            }}
            className="btn-primary"
            style={{ padding: '0.55rem 1.15rem', fontSize: '0.9rem' }}
          >
            <PlusCircle size={18} />
            <span>Proje Oluştur</span>
          </button>
        </div>

        {/* Right Side: Theme Switch, Notification Bell & User Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button
            onClick={toggleTheme}
            title="Tema Değiştir"
            style={{
              width: 38,
              height: 38,
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)'
            }}
          >
            {theme === 'dark' ? <Sun size={18} color="#fbbf24" /> : <Moon size={18} />}
          </button>

          {/* Notification Bell Icon & Dropdown */}
          {user && (
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                title="Bildirimler"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '10px',
                  border: unreadCount > 0 ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid var(--border-color)',
                  background: unreadCount > 0 ? 'rgba(239, 68, 68, 0.12)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: unreadCount > 0 ? '#ef4444' : 'var(--text-secondary)',
                  position: 'relative',
                  cursor: 'pointer'
                }}
              >
                <Bell size={19} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: -5,
                    right: -5,
                    background: '#ef4444',
                    color: '#fff',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 10px rgba(239, 68, 68, 0.6)'
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Menu */}
              {notifOpen && (
                <div style={{
                  position: 'absolute',
                  top: '48px',
                  right: 0,
                  width: '340px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-md), 0 0 25px rgba(0,0,0,0.5)',
                  padding: '1rem',
                  zIndex: 200,
                  animation: 'scaleIn 200ms ease-out'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Bell size={16} color="var(--accent-primary)" />
                      <span>Bildirimler</span>
                      {unreadCount > 0 && (
                        <span style={{ fontSize: '0.72rem', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '0.1rem 0.5rem', borderRadius: '999px', fontWeight: 700 }}>
                          {unreadCount} yeni
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkRead}
                        style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}
                      >
                        Tümünü Okundu İşaretle
                      </button>
                    )}
                  </div>

                  <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {notifications.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        Henüz bildiriminiz yok.
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => handleNotifClick(n)}
                          style={{
                            padding: '0.65rem 0.85rem',
                            borderRadius: 'var(--radius-md)',
                            background: n.is_read ? 'transparent' : 'rgba(56, 149, 255, 0.08)',
                            border: n.is_read ? '1px solid transparent' : '1px solid rgba(56, 149, 255, 0.2)',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                            {n.title}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            {n.body}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <span>{new Date(n.created_at).toLocaleDateString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={() => onNavigate('dashboard')}
                className="btn-secondary"
                style={{ padding: '0.5rem 0.95rem', fontSize: '0.88rem' }}
              >
                <LayoutDashboard size={16} />
                <span>Panelim ({user.full_name.split(' ')[0]})</span>
              </button>
              <button
                onClick={logout}
                title="Çıkış Yap"
                style={{
                  padding: '0.5rem',
                  borderRadius: '10px',
                  color: 'var(--danger)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <LogOut size={17} />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="btn-secondary"
              style={{ padding: '0.55rem 1.15rem', fontSize: '0.88rem' }}
            >
              <LogIn size={16} />
              <span>Giriş / Profil Sahiplen</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
