# 📱 Dokumentasi Pengembangan Aplikasi Agri-Smart

> **Versi Dokumen:** 1.0  
> **Terakhir Diperbarui:** Februari 2026  
> **Platform:** Android & iOS (Cross-platform)  
> **Status:** Dalam Pengembangan Aktif

---

## Daftar Isi

1. [Ringkasan Proyek](#1-ringkasan-proyek)
2. [Teknologi & Stack](#2-teknologi--stack)
3. [Arsitektur Aplikasi](#3-arsitektur-aplikasi)
4. [Struktur Folder](#4-struktur-folder)
5. [Sistem Navigasi](#5-sistem-navigasi)
6. [Sistem Tema & Desain](#6-sistem-tema--desain)
7. [Fitur Aplikasi](#7-fitur-aplikasi)
   - 7.1 [Beranda (Home)](#71-beranda-home)
   - 7.2 [Logbook Digital](#72-logbook-digital)
   - 7.3 [Scanner QR](#73-scanner-qr)
   - 7.4 [Asisten Bot (Chatbot)](#74-asisten-bot-chatbot)
   - 7.5 [Dashboard Monitoring](#75-dashboard-monitoring)
   - 7.6 [Diagnosis Tanaman](#76-diagnosis-tanaman)
   - 7.7 [Evaluasi Panen](#77-evaluasi-panen)
8. [Pola Desain UI/UX](#8-pola-desain-uiux)
9. [Fase Pengembangan](#9-fase-pengembangan)
10. [Status & Rencana Pengembangan](#10-status--rencana-pengembangan)

---

## 1. Ringkasan Proyek

**Agri-Smart** adalah aplikasi mobile berbasis **React Native (Expo)** yang dirancang untuk membantu petani dan pengelola pertanian dalam mengelola kegiatan budidaya tanaman secara digital. Aplikasi ini merupakan bagian dari proyek **PKM (Program Kreativitas Mahasiswa)** yang bertujuan untuk mengdigitalisasi proses manajemen pertanian.

### Tujuan Utama

- **Pencatatan Digital:** Menggantikan pencatatan manual kegiatan pertanian dengan logbook digital yang terstruktur
- **Monitoring Real-time:** Menyediakan dashboard monitoring kesehatan tanaman dan aktivitas kebun
- **Diagnosis Cerdas:** Membantu identifikasi penyakit tanaman berdasarkan gejala yang diamati
- **Evaluasi Kualitas:** Memberikan analisis dan evaluasi kualitas hasil panen
- **Asisten AI:** Menyediakan chatbot untuk konsultasi seputar budidaya tanaman
- **Identifikasi Blok:** Menggunakan QR code untuk identifikasi dan pencatatan per blok tanam

### Identitas Aplikasi

| Properti         | Nilai             |
| ---------------- | ----------------- |
| Nama Aplikasi    | Agri-Smart        |
| Slug             | agri-smart        |
| Skema            | myapp             |
| Versi            | 1.0.0             |
| Orientasi        | Portrait          |
| Platform Target  | Android, iOS, Web |
| Bahasa Antarmuka | Bahasa Indonesia  |

---

## 2. Teknologi & Stack

### Framework & Runtime

| Teknologi        | Versi   | Keterangan                                        |
| ---------------- | ------- | ------------------------------------------------- |
| **Expo SDK**     | 54      | Framework utama untuk pengembangan cross-platform |
| **React Native** | 0.81.5  | Library UI mobile                                 |
| **React**        | 19.1.0  | Library komponen reaktif                          |
| **TypeScript**   | 5.9.2   | Bahasa pemrograman dengan static typing           |
| **Expo Router**  | ~6.0.21 | Sistem routing berbasis file                      |

### Library Utama

| Library                          | Versi    | Fungsi                                 |
| -------------------------------- | -------- | -------------------------------------- |
| `expo-router`                    | ~6.0.21  | File-based routing & navigasi          |
| `@react-navigation/bottom-tabs`  | ^7.3.10  | Tab navigasi bawah                     |
| `@react-navigation/native`       | ^7.1.6   | Navigasi inti (useFocusEffect, dll)    |
| `@react-navigation/elements`     | ^2.3.8   | Elemen navigasi                        |
| `react-native-chart-kit`         | ^6.12.0  | Grafik (PieChart, BarChart, LineChart) |
| `lucide-react-native`            | ^0.562.0 | Library ikon modern (SVG)              |
| `expo-image-picker`              | ~16.1.4  | Akses kamera & galeri untuk foto       |
| `expo-haptics`                   | ~14.1.4  | Umpan balik haptic pada interaksi      |
| `expo-linear-gradient`           | ~14.1.4  | Gradient pada background dan komponen  |
| `expo-status-bar`                | ~2.2.3   | Kontrol status bar                     |
| `expo-symbols`                   | ~0.4.4   | Simbol sistem (iOS SF Symbols)         |
| `expo-font`                      | ~13.3.1  | Custom font loading                    |
| `expo-splash-screen`             | ~0.30.8  | Splash screen konfigurasi              |
| `expo-blur`                      | ~14.1.4  | Efek blur pada komponen                |
| `react-native-reanimated`        | ~3.17.4  | Animasi performa tinggi                |
| `react-native-gesture-handler`   | ~2.24.0  | Penanganan gesture                     |
| `react-native-svg`               | 15.11.2  | Rendering SVG (untuk chart & ikon)     |
| `react-native-safe-area-context` | 5.4.0    | Safe area management                   |
| `react-native-screens`           | ~4.11.1  | Native screen containers               |
| `react-native-web`               | ~0.20.0  | Dukungan web                           |

### Dev Dependencies

| Library        | Versi   | Fungsi                       |
| -------------- | ------- | ---------------------------- |
| `@babel/core`  | ^7.25.2 | Transpiler JavaScript        |
| `@types/react` | ~19.1.2 | Type definitions untuk React |
| `typescript`   | ^5.9.2  | TypeScript compiler          |
| `eslint`       | ^9.25.1 | Linter kode                  |

### Konfigurasi TypeScript

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

- **Strict Mode:** Diaktifkan untuk keamanan tipe yang ketat
- **Path Aliases:** `@/*` memetakan ke root direktori proyek, memudahkan import

---

## 3. Arsitektur Aplikasi

### Pola Arsitektur

Aplikasi menggunakan arsitektur **Component-Based** dengan pemisahan yang jelas antara:

```
┌──────────────────────────────────────────────────┐
│                    app/ (Routes)                 │
│  File-based routing oleh Expo Router             │
│  Setiap file .tsx = 1 halaman/route              │
├──────────────────────────────────────────────────┤
│              components/ui/ (Logic + UI)         │
│  Komponen halaman utama dengan state & logic     │
│  Setiap fitur = 1 komponen lengkap               │
├──────────────────────────────────────────────────┤
│              constants/ (Konfigurasi)            │
│  Tema warna, font, dan konstanta global          │
├──────────────────────────────────────────────────┤
│              hooks/ (Custom Hooks)               │
│  useColorScheme, useThemeColor                   │
└──────────────────────────────────────────────────┘
```

### Alur Data

```
Route (app/*.tsx)
  └── Render komponen dari components/ui/*.tsx
        ├── State lokal (useState)
        ├── Data dummy (hardcoded dalam komponen)
        ├── Navigasi (useRouter dari expo-router)
        └── Tema (constants/theme.ts → useThemeColor hook)
```

### Pola Komponen

Setiap halaman fitur mengikuti pola yang konsisten:

1. **Route File** (`app/(tabs)/scanner.tsx` atau `app/diagnosis.tsx`): Hanya berisi import & render komponen UI
2. **Komponen UI** (`components/ui/scanner.tsx`): Berisi seluruh logika, state, styling, dan rendering
3. **Deklarasi Styles**: Menggunakan `StyleSheet.create()` di akhir file

---

## 4. Struktur Folder

```
Agri-Smart/
├── app/                          # Route files (file-based routing)
│   ├── _layout.tsx               # Root layout (ThemeProvider, Stack Navigator)
│   ├── diagnosis.tsx             # Route: Halaman Diagnosis
│   ├── evaluation.tsx            # Route: Halaman Evaluasi
│   ├── modal.tsx                 # Route: Modal screen
│   └── (tabs)/                   # Tab group (bottom navigation)
│       ├── _layout.tsx           # Tab layout (konfigurasi tab & custom tab bar)
│       ├── index.tsx             # Tab: Beranda
│       ├── logbook.tsx           # Tab: Logbook
│       ├── scanner.tsx           # Tab: Scanner
│       ├── chatbot.tsx           # Tab: Chatbot
│       ├── dashboard.tsx         # Tab: Dashboard
│       └── explore.tsx           # Tab: Explore (hidden)
│
├── components/                   # Komponen reusable
│   ├── ui/                       # Komponen halaman utama
│   │   ├── index.tsx             # UI: Beranda (menu grid + tips)
│   │   ├── logbook.tsx           # UI: Logbook digital (form + calendar + history)
│   │   ├── scanner.tsx           # UI: QR Scanner (dev modal + scan simulasi)
│   │   ├── chatbot.tsx           # UI: Chatbot AI (dev modal + chat interface)
│   │   ├── dashboard.tsx         # UI: Dashboard monitoring (charts + alerts)
│   │   ├── diagnosis.tsx         # UI: Diagnosis tanaman (symptom checker)
│   │   ├── evaluation.tsx        # UI: Evaluasi panen (charts + metrics)
│   │   ├── custom-tab-bar.tsx    # Custom bottom tab bar component
│   │   ├── collapsible.tsx       # Komponen collapsible/accordion
│   │   └── icon-symbol.tsx       # Wrapper untuk SF Symbols
│   ├── external-link.tsx         # Link ke browser external
│   ├── haptic-tab.tsx            # Tab dengan haptic feedback
│   ├── hello-wave.tsx            # Animasi wave (unused)
│   ├── parallax-scroll-view.tsx  # ScrollView dengan efek parallax
│   ├── themed-text.tsx           # Text dengan dukungan tema
│   └── themed-view.tsx           # View dengan dukungan tema
│
├── constants/
│   └── theme.ts                  # Definisi warna light/dark & font
│
├── hooks/
│   ├── use-color-scheme.ts       # Hook deteksi tema sistem
│   ├── use-color-scheme.web.ts   # Hook tema untuk web
│   └── use-theme-color.ts       # Hook untuk mengambil warna sesuai tema
│
├── assets/
│   └── images/                   # Gambar dan aset statis
│
├── scripts/
│   └── reset-project.js          # Script untuk reset proyek
│
├── app.json                      # Konfigurasi Expo
├── package.json                  # Dependencies & scripts
├── tsconfig.json                 # Konfigurasi TypeScript
├── babel.config.js               # Konfigurasi Babel
├── eslint.config.js              # Konfigurasi ESLint
└── expo-env.d.ts                 # Type declarations Expo
```

---

## 5. Sistem Navigasi

### Overview Navigasi

Aplikasi menggunakan **Expo Router** dengan file-based routing yang terbagi menjadi:

1. **Stack Navigator** (Root) — untuk navigasi antar halaman penuh
2. **Tab Navigator** — untuk navigasi tab di bottom bar
3. **Modal** — untuk overlay seperti development notice

### Root Layout (`app/_layout.tsx`)

```
Stack Navigator
├── (tabs)          → Tab group (bottom navigation)
├── diagnosis       → Stack screen (halaman penuh)
├── evaluation      → Stack screen (halaman penuh)
└── modal           → Modal presentation
```

Konfigurasi:

- **ThemeProvider:** Mendukung tema gelap/terang otomatis
- **SplashScreen:** Ditahan hingga font selesai dimuat
- **Diagnosis & Evaluasi:** Menggunakan `headerShown: false` (header custom di komponen)

### Tab Navigator (`app/(tabs)/_layout.tsx`)

```
Bottom Tabs (Custom Tab Bar)
├── index     → Beranda        (ikon: Home)
├── logbook   → Logbook        (ikon: BookOpen)
├── scanner   → Scan QR        (ikon: ScanLine) ← Floating button
├── chatbot   → Asisten        (ikon: Bot)
└── dashboard → Monitor        (ikon: BarChart3)
```

Konfigurasi Tab:

- Menggunakan **CustomTabBar** (`components/ui/custom-tab-bar.tsx`)
- Tab `explore` di-hidden (`href: null`)
- Semua tab menggunakan `headerShown: false` (header custom di masing-masing komponen)

### Custom Tab Bar

Custom tab bar yang dibangun dari nol dengan fitur:

- **Floating Scanner Button:** Tombol scan QR menonjol di tengah dengan efek elevated
- **Ikon Dinamis:** Berubah warna saat aktif (hijau) / tidak aktif (abu-abu)
- **Haptic Feedback:** Getaran ringan saat menekan tab (via `expo-haptics`)
- **5 Tab:** Beranda, Logbook, Scan, Asisten, Monitor
- **Mapping Ikon:**

  | Tab       | Ikon (lucide) | Label   |
  | --------- | ------------- | ------- |
  | index     | Home          | Beranda |
  | logbook   | BookOpen      | Logbook |
  | scanner   | ScanLine      | Scan    |
  | chatbot   | Bot           | Asisten |
  | dashboard | BarChart3     | Monitor |

### Alur Navigasi antar Fitur

```
Beranda (index)
├── "Diagnosis Tanaman"   → router.push("/diagnosis")    [Stack]
├── "Logbook Digital"     → router.push("/(tabs)/logbook") [Tab switch]
├── "Evaluasi Panen"      → router.push("/evaluation")    [Stack]
├── "Asisten Chatbot"     → router.push("/(tabs)/chatbot") [Tab switch]
├── "Dashboard"           → router.push("/(tabs)/dashboard") [Tab switch]
└── "Scan QR"             → router.push("/(tabs)/scanner")  [Tab switch]
```

---

## 6. Sistem Tema & Desain

### Skema Warna (`constants/theme.ts`)

#### Mode Terang (Light)

| Token             | Warna   | Penggunaan                 |
| ----------------- | ------- | -------------------------- |
| `text`            | #11181C | Teks utama                 |
| `background`      | #fff    | Background utama           |
| `tint`            | #16A34A | Warna aksen (hijau primer) |
| `icon`            | #687076 | Ikon tidak aktif           |
| `tabIconDefault`  | #687076 | Ikon tab default           |
| `tabIconSelected` | #16A34A | Ikon tab aktif             |

#### Mode Gelap (Dark)

| Token             | Warna   | Penggunaan                 |
| ----------------- | ------- | -------------------------- |
| `text`            | #ECEDEE | Teks utama                 |
| `background`      | #151718 | Background utama           |
| `tint`            | #4ADE80 | Warna aksen (hijau terang) |
| `icon`            | #9BA1A6 | Ikon tidak aktif           |
| `tabIconDefault`  | #9BA1A6 | Ikon tab default           |
| `tabIconSelected` | #4ADE80 | Ikon tab aktif             |

#### Warna Tab Bar

| Token              | Warna   | Keterangan          |
| ------------------ | ------- | ------------------- |
| `tabBarBackground` | #FFFFFF | Background tab bar  |
| `tabBarBorder`     | #E5E7EB | Border atas tab bar |
| `tabIconDefault`   | #9CA3AF | Ikon normal         |
| `tabIconSelected`  | #16A34A | Ikon aktif          |
| `scanButtonBg`     | #16A34A | Tombol scan         |
| `scanButtonShadow` | #16A34A | Shadow tombol scan  |

### Warna Per Fitur (Header)

Setiap fitur memiliki warna identitas unik pada header-nya:

| Fitur     | Warna Header | Hex Code  | Ikon           |
| --------- | ------------ | --------- | -------------- |
| Beranda   | Hijau        | `#16a34a` | Sprout         |
| Logbook   | Biru         | `#3b82f6` | BookOpen       |
| Scanner   | Indigo       | `#6366f1` | ScanLine       |
| Chatbot   | Oranye       | `#f97316` | Bot            |
| Dashboard | Hijau        | `#16a34a` | BarChart3      |
| Diagnosis | Merah        | `#ef4444` | Stethoscope    |
| Evaluasi  | Ungu         | `#a855f7` | ClipboardCheck |

### Tipografi

- **Platform Android:** `"Roboto"` (regular) / `"Roboto-Bold"` (bold)
- **Platform iOS:** `"Helvetica Neue"` (regular) / `"Helvetica Neue Bold"` (bold)

---

## 7. Fitur Aplikasi

### 7.1 Beranda (Home)

**File:** `components/ui/index.tsx`  
**Route:** `app/(tabs)/index.tsx`  
**Warna Header:** Hijau `#16a34a`  
**Ikon Header:** Sprout

#### Deskripsi

Halaman utama yang menampilkan menu navigasi ke seluruh fitur aplikasi dalam bentuk grid 2 kolom, serta kartu tips harian untuk petani.

#### Komponen Utama

1. **Header Section**
   - Background hijau dengan sudut bawah membulat (`borderBottomLeftRadius: 24`)
   - Ikon Sprout dalam lingkaran semi-transparan
   - Judul "Agri-Smart" dan subtitle "Sistem Manajemen Pertanian Cerdas"

2. **Menu Grid (2x3)**
   - 6 item menu navigasi dalam bentuk kartu
   - Setiap kartu memiliki: ikon berwarna, judul, dan deskripsi singkat

   | No  | Menu              | Ikon           | Warna            | Navigasi            |
   | --- | ----------------- | -------------- | ---------------- | ------------------- |
   | 1   | Diagnosis Tanaman | Stethoscope    | Merah `#ef4444`  | `/diagnosis`        |
   | 2   | Logbook Digital   | BookOpen       | Biru `#3b82f6`   | `/(tabs)/logbook`   |
   | 3   | Evaluasi Panen    | ClipboardCheck | Ungu `#a855f7`   | `/evaluation`       |
   | 4   | Asisten Chatbot   | Bot            | Oranye `#f97316` | `/(tabs)/chatbot`   |
   | 5   | Dashboard         | BarChart3      | Hijau `#22c55e`  | `/(tabs)/dashboard` |
   | 6   | Scan QR           | ScanLine       | Indigo `#6366f1` | `/(tabs)/scanner`   |

3. **Kartu Tips Harian**
   - Background gradient hijau
   - Ikon Lightbulb
   - Tips pertanian (contoh: tips penyiraman pagi hari)
   - Tombol "Lihat Selengkapnya"

#### Data

- Data menu statis (tidak memerlukan database)
- Tips statis

---

### 7.2 Logbook Digital

**File:** `components/ui/logbook.tsx`  
**Route:** `app/(tabs)/logbook.tsx`  
**Warna Header:** Biru `#3b82f6`  
**Ikon Header:** BookOpen

#### Deskripsi

Fitur pencatatan kegiatan harian pertanian yang mencakup form input aktivitas, pemilihan tanggal via kalender, upload foto, dan riwayat catatan dengan filter tanggal.

#### Komponen Utama

1. **Header Section**
   - Background biru dengan pattern konsisten
   - Ikon BookOpen dalam lingkaran semi-transparan

2. **Ringkasan Hari Ini (Summary Cards)**
   - 3 kartu statistik berwarna:
     - "2 Kegiatan" (hijau) — total hari ini
     - "4 Blok" (biru) — blok aktif
     - "Baik" (oranye) — kondisi tanaman

3. **Form Pencatatan**
   - **Tanggal:** Tombol pemilih tanggal yang membuka modal kalender
   - **Blok (Grid 2x3):** A1, A2, B1, B2, C1, C2
   - **Jenis Kegiatan (Grid 2x3):** Penyiraman 💧, Pemupukan 🌱, Panen 🪴, Pestisida 🧪, Pemangkasan ✂️, Inspeksi 🔍
   - **Catatan:** TextInput multi-line
   - **Upload Foto:** Menggunakan `expo-image-picker` untuk akses kamera
   - **Tombol Simpan:** Menyimpan ke state lokal dan menambahkan ke riwayat

4. **Modal Kalender (Custom Calendar)**
   - Kalender custom yang dibangun dari nol (tanpa library external)
   - Navigasi bulan (◀ ▶) dengan nama bulan & tahun Indonesia
   - Grid hari Minggu–Sabtu
   - Indikator titik hijau pada tanggal yang memiliki entri
   - Tanggal terpilih ditandai dengan lingkaran biru
   - Fungsi `generateCalendarDays()` menghitung hari dalam bulan

5. **Riwayat Kegiatan**
   - **Filter Tanggal:** Tombol kalender untuk memfilter berdasarkan tanggal tertentu
   - **Daftar Entri:** Kartu riwayat dengan:
     - Blok tanam (badge biru)
     - Jenis kegiatan
     - Tanggal & waktu
     - Catatan tambahan
   - **Filter Aktif:** Badge menampilkan tanggal filter dengan tombol hapus (✕)
   - **Empty State:** Pesan "Tidak ada riwayat" jika filter tidak menemukan data

#### Data Dummy (6 Entri)

| No  | Blok    | Kegiatan       | Tanggal            | Catatan                                   |
| --- | ------- | -------------- | ------------------ | ----------------------------------------- |
| 1   | Blok A1 | 💧 Penyiraman  | 2 Feb 2026, 07:30  | Penyiraman pagi, kondisi tanah kering     |
| 2   | Blok B2 | 🌱 Pemupukan   | 1 Feb 2026, 08:00  | Pupuk NPK 15-15-15, dosis 2kg/blok        |
| 3   | Blok A2 | 🔍 Inspeksi    | 1 Feb 2026, 14:00  | Ditemukan bercak kuning di beberapa daun  |
| 4   | Blok C1 | 🪴 Panen       | 28 Jan 2026, 09:00 | Panen tomat batch pertama, kualitas baik  |
| 5   | Blok A1 | 🧪 Pestisida   | 27 Jan 2026, 16:00 | Aplikasi fungisida untuk pencegahan jamur |
| 6   | Blok B1 | ✂️ Pemangkasan | 26 Jan 2026, 10:00 | Pemangkasan tunas air dan daun tua        |

#### Fitur Teknis

- **useMemo:** Filter riwayat berdasarkan tanggal yang dipilih (optimisasi performa)
- **ImagePicker:** `launchCameraAsync` untuk mengambil foto langsung dari kamera
- **Alert:** Feedback sukses setelah menyimpan data
- **ScrollView:** Mendukung scroll vertikal untuk form panjang

---

### 7.3 Scanner QR

**File:** `components/ui/scanner.tsx`  
**Route:** `app/(tabs)/scanner.tsx`  
**Warna Header:** Indigo `#6366f1`  
**Ikon Header:** ScanLine  
**Status:** 🚧 Dalam Pengembangan

#### Deskripsi

Fitur pemindaian QR code untuk identifikasi blok tanam. Saat ini menampilkan modal "Fitur Dalam Pengembangan" setiap kali halaman dibuka.

#### Modal Pengembangan

- **Pemicu:** `useFocusEffect` dari `@react-navigation/native` memastikan modal selalu muncul saat screen mendapat focus, termasuk saat navigasi bolak-balik
- **Konten Modal:**
  - Ikon Construction (oranye) dalam lingkaran
  - Judul: "Fitur Dalam Pengembangan"
  - Deskripsi: keterangan bahwa tim sedang mengembangkan fitur
  - Badge: "Segera Hadir"
  - Tombol: "Kembali ke Beranda" (navigasi ke `/(tabs)/`)
- **Tidak ada tombol preview** — pengguna hanya bisa kembali ke beranda

#### Fitur di Balik Modal (Preview)

Meskipun tidak dapat diakses oleh pengguna, halaman scanner memiliki UI lengkap:

1. **Area Scan:** Kotak scan dengan border animasi dan instruksi
2. **Simulasi Scan:** Setelah tombol "Mulai Scan" ditekan, loading 2 detik → hasil "Blok A1"
3. **Form Aktivitas:** Grid pilihan kegiatan (sama dengan logbook)
4. **Tombol Submit:** Menyimpan aktivitas terkait blok yang di-scan

#### Implementasi Teknis

```typescript
const [showDevModal, setShowDevModal] = useState(true);

useFocusEffect(
  useCallback(() => {
    setShowDevModal(true);
  }, []),
);
```

---

### 7.4 Asisten Bot (Chatbot)

**File:** `components/ui/chatbot.tsx`  
**Route:** `app/(tabs)/chatbot.tsx`  
**Warna Header:** Oranye `#f97316`  
**Ikon Header:** Bot  
**Status:** 🚧 Dalam Pengembangan

#### Deskripsi

Fitur chatbot AI untuk konsultasi pertanian. Saat ini menampilkan modal "Fitur Dalam Pengembangan" setiap kali halaman dibuka, identik dengan Scanner.

#### Modal Pengembangan

- Mekanisme sama dengan Scanner (`useFocusEffect`)
- Tombol kembali berwarna oranye (sesuai tema chatbot)
- Pengguna hanya bisa kembali ke beranda

#### Fitur di Balik Modal (Preview)

1. **Chat Interface:**
   - Bubble chat (user = hijau kanan, bot = putih kiri)
   - Ikon user dan bot pada setiap pesan
   - Timestamp pada setiap pesan
   - Auto-scroll ke pesan terbaru (`ScrollView ref`)

2. **Pertanyaan Cepat (Quick Questions):**
   - 4 tombol pertanyaan preset yang bisa langsung ditekan:
     - "Kapan waktu pemupukan terbaik?"
     - "Cara mengatasi daun menguning?"
     - "Berapa kali penyiraman per hari?"
     - "Tanda tanaman kurang nutrisi?"

3. **Respons Bot (Dictionary-based):**
   - Pencocokan kata kunci dari input user
   - 4 respons tersedia sesuai pertanyaan cepat
   - Default response jika tidak cocok

4. **Typing Indicator:**
   - Animasi "..." saat bot sedang "mengetik" (delay 1-1.5 detik)

5. **Input Area:**
   - `KeyboardAvoidingView` untuk penanganan keyboard
   - TextInput + tombol kirim
   - Tombol berubah warna saat ada teks

#### Data Respons Bot

| Pertanyaan                    | Ringkasan Jawaban                                                    |
| ----------------------------- | -------------------------------------------------------------------- |
| Waktu pemupukan terbaik       | Pagi (06:00-08:00) atau sore (16:00-18:00), 2-4 minggu sekali        |
| Cara mengatasi daun menguning | 4 penyebab: nitrogen, air berlebih, cahaya kurang, penyakit          |
| Frekuensi penyiraman          | Kemarau 2x/hari, hujan 1x/hari atau sesuai kebutuhan                 |
| Tanda kurang nutrisi          | Daun kuning (N), tepi coklat (K), pertumbuhan lambat (P), pucat (Fe) |

---

### 7.5 Dashboard Monitoring

**File:** `components/ui/dashboard.tsx`  
**Route:** `app/(tabs)/dashboard.tsx`  
**Warna Header:** Hijau `#16a34a`  
**Ikon Header:** BarChart3

#### Deskripsi

Halaman monitoring yang menampilkan ringkasan kondisi kebun dalam bentuk statistik, grafik, dan peringatan.

#### Komponen Utama

1. **Header Section**
   - Background hijau, ikon BarChart3
   - Judul "Monitoring" dan subtitle "Ringkasan kondisi kebun Anda"

2. **Kartu Statistik (Grid 2x2)**

   | Stat            | Nilai  | Perubahan         | Warna  |
   | --------------- | ------ | ----------------- | ------ |
   | Total Tanaman   | 550    | +12 minggu ini    | Biru   |
   | Tanaman Sehat   | 450    | 81.8% dari total  | Hijau  |
   | Perlu Perhatian | 80     | 14.5% dari total  | Oranye |
   | Panen Bulan Ini | 125 kg | +8% vs bulan lalu | Ungu   |

3. **PieChart — Distribusi Kesehatan**
   - Library: `react-native-chart-kit`
   - Data: Sehat (450, hijau), Perhatian (80, kuning), Sakit (20, merah)
   - Responsif terhadap lebar layar

4. **BarChart — Aktivitas per Blok**
   - Labels: A1, A2, B1, B2, C1, C2
   - Data: [45, 38, 52, 41, 35, 48]
   - Warna biru dengan gradient

5. **Peringatan & Notifikasi (3 item)**

   | Alert      | Warna  | Pesan                                        |
   | ---------- | ------ | -------------------------------------------- |
   | ⚠️ Warning | Kuning | Blok B2 menunjukkan tanda kekurangan air     |
   | 🔴 Danger  | Merah  | Hama terdeteksi di Blok C1, perlu penanganan |
   | ✅ Info    | Hijau  | Hasil panen Blok A1 meningkat 15%            |

#### Library Grafik

Menggunakan `react-native-chart-kit` dengan konfigurasi:

```typescript
const chartConfig = {
  backgroundGradientFrom: "#ffffff",
  backgroundGradientTo: "#ffffff",
  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.7,
  decimalPlaces: 0,
};
```

---

### 7.6 Diagnosis Tanaman

**File:** `components/ui/diagnosis.tsx`  
**Route:** `app/diagnosis.tsx` (Stack Screen)  
**Warna Header:** Merah `#ef4444`  
**Ikon Header:** Stethoscope

#### Deskripsi

Fitur diagnosis penyakit tanaman berbasis checklist gejala. Pengguna memilih gejala yang diamati, dan sistem memberikan analisis risiko beserta rekomendasi penanganan.

#### Komponen Utama

1. **Header Section**
   - Background merah, ikon Stethoscope
   - Judul "Diagnosis" dan subtitle "Identifikasi masalah tanaman Anda"
   - Tombol kembali (◀) ke halaman sebelumnya

2. **Daftar Gejala (10 gejala)**

   | No  | Gejala                  | Istilah Lokal         | Severity |
   | --- | ----------------------- | --------------------- | -------- |
   | 1   | Daun menguning          | Godhong kuning (Jawa) | High     |
   | 2   | Bercak coklat pada daun | Bintik-bintik (umum)  | High     |
   | 3   | Daun layu/menggulung    | Layu (umum)           | Medium   |
   | 4   | Batang membusuk         | Busuk batang (umum)   | High     |
   | 5   | Pertumbuhan terhambat   | Kerdil (umum)         | Medium   |
   | 6   | Buah rontok prematur    | Rontok (umum)         | Medium   |
   | 7   | Bercak putih/tepung     | Jamur tepung (umum)   | Low      |
   | 8   | Akar coklat/hitam       | Busuk akar (umum)     | High     |
   | 9   | Daun berlubang          | Hama ulat (umum)      | Low      |
   | 10  | Perubahan warna batang  | Batang belang (umum)  | Medium   |
   - Setiap gejala memiliki checkbox interaktif
   - Badge severity berwarna (merah = high, kuning = medium, hijau = low)
   - Istilah lokal ditampilkan dalam teks abu-abu

3. **Panel Analisis Risiko**
   - Muncul setelah memilih minimal 1 gejala
   - **Level Risiko:**
     - 🔴 Tinggi (≥ 3 gejala high) — merah
     - 🟡 Sedang (≥ 2 gejala medium) — kuning
     - 🟢 Rendah (default) — hijau

4. **Hasil Diagnosis**
   - Tombol "Mulai Diagnosis" aktif jika ≥ 1 gejala dipilih
   - Menampilkan:
     - Jumlah gejala terdeteksi
     - Kemungkinan penyakit
     - Rekomendasi tindakan
     - Level risiko dengan indikator warna

#### Logika Diagnosis

```typescript
function getRiskLevel(selected: string[]): "high" | "medium" | "low" {
  const highCount = selected.filter(
    (id) => symptoms.find((s) => s.id === id)?.severity === "high",
  ).length;
  const mediumCount = selected.filter(
    (id) => symptoms.find((s) => s.id === id)?.severity === "medium",
  ).length;

  if (highCount >= 3) return "high";
  if (mediumCount >= 2) return "medium";
  return "low";
}
```

---

### 7.7 Evaluasi Panen

**File:** `components/ui/evaluation.tsx`  
**Route:** `app/evaluation.tsx` (Stack Screen)  
**Warna Header:** Ungu `#a855f7`  
**Ikon Header:** ClipboardCheck

#### Deskripsi

Halaman evaluasi kualitas hasil panen yang menampilkan metrik, grafik tren, standar kualitas, dan riwayat panen terbaru.

#### Komponen Utama

1. **Header Section**
   - Background ungu, ikon ClipboardCheck
   - Judul "Evaluasi" dan subtitle "Analisis kualitas panen Anda"
   - Tombol kembali (◀)

2. **Period Selector**
   - 3 pilihan periode: Minggu / Bulan / Tahun
   - Toggle button horizontal
   - Mempengaruhi tampilan data (visual only pada versi dummy)

3. **Kartu Metrik (3 kartu)**

   | Metrik          | Nilai   | Label            | Trend    |
   | --------------- | ------- | ---------------- | -------- |
   | Grade A         | 78%     | Kualitas Terbaik | ↑ +5%    |
   | Total Volume    | 2.4 ton | Hasil Bulan Ini  | ↑ +12%   |
   | Rata-rata Berat | 245 gr  | Per Buah         | → Stabil |

4. **BarChart — Distribusi Grade per Minggu**
   - Labels: Minggu 1–4
   - Data Grade A: [45, 52, 48, 55]
   - Warna ungu

5. **LineChart — Tren Volume Panen**
   - Labels: Minggu 1–4
   - Data: [180, 220, 195, 240]
   - Garis ungu dengan titik data

6. **Standar Kualitas**
   - Tabel standar grade dengan warna:
     - ⭐ Grade A (hijau): Ukuran besar, mulus, segar
     - Grade B (kuning): Ukuran sedang, minor defect
     - Grade C (merah): Ukuran kecil, visible defect

7. **Riwayat Panen Terbaru (3 entri)**

   | Blok    | Tanggal     | Volume | Grade   |
   | ------- | ----------- | ------ | ------- |
   | Blok A1 | 2 Feb 2026  | 45 kg  | Grade A |
   | Blok B2 | 1 Feb 2026  | 38 kg  | Grade B |
   | Blok A2 | 30 Jan 2026 | 52 kg  | Grade A |

#### Library Grafik

Menggunakan `BarChart` dan `LineChart` dari `react-native-chart-kit`:

```typescript
// BarChart - Distribusi Grade
const qualityData = {
  labels: ["Minggu 1", "Minggu 2", "Minggu 3", "Minggu 4"],
  datasets: [{ data: [45, 52, 48, 55] }],
};

// LineChart - Tren Volume
const volumeData = {
  labels: ["Minggu 1", "Minggu 2", "Minggu 3", "Minggu 4"],
  datasets: [{ data: [180, 220, 195, 240] }],
};
```

---

## 8. Pola Desain UI/UX

### 8.1 Header Konsisten

Semua halaman menggunakan pola header yang seragam untuk menciptakan kesan yang konsisten dan profesional:

```
┌────────────────────────────────────────────┐
│  paddingTop: 50                            │
│                                            │
│        ┌─────────┐                         │
│        │  🌿     │  ← Icon dalam lingkaran │
│        │  Icon   │     rgba(255,255,255,0.2)│
│        └─────────┘     borderRadius: 99    │
│                                            │
│      Judul Halaman    ← fontSize: 20, bold │
│    Deskripsi singkat  ← fontSize: 13       │
│                                            │
│  paddingBottom: 20                         │
│  borderBottomLeftRadius: 24                │
│  borderBottomRightRadius: 24               │
└────────────────────────────────────────────┘
```

**Properti Standar:**

```typescript
header: {
  paddingTop: 50,
  paddingBottom: 20,
  paddingHorizontal: 20,
  borderBottomLeftRadius: 24,
  borderBottomRightRadius: 24,
  alignItems: "center",
},
headerIconCircle: {
  backgroundColor: "rgba(255, 255, 255, 0.2)",
  borderRadius: 99,
  padding: 12,
  marginBottom: 10,
},
headerTitle: {
  color: "#fff",
  fontSize: 20,
  fontWeight: "bold",
},
headerSubtitle: {
  color: "rgba(255, 255, 255, 0.85)",
  fontSize: 13,
  marginTop: 4,
},
```

### 8.2 Kartu (Card Pattern)

Kartu digunakan secara konsisten untuk menampilkan konten:

```typescript
card: {
  backgroundColor: "#fff",
  borderRadius: 20,
  padding: 16,
  marginBottom: 20,
  borderWidth: 1,
  borderColor: "#f3f4f6",
  elevation: 2,  // Shadow Android
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
}
```

### 8.3 Grid Button Pattern

Digunakan pada logbook (blok & kegiatan), scanner (kegiatan), dan beranda (menu):

```typescript
gridButton: {
  width: "30%",           // 3 kolom
  // atau "47%"           // 2 kolom
  paddingVertical: 12,
  borderRadius: 12,
  borderWidth: 1.5,
  borderColor: "#e5e7eb",
  backgroundColor: "#f9fafb",
  alignItems: "center",
},
gridButtonActive: {
  backgroundColor: "#3b82f6",  // Warna aktif
  borderColor: "#2563eb",
},
```

### 8.4 Modal Pengembangan

Pattern modal untuk fitur yang masih dalam pengembangan:

```
┌──────────────────────────────────┐
│   ┌──────────────────────┐       │
│   │   🚧 Construction   │       │ ← Ikon construction (oranye)
│   └──────────────────────┘       │
│                                  │
│   Fitur Dalam Pengembangan       │ ← Judul
│                                  │
│   Tim kami sedang mengembangkan  │ ← Deskripsi
│   fitur ini untuk memberikan...  │
│                                  │
│   ┌──────────────────────┐       │
│   │   Segera Hadir       │       │ ← Badge kuning
│   └──────────────────────┘       │
│                                  │
│   ┌──────────────────────────┐   │
│   │   🏠 Kembali ke Beranda │   │ ← Tombol kembali
│   └──────────────────────────┘   │
└──────────────────────────────────┘
```

### 8.5 Warna dan Ikonografi

- **Library Ikon:** `lucide-react-native` — ikon modern, ringan, dan konsisten
- **Palette:** Menggunakan skema warna Tailwind CSS (green-600, blue-500, red-500, dll)
- **Emoji:** Digunakan pada logbook untuk kegiatan (💧🌱🪴🧪✂️🔍)
- **Badge:** Rounded pill untuk status dan label

---

## 9. Fase Pengembangan

### Fase 1: Setup & Fondasi

**Tujuan:** Membangun struktur dasar aplikasi

- ✅ Inisialisasi proyek Expo dengan TypeScript
- ✅ Konfigurasi file-based routing (Expo Router)
- ✅ Setup sistem tema (light/dark mode)
- ✅ Implementasi custom tab bar dengan floating scanner button
- ✅ Pembuatan halaman beranda dengan grid menu
- ✅ Pembuatan 6 halaman fitur utama dengan UI lengkap dan data dummy

### Fase 2: Polishing & Modal Pengembangan

**Tujuan:** Menandai fitur yang masih dalam pengembangan dan memperbaiki UI

- ✅ Menambahkan modal "Fitur Dalam Pengembangan" pada Scanner dan Chatbot
- ✅ Memperbaiki topbar logbook agar konsisten dengan halaman lain
- ✅ Membangun kalender custom untuk pemilihan tanggal di logbook
- ✅ Menambahkan filter tanggal pada riwayat logbook
- ✅ Menambahkan lebih banyak data dummy pada logbook (6 entri)
- ✅ Optimisasi fitur evaluasi (pembaruan tanggal ke Feb 2026)

### Fase 3: Konsistensi UI & Refinement

**Tujuan:** Menyeragamkan desain dan memperbaiki bugs

- ✅ Menghapus tombol "Lihat Preview" dari modal pengembangan (Scanner & Chatbot)
- ✅ Memperbaiki konsistensi modal — menggunakan `useFocusEffect` agar modal selalu muncul saat navigasi bolak-balik
- ✅ Menyeragamkan header di SEMUA halaman (7 halaman) dengan pola icon-circle
- ✅ Diagnosis & Evaluasi: Migrasi dari built-in `Stack.Screen` header ke custom header
- ✅ Memperbarui semua halaman dengan `paddingTop: 50`, `borderRadius: 24`, dan styling konsisten

### Fase 4: Dokumentasi _(Saat Ini)_

**Tujuan:** Mendokumentasikan seluruh perkembangan aplikasi

- ✅ Pembuatan file `DOKUMENTASI.md` komprehensif
- ✅ Dokumentasi arsitektur, fitur, dan pola desain

### Fase 5: Integrasi Backend _(Rencana)_

**Tujuan:** Menghubungkan aplikasi dengan database dan API

- ⬜ Integrasi database (Firebase/Supabase) untuk penyimpanan data
- ⬜ Implementasi autentikasi pengguna
- ⬜ API AI untuk chatbot (OpenAI/custom model)
- ⬜ Integrasi kamera untuk QR scanner (expo-camera)
- ⬜ Sinkronisasi data realtime
- ⬜ Push notification untuk peringatan

---

## 10. Status & Rencana Pengembangan

### Status Fitur Saat Ini

| Fitur           | Status          | UI               | Data          | Backend  |
| --------------- | --------------- | ---------------- | ------------- | -------- |
| Beranda         | ✅ Selesai      | ✅               | ✅ Statis     | -        |
| Logbook Digital | ✅ Selesai      | ✅               | 📋 Dummy      | ⬜ Belum |
| Scanner QR      | 🚧 Pengembangan | ✅ (tersembunyi) | 📋 Simulasi   | ⬜ Belum |
| Asisten Chatbot | 🚧 Pengembangan | ✅ (tersembunyi) | 📋 Dictionary | ⬜ Belum |
| Dashboard       | ✅ Selesai      | ✅               | 📋 Dummy      | ⬜ Belum |
| Diagnosis       | ✅ Selesai      | ✅               | 📋 Dummy      | ⬜ Belum |
| Evaluasi Panen  | ✅ Selesai      | ✅               | 📋 Dummy      | ⬜ Belum |

### Keterangan Status

- ✅ **Selesai:** UI lengkap dan fungsional (dengan data dummy)
- 🚧 **Pengembangan:** UI ada di belakang modal, belum bisa diakses pengguna
- 📋 **Dummy:** Menggunakan data hardcoded, belum terhubung database
- ⬜ **Belum:** Belum diimplementasikan

### Yang Perlu Dikembangkan Selanjutnya

1. **Prioritas Tinggi:**
   - Integrasi database untuk persistensi data logbook
   - Implementasi kamera untuk QR scanner (menggantikan simulasi)
   - Autentikasi pengguna (login/register)

2. **Prioritas Sedang:**
   - Integrasi API AI untuk chatbot
   - Dashboard dengan data real dari logbook
   - Push notification untuk peringatan tanaman

3. **Prioritas Rendah:**
   - Fitur export data (PDF/Excel)
   - Mode offline dengan local storage
   - Multi-bahasa (selain Bahasa Indonesia)
   - Integrasi cuaca

---

## Catatan Teknis Penting

### Dependencies yang Diperlukan untuk Pengembangan Lanjutan

```bash
# QR Scanner (belum diinstall)
npx expo install expo-camera expo-barcode-scanner

# Database (pilih salah satu)
npm install firebase              # Firebase
npm install @supabase/supabase-js # Supabase

# State Management (opsional)
npm install zustand               # Ringan
npm install @tanstack/react-query # Server state

# Storage lokal
npx expo install expo-secure-store
npx expo install @react-native-async-storage/async-storage
```

### Cara Menjalankan Aplikasi

```bash
# Install dependencies
npm install

# Jalankan di development mode
npx expo start

# Jalankan di Android
npx expo start --android

# Jalankan di iOS
npx expo start --ios

# Jalankan di web
npx expo start --web
```

### Scripts yang Tersedia

```json
{
  "start": "expo start",
  "android": "expo start --android",
  "ios": "expo start --ios",
  "web": "expo start --web",
  "test": "jest --watchAll",
  "lint": "expo lint",
  "reset-project": "node ./scripts/reset-project.js"
}
```

---

> **Dokumen ini dibuat sebagai bagian dari proyek PKM Agri-Smart.**  
> **Untuk pertanyaan atau kontribusi, silakan hubungi tim pengembang.**
