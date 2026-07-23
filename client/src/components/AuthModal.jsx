import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { loginUser, claimProfile, sendClaimVerificationCode, verifyClaimAndActivate, registerUser, fetchAcademicians, fetchMetadata, sendForgotPasswordCode, resetForgotPassword } from '../services/api';
import { X, CheckCircle2, ShieldCheck, Mail, Lock, UserCheck, AlertTriangle, KeyRound, ArrowLeft, RefreshCw } from 'lucide-react';

export default function AuthModal({ isOpen, onClose }) {
  const { login } = useAuth();
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'claim' | 'forgot'
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

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState('send'); // 'send' | 'reset'
  const [forgotCode, setForgotCode] = useState('');
  const [simulatedResetCode, setSimulatedResetCode] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

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
    setSuccessMsg(null);
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
    setSuccessMsg(null);
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

  const handleSendForgotCode = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      return setError('Lütfen kurumsal e-posta adresinizi giriniz.');
    }
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const res = await sendForgotPasswordCode(forgotEmail);
      setSimulatedResetCode(res.simulatedCode);
      if (res.simulatedCode) {
        setForgotCode(res.simulatedCode);
      }
      setSuccessMsg(res.message);
      setForgotStep('reset');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    if (!forgotCode || !newPassword || !confirmNewPassword) {
      return setError('Lütfen tüm alanları doldurunuz.');
    }
    if (newPassword !== confirmNewPassword) {
      return setError('Girdiğiniz yeni şifreler birbirleriyle eşleşmiyor.');
    }
    if (newPassword.length < 6) {
      return setError('Yeni şifreniz en az 6 karakter olmalıdır.');
    }
    setLoading(true);
    try {
      const res = await resetForgotPassword(forgotEmail, forgotCode, newPassword);
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
            <h3 style={{ fontSize: '1.4rem' }}>
              {activeTab === 'forgot' ? 'Şifremi Unuttum & Sıfırlama' : 'Akademisyen Girişi & Aktivasyon'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Recep Tayyip Erdoğan Üniversitesi AVESİS platform hesabı
            </p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)' }}>
            <X size={22} />
          </button>
        </div>

        {/* Tab Selector */}
        {activeTab !== 'forgot' && (
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
              onClick={() => { setActiveTab('login'); setError(null); setSuccessMsg(null); }}
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
              onClick={() => { setActiveTab('claim'); setError(null); setSuccessMsg(null); }}
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
        )}

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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>
                  Şifre
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('forgot');
                    setError(null);
                    setSuccessMsg(null);
                    setForgotEmail(loginEmail || '');
                    setForgotStep('send');
                  }}
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--accent-primary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    padding: 0
                  }}
                >
                  Şifremi Unuttum?
                </button>
              </div>
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
                  Prof. Dr. Veli Süme (İnşaat Müh.)
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: CLAIM PROFILE */}
        {activeTab === 'claim' && (
          <div>
            {claimStep === 'form' ? (
              <form onSubmit={handleSendClaimCode}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    1. AVESİS Veritabanında İsminizi / Profilinizi Bulun
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Adınız Soyadınız (Örn: Ali Ban, Zeynep Gümrükçü...)"
                      value={searchName}
                      onChange={e => setSearchName(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={handleSearchAcademician}
                      className="btn-secondary"
                      style={{ padding: '0.6rem 1.2rem', flexShrink: 0 }}
                    >
                      Profil Ara
                    </button>
                  </div>
                </div>

                {candidateList.length > 0 && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      Eşleşen Akademisyen Profilleri ({candidateList.length}):
                    </label>
                    <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                      {candidateList.map(item => (
                        <div
                          key={item.id}
                          onClick={() => {
                            setSelectedAcademician(item);
                            if (item.email) setClaimEmail(item.email);
                          }}
                          style={{
                            padding: '0.75rem 1rem',
                            borderBottom: '1px solid var(--border-color)',
                            cursor: 'pointer',
                            background: selectedAcademician?.id === item.id ? 'rgba(56, 149, 255, 0.15)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                              {item.title} {item.full_name}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {item.faculty_name} — {item.department_name}
                            </div>
                          </div>
                          {item.is_claimed ? (
                            <span className="badge badge-claimed">Aktif Profil</span>
                          ) : (
                            <span className="badge badge-unclaimed">Sahiplenilmedi</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAcademician && (
                  <>
                    <div style={{ padding: '0.85rem 1rem', background: 'rgba(56, 149, 255, 0.1)', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', border: '1px solid rgba(56, 149, 255, 0.3)' }}>
                      <div style={{ fontSize: '0.82rem', color: 'var(--accent-primary)', fontWeight: 700, marginBottom: '0.2rem' }}>
                        SEÇİLEN AKADEMİSYEN PROFİLİ:
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                        {selectedAcademician.title} {selectedAcademician.full_name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {selectedAcademician.faculty_name} — {selectedAcademician.department_name}
                      </div>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                        2. Kurumsal E-posta Adresiniz (@erdogan.edu.tr)
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

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary"
                      style={{ width: '100%' }}
                    >
                      {loading ? 'Doğrulama Kodu Gönderiliyor...' : 'E-postama Doğrulama Kodu Gönder'}
                    </button>
                  </>
                )}
              </form>
            ) : (
              <form onSubmit={handleVerifyClaimSubmit}>
                <div style={{
                  padding: '1rem',
                  background: 'rgba(56, 149, 255, 0.1)',
                  border: '1px solid rgba(56, 149, 255, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.25rem'
                }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '0.3rem' }}>
                    ✉️ DOĞRULAMA KODU GÖNDERİLDİ:
                  </div>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                    <strong>{claimEmail}</strong> adresine 6 haneli doğrulama kodu iletildi.
                  </div>
                  {simulatedOtp && (
                    <div style={{ marginTop: '0.6rem', fontSize: '0.82rem', background: 'rgba(245, 158, 11, 0.15)', padding: '0.4rem 0.75rem', borderRadius: '6px', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                      🔑 Simülasyon Kodu: <strong>{simulatedOtp}</strong>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    6 Haneli E-posta Doğrulama Kodu
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    className="form-input"
                    placeholder="123456"
                    style={{ letterSpacing: '4px', fontSize: '1.1rem', fontWeight: 700, textAlign: 'center' }}
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value)}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Yeni Platform Şifreniz
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    className="form-input"
                    placeholder="••••••••"
                    value={claimPassword}
                    onChange={e => setClaimPassword(e.target.value)}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Kısa Biyografi / İlgi Alanlarınız (İsteğe Bağlı)
                  </label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder="İş birliği yapmak istediğiniz konular..."
                    value={claimBio}
                    onChange={e => setClaimBio(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setClaimStep('form')}
                    className="btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Geri
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                    style={{ flex: 2 }}
                  >
                    {loading ? 'Hesap Etkinleştiriliyor...' : 'Doğrula ve Hesabı Etkinleştir'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 3: FORGOT PASSWORD */}
        {activeTab === 'forgot' && (
          <div>
            {forgotStep === 'send' ? (
              <form onSubmit={handleSendForgotCode}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Kayıtlı Kurumsal E-posta Adresiniz
                  </label>
                  <input
                    type="email"
                    required
                    className="form-input"
                    placeholder="ornek@erdogan.edu.tr"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                  />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.4rem' }}>
                    Hesabınıza tanımlı e-posta adresinize 6 haneli doğrulama kodu gönderilecektir.
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('login'); setError(null); setSuccessMsg(null); }}
                    className="btn-secondary"
                    style={{ flex: 1 }}
                  >
                    <ArrowLeft size={16} /> Giriş Ekranına Dön
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                    style={{ flex: 2 }}
                  >
                    {loading ? 'Kod Gönderiliyor...' : 'Şifre Sıfırlama Kodu Gönder'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPasswordSubmit}>
                <div style={{
                  padding: '1rem',
                  background: 'rgba(56, 149, 255, 0.1)',
                  border: '1px solid rgba(56, 149, 255, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.25rem'
                }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '0.3rem' }}>
                    ✉️ ŞİFRE SIFIRLAMA KODU İLETİLDİ:
                  </div>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                    <strong>{forgotEmail}</strong> adresine doğrulama kodu gönderilmiştir.
                  </div>
                  {simulatedResetCode && (
                    <div style={{ marginTop: '0.6rem', fontSize: '0.82rem', background: 'rgba(245, 158, 11, 0.15)', padding: '0.4rem 0.75rem', borderRadius: '6px', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                      🔑 Simülasyon Kodu: <strong>{simulatedResetCode}</strong>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    6 Haneli Şifre Sıfırlama Kodu
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    className="form-input"
                    placeholder="123456"
                    style={{ letterSpacing: '4px', fontSize: '1.1rem', fontWeight: 700, textAlign: 'center' }}
                    value={forgotCode}
                    onChange={e => setForgotCode(e.target.value)}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Yeni Şifreniz
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    className="form-input"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Yeni Şifreniz (Tekrar)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    className="form-input"
                    placeholder="••••••••"
                    value={confirmNewPassword}
                    onChange={e => setConfirmNewPassword(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => { setForgotStep('send'); setError(null); setSuccessMsg(null); }}
                    className="btn-secondary"
                    style={{ flex: 1 }}
                  >
                    <ArrowLeft size={16} /> E-posta Değiştir
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                    style={{ flex: 2 }}
                  >
                    {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle & Giriş Yap'}
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
