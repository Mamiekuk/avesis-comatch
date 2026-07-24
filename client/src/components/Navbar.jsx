import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, FolderGit2, PlusCircle, Sun, Moon, LogIn, LayoutDashboard, LogOut, Award, Bell, Megaphone, Menu, X } from 'lucide-react';
import { fetchNotifications, markNotificationsRead } from '../services/api';

export default function Navbar({ currentRoute, onNavigate, onOpenLogin }) {
  const { user, token, theme, toggleTheme, logout } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const handleMobileNav = (route, param) => {
    setMobileMenuOpen(false);
    onNavigate(route, param);
  };

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'var(--bg-glass)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-color)',
      padding: '0.75rem 1.25rem'
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
          onClick={() => handleMobileNav('home')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer' }}
        >
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <Award color="#fff" size={20} />
          </div>
          <div>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'var(--font-heading)', letterSpacing: '-0.5px' }}>
              AVESİS <span style={{ color: 'var(--accent-primary)' }}>CoMatch</span>
            </span>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500 }} className="desktop-only">
              Akademik Ekip & Keşif Platformu
            </div>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <div className="nav-desktop-links" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            onClick={() => onNavigate('academicians')}
            style={{
              padding: '0.55rem 0.95rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '0.88rem',
              color: currentRoute === 'academicians' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              background: currentRoute === 'academicians' ? 'rgba(56, 149, 255, 0.12)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s'
            }}
          >
            <Users size={17} />
            <span>Tüm Akademisyenler (1.233)</span>
          </button>

          <button
            onClick={() => onNavigate('projects')}
            style={{
              padding: '0.55rem 0.95rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '0.88rem',
              color: currentRoute === 'projects' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              background: currentRoute === 'projects' ? 'rgba(56, 149, 255, 0.12)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s'
            }}
          >
            <FolderGit2 size={17} />
            <span>Akademik Projeler</span>
          </button>

          <button
            onClick={() => onNavigate('announcements')}
            style={{
              padding: '0.55rem 0.95rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '0.88rem',
              color: currentRoute === 'announcements' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              background: currentRoute === 'announcements' ? 'rgba(56, 149, 255, 0.12)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s'
            }}
          >
            <Megaphone size={17} />
            <span>Çağrı Duyuruları</span>
          </button>

          <button
            onClick={() => {
              if (user) onNavigate('create-project');
              else onOpenLogin();
            }}
            className="btn-primary"
            style={{ padding: '0.55rem 1.1rem', fontSize: '0.88rem' }}
          >
            <PlusCircle size={17} />
            <span>Proje Oluştur</span>
          </button>
        </div>

        {/* Right Side: Theme Switch, Notification Bell & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            onClick={toggleTheme}
            title="Tema Değiştir"
            style={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)'
            }}
          >
            {theme === 'dark' ? <Sun size={17} color="#fbbf24" /> : <Moon size={17} />}
          </button>

          {/* Notification Bell Icon & Dropdown */}
          {user && (
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                title="Bildirimler"
                style={{
                  width: 36,
                  height: 36,
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
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    background: '#ef4444',
                    color: '#fff',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    width: 17,
                    height: 17,
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
                  top: '44px',
                  right: 0,
                  width: '320px',
                  maxWidth: '90vw',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-md), 0 0 25px rgba(0,0,0,0.5)',
                  padding: '0.85rem',
                  zIndex: 200,
                  animation: 'scaleIn 200ms ease-out'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Bell size={15} color="var(--accent-primary)" />
                      <span>Bildirimler</span>
                      {unreadCount > 0 && (
                        <span style={{ fontSize: '0.7rem', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '0.1rem 0.4rem', borderRadius: '999px', fontWeight: 700 }}>
                          {unreadCount} yeni
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkRead}
                        style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', fontWeight: 600 }}
                      >
                        Tümünü Okundu İşaretle
                      </button>
                    )}
                  </div>

                  <div style={{ maxHeight: '260px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {notifications.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '1.25rem 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        Henüz bildiriminiz yok.
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => handleNotifClick(n)}
                          style={{
                            padding: '0.6rem 0.75rem',
                            borderRadius: 'var(--radius-md)',
                            background: n.is_read ? 'transparent' : 'rgba(56, 149, 255, 0.08)',
                            border: n.is_read ? '1px solid transparent' : '1px solid rgba(56, 149, 255, 0.2)',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                            {n.title}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            {n.body}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            {new Date(n.created_at).toLocaleDateString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Desktop User Panel / Login Buttons */}
          <div className="nav-desktop-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {user ? (
              <>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="btn-secondary"
                  style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem' }}
                >
                  <LayoutDashboard size={15} />
                  <span>Panelim</span>
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
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <button
                onClick={onOpenLogin}
                className="btn-secondary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                <LogIn size={15} />
                <span>Giriş Yap</span>
              </button>
            )}
          </div>

          {/* Mobile Hamburger Menu Button */}
          <button
            className="nav-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            title="Mobil Menü"
            style={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)',
              background: mobileMenuOpen ? 'rgba(56, 149, 255, 0.15)' : 'transparent'
            }}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* MOBILE DROPDOWN OVERLAY MENU */}
      {mobileMenuOpen && (
        <div className="nav-mobile-menu" style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-md)',
          padding: '1rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
          zIndex: 150,
          animation: 'fadeInUp 200ms ease-out'
        }}>
          <button
            onClick={() => handleMobileNav('academicians')}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '0.92rem',
              color: currentRoute === 'academicians' ? 'var(--accent-primary)' : 'var(--text-primary)',
              background: currentRoute === 'academicians' ? 'rgba(56, 149, 255, 0.15)' : 'var(--bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem'
            }}
          >
            <Users size={18} />
            <span>Tüm Akademisyenler (1.233)</span>
          </button>

          <button
            onClick={() => handleMobileNav('projects')}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '0.92rem',
              color: currentRoute === 'projects' ? 'var(--accent-primary)' : 'var(--text-primary)',
              background: currentRoute === 'projects' ? 'rgba(56, 149, 255, 0.15)' : 'var(--bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem'
            }}
          >
            <FolderGit2 size={18} />
            <span>Akademik Projeler</span>
          </button>

          <button
            onClick={() => handleMobileNav('announcements')}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '0.92rem',
              color: currentRoute === 'announcements' ? 'var(--accent-primary)' : 'var(--text-primary)',
              background: currentRoute === 'announcements' ? 'rgba(56, 149, 255, 0.15)' : 'var(--bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem'
            }}
          >
            <Megaphone size={18} />
            <span>Çağrı Duyuruları</span>
          </button>

          <button
            onClick={() => {
              if (user) handleMobileNav('create-project');
              else { setMobileMenuOpen(false); onOpenLogin(); }
            }}
            className="btn-primary"
            style={{ padding: '0.75rem 1rem', fontSize: '0.92rem', width: '100%', justifyContent: 'center' }}
          >
            <PlusCircle size={18} />
            <span>Proje Oluştur</span>
          </button>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.65rem', marginTop: '0.25rem', display: 'flex', gap: '0.65rem' }}>
            {user ? (
              <>
                <button
                  onClick={() => handleMobileNav('dashboard')}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '0.75rem 1rem', fontSize: '0.9rem', justifyContent: 'center' }}
                >
                  <LayoutDashboard size={18} />
                  <span>Panelim ({user.full_name.split(' ')[0]})</span>
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); logout(); }}
                  className="btn-secondary"
                  style={{ padding: '0.75rem 1rem', color: 'var(--danger)' }}
                  title="Çıkış Yap"
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <button
                onClick={() => { setMobileMenuOpen(false); onOpenLogin(); }}
                className="btn-secondary"
                style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '0.9rem', justifyContent: 'center' }}
              >
                <LogIn size={18} />
                <span>Giriş Yap / Profil Sahiplen</span>
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
