# TaskOzz

TaskOzz, bireysel ve kurumsal görev yönetimini tek bir modern arayüzde birleştiren akıllı bir Görev ve Talep Yönetim (Task & Request Management) platformudur. 

Hem kişisel "To-Do" listelerinizi yönetebileceğiniz hem de kurumsal "Odalar" (Rooms) oluşturarak ekip içi iş akışlarınızı organize edebileceğiniz esnek bir yapıya sahiptir.

## Temel Özellikler
- **Bireysel Alan:** Kullanıcıların kendilerine özel görevler oluşturup takip edebildiği izole kişisel alan (Personal Context).
- **Kurumsal Odalar:** Ekiplerin birlikte çalışabileceği, davet ve onay mantığıyla çalışan çalışma odaları (Corporate Context).
- **Görev Talep (Task Request) Sistemi:** Kurumsal odalarda yetkisiz kullanıcıların (USER) görev oluşturmak yerine yöneticilere (ADMIN) görev talebi iletebildiği ve bu taleplerin onaylanıp/reddedilebildiği sistem.
- **Dinamik Context Switch:** Sayfa yenilenmesine gerek kalmadan kişisel alan ve katılım sağlanan kurumsal odalar arasında anında geçiş.
- **Kapsamlı Profil ve Kimlik Yönetimi:** Güvenli oturum yönetimi, profil güncelleme, şifre değiştirme ve DB bütünlüğünü koruyan kalıcı (soft-delete) hesap silme işlemleri.
- **Responsive / Mobile-First:** Masaüstünden mobil cihazlara kadar pürüzsüz bir UX sunan adaptif modern arayüz (Özel mobil drawer ve header destekli).

## Mimari ve Yetkilendirme Mantığı (ADMIN / USER)

TaskOzz güvenlik ve yetkilendirme altyapısı, katı ve güvenli kurallar üzerine inşa edilmiştir.

### Context (Bağlam) Ayrımı
- **Personal Context:** `room_id = null`. Yalnızca kullanıcının görebileceği görevleri temsil eder.
- **Corporate Context:** `room_id != null`. Görevlerin veya taleplerin belirli bir Kurumsal Oda'ya ait olduğunu belirtir. Frontend'deki `RoomContext` aracılığıyla arayüz otomatik şekillenir.

### Rol ve Yetkiler
- **Global Role YOKTUR:** Kullanıcıların sistem genelinde "Süper Admin" gibi global rolleri yoktur.
- Her kullanıcının yetkisi bulunduğu odaya (`RoomMembership.role`) göre belirlenir.
- **Oda Kurucusu (ADMIN):** Kurumsal odada sınırsız yetkiye sahiptir. Odaya görev ekleyebilir, görevleri başkasına veya kendine atayabilir, bekleyen "Task Request"leri (Görev Taleplerini) görüp onaylayabilir (Approve) veya reddedebilir (Reject).
- **Oda Üyesi (USER):** Kurumsal odaya katılan standart üyedir. Kurumsal odada doğrudan görev **oluşturamaz**. Bunun yerine odaya bir "Görev Talebi" (Task Request) iletir. Ancak görev üzerinde yorum yapabilir ve atandığı görevlerin durumunu değiştirebilir.
- **Public Kayıt:** Sisteme kayıt olan herkes standart bir kullanıcıdır.

## Teknolojiler
**Backend:**
- Python 3.x
- FastAPI (Yüksek performanslı, asenkron REST API)
- SQLAlchemy (ORM)
- PostgreSQL (Veritabanı)
- Pydantic (Veri doğrulama)
- Pytest (Birim ve Entegrasyon Testleri)
- pwdlib + Argon2 (Parola Hashleme ve Güvenlik)
- JWT (JSON Web Token tabanlı kimlik doğrulama)

**Frontend:**
- React (Component tabanlı UI mimarisi)
- Vite (Hızlı geliştirme ve derleme)
- React Router DOM (SPA navigasyonu)
- Lucide React (Vektör ikon seti)
- Custom CSS System (Tailwind veya dış kütüphane içermeyen saf, hafif, performanslı CSS mimarisi)

## Proje Yapısı

### Backend Yapısı
Backend, servis odaklı mimariyi (Service-Oriented Architecture) takip eder:
- `main.py`: FastAPI uygulama girişi ve CORS ayarları.
- `routers/`: API endpoint'leri (`tasks`, `users`, `rooms`, `task_requests`, `auth`).
- `services/`: İş mantığının (Business logic) tutulduğu katman (Router'lar bu servisleri çağırır).
- `models.py`: SQLAlchemy veritabanı modelleri (`User`, `Task`, `Room`, `RoomMembership`, vb.).
- `schemas.py`: Pydantic doğrulama şemaları.
- `database.py`: PostgreSQL bağlantı ve Session yönetimi.
- `dependencies.py`: Güvenlik ve dependency injection (`get_current_user`, `get_db`).
- `security.py`: Argon2 password hashing ve JWT üretim modülü.

### Frontend Yapısı
Frontend, bağlam bazlı (Context-driven) bir React uygulamasıdır:
- `src/services/apiClient.js`: Tek merkezi API yapılandırması, Token injeksiyonu ve `fetch` proxy yapısı (Axios kullanılmamaktadır).
- `src/context/RoomContext.jsx`: Bireysel ve Kurumsal çalışma alanları arasındaki geçiş durumunu yöneten State Provider.
- `src/components/Navigation.jsx`: Sorumluluklara göre değişen akıllı Sidebar ve Mobile Drawer.
- `src/components/ProtectedRoute.jsx`: Sadece kimlik doğrulamış kullanıcıların girebildiği rotaları koruyan HOC.
- `src/pages/`: Temel görünümler (Dashboard, Profil, Odalar, Görevler, Görev Talepleri).
- `src/index.css`: Tüm uygulamanın global tasarım sistemini barındıran temel stil dosyası (Mobil responsive uyumlandırmaları dahil).

## Geliştirme Ortamı Kurulumu

### 1. Veritabanı ve .env Ayarları
Uygulama PostgreSQL kullanmaktadır. Hem backend hem frontend için `.env` dosyaları oluşturulmalıdır. 

**Backend (`backend/.env`):**
```env
DATABASE_URL=postgresql+psycopg://KULLANICI:SIFRE@localhost:5432/taskflow_db
SECRET_KEY="gizli_anahtar_buraya"
TEST_DATABASE_URL=postgresql+psycopg://KULLANICI:SIFRE@localhost:5432/taskflow_test
```

**Frontend (`frontend/.env`):**
```env
VITE_API_URL=http://localhost:8000
```

### 2. Backend Çalıştırma
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt

# Sunucuyu Başlatma
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Çalıştırma
```bash
cd frontend
npm install

# Geliştirici sunucusunu başlatma
npm run dev
```

## Test ve Build Komutları

### Backend Testleri (Pytest)
```bash
cd backend
pytest
```
*Testler development DB'deki kullanıcıları silmeyecek şekilde izole (`taskflow_test` veritabanında) edilmiştir.*

### Frontend Lint ve Build
```bash
cd frontend
npm run lint    # Kod standardı ve ES-Lint denetimi
npm run build   # Production build işlemi (dist/ klasörüne çıkar)
```
