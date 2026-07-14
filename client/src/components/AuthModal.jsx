import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { loginUser, claimProfile, sendClaimVerificationCode, verifyClaimAndActivate, registerUser, fetchAcademicians, fetchMetadata } from '../services/api';
import { X, CheckCircle2, ShieldCheck, Mail, Lock, UserCheck, AlertTriangle, KeyRound, ArrowLeft } from 'lucide-react';

export default function AuthModal({ isOpen, onClose }) {
  const { login } = useAuth();
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'claim' | 'register'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Claim Form State
  const [searchName, setSearchName] = useState('');
  const [candidateList, setCandidateList] = useState([]);
  const [selectedAcademician, setSelectedAcademician] = useState(null);
  const [claimEmail, setClaimEmail] = useState('');
  const [claimPassword, setClaimPassword] = useState('');
  const [claimBio, setClaimBio] = useState('');
  const [claimStep, setClaimStep] = useState('form'); // 'form' | 'otp'
  const [otpCode, setOtpCode] = useState('');
  const [simulatedOtp, setSimulatedOtp] = useState(null);

  // Metadata for register
  const [faculties, setFaculties] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchMetadata().then(d => setFaculties(d.faculties || [])).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await loginUser(loginEmail, loginPassword);
      login(res.token, res.user);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchAcademician = async () => {
    if (!searchName.trim() || searchName.length < 2) return;
    setError(null);
    try {
      const res = await fetchAcademicians({ search: searchName, limit: 10 });
      setCandidateList(res.academicians || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSendClaimCode = async (e) => {
    e.preventDefault();
    if (!selectedAcademician) {
      return setError('Lütfen önce sahipleneceğiniz profili seçin.');
    }
    setError(null);
    setLoading(true);
    try {
      const res = await sendClaimVerificationCode(selectedAcademician.id, claimEmail);
      setSimulatedOtp(res.simulatedCode);
      setOtpCode(res.simulatedCode || '');
      setClaimStep('otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyClaimSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await verifyClaimAndActivate({
        academicianId: selectedAcademician.id,
        email: claimEmail,
        password: claimPassword,
        bio: claimBio,
        code: otpCode
      });
      login(res.token, res.user);
      setSuccessMsg(res.message);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillDemoLogin = (email, pwd = '123456') => {
    setLoginEmail(email);
    setLoginPassword(pwd);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.4rem' }}>Akademisyen Girişi & Aktivasyon</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Recep Tayyip Erdoğan Üniversitesi AVESİS platform hesabı
            </p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)' }}>
            <X size={22} />
          </button>
        </div>

        {/* Tab Selector */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.5rem',
          background: 'var(--bg-secondary)',
          padding: '0.35rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem'
        }}>
          <button
            onClick={() => { setActiveTab('login'); setError(null); }}
            style={{
              padding: '0.65rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.9rem',
              background: activeTab === 'login' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'login' ? '#fff' : 'var(--text-secondary)'
            }}
          >
            Hesap Girişi
          </button>
          <button
            onClick={() => { setActiveTab('claim'); setError(null); }}
            style={{
              padding: '0.65rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.9rem',
              background: activeTab === 'claim' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'claim' ? '#fff' : 'var(--text-secondary)'
            }}
          >
            AVESİS Profili Sahiplen
          </button>
        </div>

        {error && (
          <div style={{
            padding: '0.85rem 1rem',
            background: 'var(--danger-bg)',
            color: 'var(--danger)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.9rem'
          }}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div style={{
            padding: '0.85rem 1rem',
            background: 'var(--success-bg)',
            color: 'var(--success)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 1: LOGIN */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Kurumsal E-posta Adresi
              </label>
              <input
                type="email"
                required
                className="form-input"
                placeholder="ornek@erdogan.edu.tr"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Şifre
              </label>
              <input
                type="password"
                required
                className="form-input"
                placeholder="••••••••"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', marginBottom: '1.5rem' }}
            >
              {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
            </button>

            {/* Quick Test Accounts Banner */}
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px dashed var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem'
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
                ⚡ HIZLI TEST İÇİN ÖRNEK AKTİF AKADEMİSYEN HESAPLARI:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => fillDemoLogin('murat.yaylaci@erdogan.edu.tr')}
                  style={{
                    fontSize: '0.78rem',
                    padding: '0.4rem 0.75rem',
                    background: 'rgba(56, 149, 255, 0.15)',
                    color: 'var(--accent-primary)',
                    borderRadius: '6px',
                    fontWeight: 600
                  }}
                >
                  Prof. Dr. Murat Yaylacı (İnşaat Müh.)
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoLogin('zeynep.gumrukcu@erdogan.edu.tr')}
                  style={{
                    fontSize: '0.78rem',
                    padding: '0.4rem 0.75rem',
                    background: 'rgba(56, 149, 255, 0.15)',
                    color: 'var(--accent-primary)',
                    borderRadius: '6px',
                    fontWeight: 600
                  }}
                >
                  Prof. Dr. Zeynep Gümrükçü (Diş Hek.)
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoLogin('veli.sume@erdogan.edu.tr')}
                  style={{
                    fontSize: '0.78rem',
                    padding: '0.4rem 0.75rem',
                    background: 'rgba(56, 149, 255, 0.15)',
                    color: 'var(--accent-primary)',
                    borderRadius: '6px',
                    fontWeight: 600
                  }}
                >
                  Prof. Dr. Veli Süme
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: CLAIM UNCLAIMED PROFILE */}
        {activeTab === 'claim' && (
          <div>
            <div style={{
              padding: '0.85rem 1rem',
              background: 'rgba(56, 149, 255, 0.1)',
              border: '1px solid rgba(56, 149, 255, 0.2)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.25rem',
              fontSize: '0.88rem'
            }}>
              <strong>📌 Nasıl Çalışır?</strong> AVESİS veri setindeki 1.233 akademisyen arasından adınızı aratıp profilinizi seçin. Doğrulamayı yalnızca <code>@erdogan.edu.tr</code> uzantılı kurumsal e-posta adresinizle yapabilirsiniz.
            </div>

            {/* Step 1: Search profile */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                1. Adınızı veya Unvanınızı Arayın
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Örn: Fatih Eren veya Semra"
                  value={searchName}
                  onChange={e => setSearchName(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleSearchAcademician}
                  className="btn-secondary"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Bul
                </button>
              </div>

              {candidateList.length > 0 && (
                <div style={{
                  marginTop: '0.75rem',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)'
                }}>
                  {candidateList.map(item => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedAcademician(item)}
                      style={{
                        padding: '0.65rem 1rem',
                        borderBottom: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        background: selectedAcademician?.id === item.id ? 'rgba(56, 149, 255, 0.2)' : 'transparent',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.title} {item.full_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.faculty_name} — {item.department_name}</div>
                      </div>
                      {item.is_claimed ? (
                        <span style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 600 }}>Aktif Hesap</span>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: 'var(--warning)', fontWeight: 600 }}>Sahiplenilmemiş</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedAcademician && claimStep === 'form' && (
              <form onSubmit={handleSendClaimCode} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  marginBottom: '1rem'
                }}>
                  <strong>Seçilen Profil:</strong> {selectedAcademician.title} {selectedAcademician.full_name}
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    2. Kurumsal E-posta (@erdogan.edu.tr)
                  </label>
                  <input
                    type="email"
                    required
                    className="form-input"
                    placeholder="ad.soyad@erdogan.edu.tr"
                    value={claimEmail}
                    onChange={e => setClaimEmail(e.target.value)}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    3. Hesap Şifresi Belirleyin
                  </label>
                  <input
                    type="password"
                    required
                    className="form-input"
                    placeholder="En az 6 karakter"
                    value={claimPassword}
                    onChange={e => setClaimPassword(e.target.value)}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    4. Kısa Biyografi (Opsiyonel)
                  </label>
                  <textarea
                    rows={2}
                    className="form-textarea"
                    placeholder="Çalışma alanlarınız ve ilgi alanlarınız..."
                    value={claimBio}
                    onChange={e => setClaimBio(e.target.value)}
                  />
                </div>

                <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%' }}>
                  <Mail size={18} />
                  <span>{loading ? 'Kod Gönderiliyor...' : 'Doğrulama Kodu Gönder'}</span>
                </button>
              </form>
            )}

            {selectedAcademician && claimStep === 'otp' && (
              <form onSubmit={handleVerifyClaimSubmit} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <div style={{
                  background: 'rgba(56, 149, 255, 0.1)',
                  border: '1px solid rgba(56, 149, 255, 0.3)',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginBottom: '1.25rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '0.35rem' }}>
                    <KeyRound size={18} />
                    <span>5. E-posta Doğrulama Kodu (2 Adımlı Onay)</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    <strong>{claimEmail}</strong> kurumsal e-posta adresinize 6 haneli doğrulama kodu iletildi.
                  </p>

                  {simulatedOtp && (
                    <div style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px dashed var(--success)',
                      color: 'var(--success)',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontWeight: 700
                    }}>
                      ⚡ E-Posta Simülasyonu Gelen Kod: <span style={{ letterSpacing: '2px', fontSize: '1rem' }}>{simulatedOtp}</span>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    6 Haneli Doğrulama Kodunu Girin
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    className="form-input"
                    placeholder="Örn: 482915"
                    style={{ fontSize: '1.25rem', letterSpacing: '4px', textAlign: 'center', fontWeight: 800 }}
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setClaimStep('form')}
                    className="btn-secondary"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  >
                    <ArrowLeft size={16} />
                    <span>Geri Dön</span>
                  </button>
                  <button type="submit" disabled={loading} className="btn-primary" style={{ flex: 2 }}>
                    <UserCheck size={18} />
                    <span>{loading ? 'Doğrulanıyor...' : 'Doğrula ve Profili Aktif Et'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
