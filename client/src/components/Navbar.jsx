import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, FolderGit2, PlusCircle, Sun, Moon, LogIn, LayoutDashboard, LogOut, Award } from 'lucide-react';

export default function Navbar({ currentRoute, onNavigate, onOpenLogin }) {
  const { user, theme, toggleTheme, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

        {/* Navigation Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {/* ALWAYS VISIBLE CRITICAL LINK: TÜM AKADEMİSYENLER */}
          <button
            onClick={() => onNavigate('academicians')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              color: currentRoute === 'academicians' ? 'var(--accent-primary)' : 'var(--text-primary)',
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              background: currentRoute === 'academicians' ? 'rgba(56, 149, 255, 0.12)' : 'transparent',
              transition: 'all 150ms'
            }}
          >
            <Users size={18} />
            <span>Tüm Akademisyenler (1.233)</span>
          </button>

          <button
            onClick={() => onNavigate('projects')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              color: currentRoute === 'projects' ? 'var(--accent-primary)' : 'var(--text-primary)',
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              background: currentRoute === 'projects' ? 'rgba(56, 149, 255, 0.12)' : 'transparent'
            }}
          >
            <FolderGit2 size={18} />
            <span>Akademik Projeler</span>
          </button>

          {/* CTA: Proje Oluştur */}
          <button
            onClick={() => {
              if (!user) onOpenLogin();
              else onNavigate('create-project');
            }}
            className="btn-primary"
            style={{ padding: '0.55rem 1.15rem', fontSize: '0.9rem' }}
          >
            <PlusCircle size={18} />
            <span>Proje Oluştur</span>
          </button>
        </div>

        {/* Right Side: Theme Switch & User Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
