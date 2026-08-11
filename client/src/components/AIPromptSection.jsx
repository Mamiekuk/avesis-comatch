import React, { useState } from 'react';
import { Sparkles, Search, Send, UserCheck, CheckCircle2, ArrowRight, X, BookOpen, Building2, ShieldCheck, Mail } from 'lucide-react';
import { postPromptMatch } from '../services/api';

export default function AIPromptSection({ onNavigate, onOpenChat }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  const samplePrompts = [
    '☕ Çay demleme koşulları, akrilamid ve gıda riski analizi yapacak akademisyen ekibi arıyorum',
    '🤖 Tıbbi görüntüleme ve EKG verileriyle çalışacak Yapay Zeka ve Biyoenformatik uzmanı hocalar',
    '🌾 Sürdürülebilir tarım, toprak analizi ve çevre teknolojileri üzerine akademisyen eşleştirmesi'
  ];

  const handleMatch = async (textToSubmit) => {
    const query = textToSubmit || prompt;
    if (!query || query.trim().length < 3) {
      setError('Lütfen projeniz veya fikir açıklamanız için birkaç kelime yazın.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await postPromptMatch(query);
      setResults(res);
    } catch (err) {
      setError(err.message || 'Akıllı eşleştirme yapılırken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      margin: '0 auto 2rem auto',
      width: '100%',
      maxWidth: '1000px',
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9))',
      border: '1px solid rgba(56, 189, 248, 0.3)',
      borderRadius: '24px',
      padding: '2rem',
      boxShadow: '0 20px 40px -15px rgba(14, 165, 233, 0.2)',
      backdropFilter: 'blur(16px)',
      color: '#f8fafc'
    }}>
      {/* Header Badge & Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(99, 102, 241, 0.2))',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          borderRadius: '9999px',
          padding: '0.35rem 1rem',
          fontSize: '0.85rem',
          fontWeight: 600,
          color: '#38bdf8'
        }}>
          <Sparkles size={16} />
          Yapay Zeka Akıllı Proje & Ekip Arkadaşı Önerici
        </div>
      </div>

      <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem', color: '#ffffff' }}>
        Projeniz İçin En Uyumlu Akademisyenleri Yapay Zekayla Keşfedin
      </h2>
      <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
        Projenizi veya aradığınız uzmanlığı birkaç cümleyle anlatın. Akıllı NLP eşleştirme motorumuz, üniversitemizdeki 1.230+ akademisyenin yayınlarını ve etiketlerini analiz ederek en uyumlu ekibi saniyeler içinde önersin.
      </p>

      {/* Input Box */}
      <div style={{ position: 'relative', marginBottom: '1rem' }}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleMatch();
            }
          }}
          placeholder='Örn: "Rize çayında akrilamid ve karsinojenik risk analizi yapacak gıda mühendisi ve biyoenformatikçi hocalar arıyorum..."'
          rows={3}
          style={{
            width: '100%',
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1.5px solid rgba(56, 189, 248, 0.4)',
            borderRadius: '16px',
            padding: '1rem 7.5rem 1rem 1.25rem',
            color: '#ffffff',
            fontSize: '1rem',
            lineHeight: 1.5,
            resize: 'vertical',
            outline: 'none',
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)',
            transition: 'all 0.2s ease'
          }}
        />

        <button
          onClick={() => handleMatch()}
          disabled={loading || !prompt.trim()}
          style={{
            position: 'absolute',
            right: '0.75rem',
            bottom: '1rem',
            background: loading || !prompt.trim()
              ? 'rgba(51, 65, 85, 0.6)'
              : 'linear-gradient(135deg, #0284c7, #4f46e5)',
            border: 'none',
            borderRadius: '12px',
            padding: '0.65rem 1.25rem',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 14px rgba(14, 165, 233, 0.3)',
            transition: 'transform 0.15s ease'
          }}
        >
          {loading ? (
            <>
              <div className="spinner-border spinner-border-sm" role="status" style={{ width: '14px', height: '14px' }}></div>
              Analiz Ediliyor...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Hocaları Öner
            </>
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '12px',
          padding: '0.75rem 1rem',
          color: '#fca5a5',
          fontSize: '0.9rem',
          marginBottom: '1rem'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Example Prompt Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.825rem', color: '#64748b', fontWeight: 600 }}>Örnek İstemler:</span>
        {samplePrompts.map((sp, idx) => (
          <button
            key={idx}
            onClick={() => {
              setPrompt(sp);
              handleMatch(sp);
            }}
            style={{
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '9999px',
              padding: '0.35rem 0.85rem',
              fontSize: '0.825rem',
              color: '#cbd5e1',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = '#38bdf8';
              e.currentTarget.style.color = '#38bdf8';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.2)';
              e.currentTarget.style.color = '#cbd5e1';
            }}
          >
            {sp}
          </button>
        ))}
      </div>

      {/* Results Section */}
      {results && results.recommendations && (
        <div style={{
          marginTop: '2rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid rgba(148, 163, 184, 0.15)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                ✨ Projeniz İçin Önerilen Akademisyen Ekibi ({results.total_matches} Uyumlu Hoca Bulundu)
              </h3>
              {results.detected_keywords && results.detected_keywords.length > 0 && (
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Algılanan İlgili Konular:</span>
                  {results.detected_keywords.map((kw, i) => (
                    <span key={i} style={{
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      color: '#38bdf8',
                      borderRadius: '6px',
                      padding: '0.1rem 0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>{kw}</span>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setResults(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.85rem'
              }}
            >
              <X size={16} /> Kapat
            </button>
          </div>

          {/* Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
            gap: '1rem'
          }}>
            {results.recommendations.map((rec) => {
              const u = rec.academician;
              const score = rec.match_score || 85;
              const scoreColor = score >= 85 ? '#10b981' : score >= 70 ? '#38bdf8' : '#f59e0b';

              return (
                <div key={u.id} style={{
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: `1px solid ${scoreColor}40`,
                  borderRadius: '16px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  transition: 'transform 0.15s ease'
                }}>
                  <div>
                    {/* Top Row: User info & Match % */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <img
                        src={u.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                        alt={u.full_name}
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: `2px solid ${scoreColor}`
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{u.title}</div>
                        <div style={{
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          color: '#ffffff',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {u.full_name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {u.department_name || u.faculty_name}
                        </div>
                      </div>

                      <div style={{
                        background: `${scoreColor}20`,
                        border: `1px solid ${scoreColor}`,
                        color: scoreColor,
                        borderRadius: '9999px',
                        padding: '0.35rem 0.65rem',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        textAlign: 'center'
                      }}>
                        %{score} Uyum
                      </div>
                    </div>

                    {/* Reason */}
                    <div style={{
                      background: 'rgba(30, 41, 59, 0.6)',
                      borderRadius: '8px',
                      padding: '0.6rem 0.75rem',
                      fontSize: '0.8rem',
                      color: '#cbd5e1',
                      lineHeight: 1.4,
                      marginBottom: '0.75rem',
                      borderLeft: `3px solid ${scoreColor}`
                    }}>
                      💡 {rec.match_reason}
                    </div>

                    {/* Matched Tags */}
                    {rec.matched_tags && rec.matched_tags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '1rem' }}>
                        {rec.matched_tags.map((t, ti) => (
                          <span key={ti} style={{
                            background: 'rgba(148, 163, 184, 0.1)',
                            color: '#94a3b8',
                            borderRadius: '4px',
                            padding: '0.15rem 0.4rem',
                            fontSize: '0.725rem'
                          }}>
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(148, 163, 184, 0.1)' }}>
                    <button
                      onClick={() => onNavigate && onNavigate('academician-detail', u.id)}
                      style={{
                        flex: 1,
                        background: 'rgba(56, 189, 248, 0.15)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        borderRadius: '8px',
                        padding: '0.5rem',
                        color: '#38bdf8',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      Profil <ArrowRight size={14} />
                    </button>

                    {onOpenChat && (
                      <button
                        onClick={() => onOpenChat(u)}
                        style={{
                          background: 'rgba(99, 102, 241, 0.2)',
                          border: '1px solid rgba(99, 102, 241, 0.4)',
                          borderRadius: '8px',
                          padding: '0.5rem 0.75rem',
                          color: '#818cf8',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <Mail size={14} /> Mesaj
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
