const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';
export const BACKEND_URL = API_BASE.replace('/api', '');

function getHeaders(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function fetchMetadata() {
  const res = await fetch(`${API_BASE}/metadata`);
  if (!res.ok) throw new Error('Taksonomi verisi yüklenemedi.');
  return res.json();
}

export async function fetchKMeansClusters() {
  const res = await fetch(`${API_BASE}/kmeans/clusters`);
  if (!res.ok) throw new Error('Yapay zeka küme özetleri yüklenemedi.');
  return res.json();
}

export async function fetchKMeansNeighbors(userId) {
  const res = await fetch(`${API_BASE}/kmeans/neighbors/${userId}`);
  if (!res.ok) throw new Error('Benzer hocalar getirilemedi.');
  return res.json();
}

export async function createResearchArea(label, token) {
  const res = await fetch(`${API_BASE}/metadata/research-areas`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ label })
  });
  if (!res.ok) {
    let errMsg = 'Yeni araştırma alanı oluşturulamadı.';
    try {
      const errJson = await res.json();
      if (errJson.error) errMsg = errJson.error;
    } catch (_) {}
    throw new Error(errMsg);
  }
  return res.json();
}

export async function loginUser(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Giriş yapılamadı.');
  return data;
}

async function parseResponse(res, defaultError) {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (res.status === 404) {
      throw new Error('Sunucu uç noktası bulunamadı. Lütfen backend sunucunuzu (node server.js) yeniden başlatın.');
    }
    throw new Error('Sunucudan JSON yerine HTML döndü. Lütfen arka plan sunucunuzu yeniden başlatın.');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || defaultError);
  return data;
}

export async function claimProfile(payload) {
  const res = await fetch(`${API_BASE}/auth/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return parseResponse(res, 'Profil sahiplenilemedi.');
}

export async function sendClaimVerificationCode(academicianId, email) {
  const res = await fetch(`${API_BASE}/auth/claim/send-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ academicianId, email })
  });
  return parseResponse(res, 'Doğrulama kodu gönderilemedi.');
}

export async function verifyClaimAndActivate(payload) {
  const res = await fetch(`${API_BASE}/auth/claim/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return parseResponse(res, 'Doğrulama başarısız.');
}


export async function updateUserProfile(payload, token) {
  const res = await fetch(`${API_BASE}/auth/profile`, {
    method: 'PUT',
    headers: getHeaders(token),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Profil güncellenemedi.');
  return data;
}


export async function registerUser(payload) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Kayıt olunamadı.');
  return data;
}

export async function fetchAcademicians(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/academicians?${query}`);
  if (!res.ok) throw new Error('Akademisyen listesi yüklenemedi.');
  return res.json();
}

export async function fetchAcademicianById(id) {
  const res = await fetch(`${API_BASE}/academicians/${id}`);
  if (!res.ok) throw new Error('Akademisyen detayı yüklenemedi.');
  return res.json();
}

export async function fetchProjects(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/projects?${query}`);
  if (!res.ok) throw new Error('Projeler yüklenemedi.');
  return res.json();
}

export async function fetchProjectById(id) {
  const res = await fetch(`${API_BASE}/projects/${id}`);
  if (!res.ok) throw new Error('Proje detayı yüklenemedi.');
  return res.json();
}

export async function createProject(payload, token) {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Proje oluşturulamadı.');
  return data;
}

export async function updateProject(projectId, payload, token) {
  const res = await fetch(`${API_BASE}/projects/${projectId}`, {
    method: 'PUT',
    headers: getHeaders(token),
    body: JSON.stringify(payload)
  });
  return parseResponse(res, 'Proje güncellenemedi.');
}

export async function fetchProjectSmartMatches(projectId, token, clusterId = 'ALL') {
  const query = clusterId && clusterId !== 'ALL' ? `?cluster_id=${clusterId}` : '';
  const res = await fetch(`${API_BASE}/projects/${projectId}/match${query}`, {
    headers: getHeaders(token)
  });
  if (!res.ok) throw new Error('Akıllı eşleştirmeler yüklenemedi.');
  return res.json();
}

export async function inviteToProject(projectId, receiverId, message, token) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/invite`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ receiverId, message })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Davet gönderilemedi.');
  return data;
}

export async function applyToProject(projectId, message, token) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/apply`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ message })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Başvuru yapılamadı.');
  return data;
}

export async function respondToInvitation(invitationId, status, token) {
  const res = await fetch(`${API_BASE}/invitations/${invitationId}/respond`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ status })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'İşlem yapılamadı.');
  return data;
}

export async function fetchDashboard(token) {
  const res = await fetch(`${API_BASE}/dashboard`, {
    headers: getHeaders(token)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Kontrol paneli verisi alınamadı.');
  return data;
}

export async function fetchNotifications(token) {
  const res = await fetch(`${API_BASE}/notifications`, {
    headers: getHeaders(token)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Bildirimler alınamadı.');
  return data;
}

export async function markNotificationsRead(token) {
  const res = await fetch(`${API_BASE}/notifications/read-all`, {
    method: 'POST',
    headers: getHeaders(token)
  });
  return res.json();
}

export async function fetchChatContacts(token) {
  const res = await fetch(`${API_BASE}/chat/contacts`, {
    headers: getHeaders(token)
  });
  return parseResponse(res, 'Sohbet kişileri yüklenemedi.');
}

export async function fetchChatHistory(contactId, token) {
  const res = await fetch(`${API_BASE}/chat/messages/${contactId}`, {
    headers: getHeaders(token)
  });
  return parseResponse(res, 'Sohbet geçmişi yüklenemedi.');
}

export async function sendChatMessage(receiverId, message, token, fileUrl = null, fileName = null) {
  const res = await fetch(`${API_BASE}/chat/messages`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ receiverId, message, fileUrl, fileName })
  });
  return parseResponse(res, 'Mesaj gönderilemedi.');
}

export async function deleteChatMessage(messageId, token) {
  const res = await fetch(`${API_BASE}/chat/messages/${messageId}`, {
    method: 'DELETE',
    headers: getHeaders(token)
  });
  return parseResponse(res, 'Mesaj silinemedi.');
}

export async function uploadChatFile(file, token) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/chat/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  return parseResponse(res, 'Dosya yüklenemedi.');
}

export async function clearChatHistory(contactId, token) {
  const res = await fetch(`${API_BASE}/chat/messages/clear/${contactId}`, {
    method: 'DELETE',
    headers: getHeaders(token)
  });
  return parseResponse(res, 'Sohbet geçmişi temizlenemedi.');
}

export async function fetchMeetings(token) {
  const res = await fetch(`${API_BASE}/meetings`, {
    headers: getHeaders(token)
  });
  return parseResponse(res, 'Toplantılar alınamadı.');
}

export async function createMeeting(meetingData, token) {
  const res = await fetch(`${API_BASE}/meetings`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(meetingData)
  });
  return parseResponse(res, 'Toplantı planlanamadı.');
}

export async function respondToMeeting(meetingId, status, token) {
  const res = await fetch(`${API_BASE}/meetings/${meetingId}/respond`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ status })
  });
  return parseResponse(res, 'Toplantı daveti yanıtlanamadı.');
}

export async function sendForgotPasswordCode(email) {
  const res = await fetch(`${API_BASE}/auth/forgot-password/send-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Şifre sıfırlama kodu gönderilemedi.');
  return data;
}

export async function resetForgotPassword(email, code, newPassword) {
  const res = await fetch(`${API_BASE}/auth/forgot-password/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, newPassword })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Şifre güncellenemedi.');
  return data;
}

export async function announceProjectCall(projectId, token) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/announce`, {
    method: 'POST',
    headers: getHeaders(token)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Proje çağrısı duyurulamadı.');
  return data;
}
