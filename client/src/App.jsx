import React, { useState } from 'react';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import HomePage from './pages/HomePage';
import AcademiciansPage from './pages/AcademiciansPage';
import AcademicianDetailPage from './pages/AcademicianDetailPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import CreateProjectPage from './pages/CreateProjectPage';
import DashboardPage from './pages/DashboardPage';
import './styles/design-system.css';

export default function App() {
  const [route, setRoute] = useState('home'); // 'home' | 'academicians' | 'academician-detail' | 'projects' | 'project-detail' | 'create-project' | 'dashboard'
  const [routeParam, setRouteParam] = useState(null); // ID for detail pages
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handleNavigate = (page, param = null) => {
    setRoute(page);
    setRouteParam(param);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar
        currentRoute={route}
        onNavigate={handleNavigate}
        onOpenLogin={() => setAuthModalOpen(true)}
      />

      <main style={{ flex: 1 }}>
        {route === 'home' && (
          <HomePage
            onNavigate={handleNavigate}
            onOpenLogin={() => setAuthModalOpen(true)}
          />
        )}

        {route === 'academicians' && (
          <AcademiciansPage
            onNavigate={handleNavigate}
            onOpenLogin={() => setAuthModalOpen(true)}
          />
        )}

        {route === 'academician-detail' && (
          <AcademicianDetailPage
            id={routeParam}
            onNavigate={handleNavigate}
            onOpenClaimModal={() => setAuthModalOpen(true)}
          />
        )}

        {route === 'projects' && (
          <ProjectsPage
            onNavigate={handleNavigate}
            onOpenLogin={() => setAuthModalOpen(true)}
          />
        )}

        {route === 'project-detail' && (
          <ProjectDetailPage
            id={routeParam}
            onNavigate={handleNavigate}
          />
        )}

        {route === 'create-project' && (
          <CreateProjectPage
            onNavigate={handleNavigate}
          />
        )}

        {route === 'dashboard' && (
          <DashboardPage
            onNavigate={handleNavigate}
            routeParam={routeParam}
          />
        )}
      </main>

      {/* FOOTER */}
      <footer style={{
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-color)',
        padding: '3rem 2rem 2.5rem',
        marginTop: 'auto'
      }}>
        <div style={{
          maxWidth: '1240px',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          gap: '2rem',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'var(--font-heading)', marginBottom: '0.4rem' }}>
              AVESİS <span style={{ color: 'var(--accent-primary)' }}>CoMatch</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '420px' }}>
              Recep Tayyip Erdoğan Üniversitesi AVESİS V2 gerçek veri kümesi ile güçlendirilmiş, akademisyenler için akıllı ekip oluşturma ve iş birliği altyapısı.
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            <button onClick={() => handleNavigate('academicians')}>Kayıtlı Akademisyenler (1.233)</button>
            <button onClick={() => handleNavigate('projects')}>Proje İlanları</button>
            <button onClick={() => setAuthModalOpen(true)}>Hesap & Profil Sahiplen</button>
          </div>
        </div>
        <div style={{
          maxWidth: '1240px',
          margin: '1.5rem auto 0',
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.8rem',
          color: 'var(--text-muted)'
        }}>
          <span>© 2026 AVESİS CoMatch Platformu. Tüm Hakları Saklıdır.</span>
          <span>KVKK & GDPR Gizlilik Uyumlu</span>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}
