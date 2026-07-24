# 🎓 AVESİS CoMatch — Akademik Ekip Kurma & Yapay Zeka Eşleştirme Platformu

![AVESİS CoMatch Banner](https://img.shields.io/badge/AVES%C4%B0S-CoMatch-0066FF?style=for-the-badge&logo=academic&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![NodeJS](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=for-the-badge&logo=sqlite&logoColor=white)

> **AVESİS CoMatch**, üniversite bünyesindeki araştırmacıların BAP, TÜBİTAK ve uluslararası projeler için en doğru disiplinlerarası akademik ekibi kurmasını sağlayan **Yapay Zeka ve Makine Öğrenimi (K-Means)** destekli akıllı iş birliği platformudur.

---

## 🌟 Öne Çıkan Ana Özellikler

### 📐 1. Akıllı Araştırmacı Eşleştirme Motoru (`⚡ %XX Uyum Skoru`)
- **Bilimsel Algoritma:** Projenin aradığı uzmanlık etiketleri ile akademisyenlerin AVESİS profillerindeki yetkinlikleri matris seviyesinde karşılaştırılır.
- **Formül:** Kosinüs Benzerliği (Cosine Similarity), Jaccard İndeksi (Kesişim/Birleşim) ve Proje Etiket Kapsama Oranı kesişimiyle **gerçekçi ve tutarlı % Uyum Skorları** hesaplanır.
- **Canlı Arama & Filtreleme:** Aday akademisyenler arasında isim, unvan, bölüm veya etiketle arama yapma, minimum skor filtresi (`%70+ Yüksek Uyum`) ve özel mesajlı davet modalı.

### 🎯 2. Çoklu Tıklanabilir Etiket Seçici (Multi-Select Tag Picker)
- AVESİS taksonomisindeki **~1.400 araştırma alanı etiketi** arasında anlık Türkçe diyakritik duyarsız arama.
- Odaklanıldığında açılan öneri menüsü **kapanmadan art arda çoklu seçim** yapılabilir.
- Seçilen etiketler `✓ Seçildi` rozeti alarak alt tarafta silinebilir `(X)` çip kartları olarak listelenir.

### 💾 3. Proje Taslak Yönetimi & Tek Tıkla Yayınlama (Project Drafts)
- Projeleri henüz olgunlaşma aşamasındayken **"💾 Taslak Olarak Kaydet"** imkanı (`status = 'draft'`).
- Panelim kısmındaki `Taslak Projelerim` alanından tek tıkla **"🚀 Şimdi Yayınla"** denilerek canlıya alma ve araştırmacılara çağrı duyurma.

### 📜 4. Proje İletişim & Davet Geçmişi Log Kaydı (Invitation Timeline)
- Projeye yapılan başvurular, gönderilen davetler, mesajlar, tarihler ve yanıt durumları (`Bekliyor`, `Kabul Edildi`, `Reddedildi`) zaman çizelgesinde şeffaf olarak dökülür.

### 🌐 5. Canlı Online Toplantı Bağlantıları (Zoom / Meet / Teams)
- Görüşme planlarken özel **Online Toplantı Bağlantısı** (Zoom, Google Meet, MS Teams linki) girebilme.
- Takvim kartlarındaki **"Görüşmeye Katıl"** butonuna tıklandığında canlı toplantı adresinin otomatik olarak yeni sekmede açılması.

### 💬 6. Panelim Mesajlaşma & Anlık Bildirim Sistemi
- Araştırmacılar arası direkt mesajlaşma ve sol menüden **`➕ Yeni Sohbet`** başlatabilme.
- Üst barda canlı duyuru ve bildirim zili entegrasyonu.

---

## 🛠️ Teknolojik Mimari & Kullanılan Teknolojiler

| Katman | Teknoloji / Kütüphane | Açıklama |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite | Hızlı SPA kullanıcı arayüzü ve bileşen mimarisi |
| **Styling** | Vanilla CSS3 | Dark Mode, Glassmorphism & Modern CSS Design System |
| **Icons** | Lucide React | Vektörel ikon kütüphanesi |
| **Backend** | Node.js, Express.js | RESTful API sunucusu ve yetkilendirme (JWT) |
| **Database** | SQLite (`better-sqlite3`) | Yüksek performanslı ilişkisel veritabanı |
| **ML / AI Engine** | `kmeansEngine.js` | K-Means Kümeleme ve Vektör Eşleştirme Motoru |

---

## 🚀 Hızlı Başlangıç (Kurulum Rehberi)

### Gereksinimler
- **Node.js** (v18.0.0 veya üzeri)
- **npm** (v9.0.0 veya üzeri)

### 1. Projeyi Klonlayın
```bash
git clone https://github.com/Mamiekuk/avesis-comatch.git
cd avesis-comatch
```

### 2. Bağımlılıkları Yükleyin

#### Backend Sunucusu İçin:
```bash
npm install
```

#### Frontend İstemcisi İçin:
```bash
cd client
npm install
cd ..
```

### 3. Uygulamayı Çalıştırın

#### Backend Sunucusunu Başlatın (Port 5000):
```bash
node server/server.js
```

#### Frontend İstemcisini Başlatın (Port 5173):
```bash
cd client
npm run dev
```

Tarayıcınızdan `http://localhost:5173` adresine giderek platformu kullanabilirsiniz.

---

## 📊 Veritabanı Şeması Özet Görünümü

- `users`: Akademisyen profil bilgileri, unvan, fakülte, bölüm ve AVESİS profil bağlantıları.
- `projects`: Açık ve taslak akademik projeler, bütçe, süre ve ekip büyüklüğü.
- `research_areas`: AVESİS taksonomisine ait ~1.400 uzmanlık etiket kütüphanesi.
- `user_research_areas`: Akademisyen-Uzmanlık Alanı ilişki tablosu.
- `project_research_areas`: Proje-Aranan Uzmanlık Alanı ilişki tablosu.
- `meetings`: Planlanan yüz yüze ve online (Zoom/Meet) toplantı kayıtları.
- `messages`: Akademisyenler arası doğrudan mesajlaşma sohbet geçmişi.
- `notifications`: Sistem ve çağrı duyuru bildirimleri.

---

## 📄 Lisans
Bu proje **MIT Lisansı** altında korunmaktadır. 

---

<p align="center">
  <b>AVESİS CoMatch</b> — Akademik Ekip Kurmanın ve Güçlü İş Birlikleri Oluşturmanın En Akıllı Yolu. 🎓✨
</p>
