# BUKU PUTIH TEKNIS

## Sistem Pakar Diagnosis Penyakit Tanaman Melon (_Cucumis melo_ L.) Berbasis Forward Chaining pada Aplikasi Agri-Smart

---

**Versi Dokumen:** 1.0  
**Tanggal Terbit:** 20 Februari 2026  
**Klasifikasi:** Lampiran Teknis Laporan Akademik  
**Platform:** React Native (Expo SDK 54) — SQLite Offline-First  
**Penyusun:** Tim Pengembang Agri-Smart

---

## Daftar Isi

- [BAB I — Pendahuluan & Arsitektur Sistem](#bab-i--pendahuluan--arsitektur-sistem)
  - [1.1. Latar Belakang & Tujuan](#11-latar-belakang--tujuan)
  - [1.2. Arsitektur Sistem Pakar](#12-arsitektur-sistem-pakar)
  - [1.3. Forward Chaining Engine](#13-forward-chaining-engine)
  - [1.4. Algoritma Scoring (Perhitungan Kecocokan)](#14-algoritma-scoring-perhitungan-kecocokan)
  - [1.5. Mekanisme Pertanyaan Pembeda (Eliminasi Dinamis)](#15-mekanisme-pertanyaan-pembeda-eliminasi-dinamis)
  - [1.6. Klasifikasi Tingkat Kecocokan](#16-klasifikasi-tingkat-kecocokan)
- [BAB II — Alur Pengguna (User Flow)](#bab-ii--alur-pengguna-user-flow)
  - [2.1. Langkah 1: Pemilihan Bagian Tanaman](#21-langkah-1-pemilihan-bagian-tanaman)
  - [2.2. Langkah 2: Pemilihan Gejala (Checklist)](#22-langkah-2-pemilihan-gejala-checklist)
  - [2.3. Langkah 3: Sesi Pertanyaan Diagnostik](#23-langkah-3-sesi-pertanyaan-diagnostik)
  - [2.4. Langkah 4: Hasil Diagnosis](#24-langkah-4-hasil-diagnosis)
- [BAB III — Sumber Referensi Data (Data Provenance)](#bab-iii--sumber-referensi-data-data-provenance)
  - [3.1. Daftar Pustaka Primer](#31-daftar-pustaka-primer)
- [BAB IV — Katalog Lengkap Knowledge Base](#bab-iv--katalog-lengkap-knowledge-base)
  - [4.A. Daftar Bagian Tanaman (5 Entri)](#4a-daftar-bagian-tanaman-5-entri)
  - [4.B. Daftar Lengkap Gejala (39 Entri)](#4b-daftar-lengkap-gejala-39-entri)
  - [4.C. Daftar Lengkap Penyakit & Hama (19 Entri)](#4c-daftar-lengkap-penyakit--hama-19-entri)
  - [4.D. Daftar Pertanyaan Pembeda (8 Entri)](#4d-daftar-pertanyaan-pembeda-8-entri)

---

## BAB I — Pendahuluan & Arsitektur Sistem

### 1.1. Latar Belakang & Tujuan

Tanaman melon (_Cucumis melo_ L.) merupakan salah satu komoditas hortikultura bernilai ekonomi tinggi di Indonesia. Namun, budidaya melon rentan terhadap serangan berbagai penyakit — mulai dari penyakit jamur (fungi), bakteri, virus, nematoda, hingga hama serangga — yang apabila tidak teridentifikasi secara dini dan akurat dapat mengakibatkan kerugian hasil panen yang signifikan.

Fitur **"Diagnosis Penyakit Cerdas"** pada aplikasi Agri-Smart dirancang untuk mengatasi kesenjangan ini. Fitur ini bertindak sebagai **sistem pakar (expert system)** portabel yang memungkinkan petani dan petugas lapangan melakukan identifikasi penyakit melon secara mandiri di lokasi pertanaman — tanpa memerlukan koneksi internet (offline-first) maupun keahlian fitopatologi formal.

**Tujuan utama fitur ini adalah:**

1. Menyediakan mekanisme diagnosis interaktif berbasis gejala visual yang teramati di lapangan.
2. Menghasilkan identifikasi penyakit/hama beserta tingkat kecocokan (confidence level) yang terukur dan transparan.
3. Memberikan rekomendasi penanganan spesifik yang bersumber dari literatur fitopatologi terpercaya.
4. Menyimpan riwayat diagnosis ke database lokal (SQLite) untuk keperluan analisis historis dan pelaporan.

### 1.2. Arsitektur Sistem Pakar

Sistem pakar pada Agri-Smart dibangun dengan arsitektur tiga komponen utama:

```
┌─────────────────────────────────────────────────────────────────┐
│                     ARSITEKTUR SISTEM PAKAR                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐    ┌──────────────────┐    ┌───────────┐ │
│  │  KNOWLEDGE BASE  │    │ INFERENCE ENGINE  │    │    UI     │ │
│  │  (Basis Data)    │───>│ (Forward Chaining)│<──>│ (4 Step)  │ │
│  │                  │    │                   │    │           │ │
│  │ • 5 Bag. Tanaman │    │ • calculateScores │    │ Step 1    │ │
│  │ • 39 Gejala      │    │ • getNextQuestion │    │ Step 2    │ │
│  │ • 19 Penyakit    │    │ • getMatchLabel   │    │ Step 3    │ │
│  │ • 8 Pertanyaan   │    │ • getMatchColors  │    │ Step 4    │ │
│  └──────────────────┘    └────────┬─────────┘    └───────────┘ │
│                                   │                             │
│                          ┌────────▼─────────┐                   │
│                          │   SQLite LOCAL    │                   │
│                          │ diagnosis_records │                   │
│                          └──────────────────┘                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

| Komponen             | Lokasi File                   | Deskripsi                                                                            |
| -------------------- | ----------------------------- | ------------------------------------------------------------------------------------ |
| **Knowledge Base**   | `src/data/melon-diseases.ts`  | Basis pengetahuan statis berisi seluruh data penyakit, gejala, dan aturan inferensi. |
| **Inference Engine** | `components/ui/diagnosis.tsx` | Fungsi-fungsi murni (pure functions) yang menjalankan algoritma Forward Chaining.    |
| **User Interface**   | `components/ui/diagnosis.tsx` | Antarmuka 4-langkah interaktif berbasis React Native.                                |
| **Persistence**      | `src/database/database.ts`    | Tabel `diagnosis_records` pada SQLite lokal.                                         |

### 1.3. Forward Chaining Engine

Sistem ini menggunakan metode **Forward Chaining** (pelacakan maju), yaitu metode inferensi yang bekerja dengan cara:

1. **Mengumpulkan fakta-fakta** dari pengguna — yaitu gejala-gejala yang teramati di lapangan (dinyatakan sebagai kumpulan ID gejala yang dipilih) dan jawaban terhadap pertanyaan pembeda.
2. **Mencocokkan fakta-fakta** tersebut terhadap seluruh aturan (rules) yang tersimpan dalam Knowledge Base — yaitu daftar gejala yang dimiliki setiap penyakit.
3. **Menghasilkan kesimpulan** berupa daftar penyakit kandidat yang diurutkan berdasarkan skor kecocokan (confidence score) tertinggi.

Berbeda dengan _Backward Chaining_ yang dimulai dari hipotesis lalu mencari fakta pembuktian, Forward Chaining pada sistem ini dimulai dari fakta (gejala) yang diinput pengguna dan secara progresif menyempitkan ruang pencarian melalui dua fase:

- **Fase 1 (Step 2):** Pencocokan gejala — _base score_ dihitung dari rasio gejala yang cocok terhadap total gejala setiap penyakit.
- **Fase 2 (Step 3):** Pertanyaan pembeda — skor disesuaikan berdasarkan jawaban pertanyaan diagnostik untuk membedakan penyakit yang gejalanya tumpang tindih (_overlapping_).

### 1.4. Algoritma Scoring (Perhitungan Kecocokan)

Perhitungan skor kecocokan dilakukan oleh fungsi `calculateScores()` dengan formula sebagai berikut:

#### A. Base Score (Skor Dasar)

$$
\text{Base Score}_i = \left( \frac{|\text{Gejala Terpilih} \cap \text{Gejala Penyakit}_i|}{|\text{Gejala Penyakit}_i|} \right) \times 100
$$

Di mana:

- $|\text{Gejala Terpilih} \cap \text{Gejala Penyakit}_i|$ = Jumlah gejala yang dipilih pengguna **dan** termasuk dalam daftar gejala penyakit ke-_i_ (match count).
- $|\text{Gejala Penyakit}_i|$ = Total jumlah gejala yang terdaftar pada penyakit ke-_i_ dalam Knowledge Base.

> **Catatan:** Penyakit yang tidak memiliki satu pun gejala yang cocok ($\text{match count} = 0$) langsung dieliminasi dan tidak disertakan dalam daftar kandidat.

#### B. Adjustment (Penyesuaian dari Pertanyaan Pembeda)

Setelah pengguna menjawab pertanyaan pembeda pada Step 3, skor disesuaikan secara akumulatif:

$$
\text{Adjustment}_i = \sum_{q \in Q_{\text{dijawab}}} \delta(q, i)
$$

Di mana $\delta(q, i)$ untuk setiap pertanyaan $q$ dan penyakit $i$ adalah:

| Kondisi                                                                  | Nilai $\delta$  |
| ------------------------------------------------------------------------ | --------------- |
| Jawaban = "Ya" **dan** penyakit $i$ masuk `yesSupports` pertanyaan $q$   | $+15$           |
| Jawaban = "Ya" **dan** penyakit $i$ _tidak_ masuk `yesSupports`          | $-10$           |
| Jawaban = "Tidak" **dan** penyakit $i$ masuk `noSupports` pertanyaan $q$ | $+15$           |
| Jawaban = "Tidak" **dan** penyakit $i$ _tidak_ masuk `noSupports`        | $-10$           |
| Jawaban = "Tidak Yakin"                                                  | $0$ (diabaikan) |

> **Catatan:** Penyesuaian hanya diterapkan jika penyakit $i$ termasuk dalam `targetDiseases` pertanyaan $q$.

#### C. Skor Akhir

$$
\text{Score}_i = \min\!\Big(100, \; \max\!\big(0, \; \lfloor \text{Base Score}_i + \text{Adjustment}_i \rceil \big)\Big)
$$

Skor akhir di-_clamp_ dalam rentang **[0, 100]** dan dibulatkan ke bilangan bulat terdekat.

#### D. Pengurutan Hasil

Seluruh penyakit kandidat diurutkan secara menurun (_descending_) berdasarkan skor akhir. Kandidat teratas (peringkat 1) menjadi hasil diagnosis utama yang ditampilkan kepada pengguna.

### 1.5. Mekanisme Pertanyaan Pembeda (Eliminasi Dinamis)

Pertanyaan pembeda (_differentiating questions_) berperan sebagai instrumen eliminasi dinamis ketika terdapat lebih dari satu penyakit dengan skor yang berdekatan. Mekanisme ini dijalankan oleh fungsi `getNextQuestion()`.

**Aturan pemilihan pertanyaan:**

1. Sistem mengambil 3 kandidat teratas berdasarkan skor saat ini.
2. Dari bank 8 pertanyaan yang tersedia, sistem mencari pertanyaan yang **belum pernah dijawab** dan yang `targetDiseases`-nya memiliki **≥ 2 penyakit kandidat aktif** (terdapat dalam 3 kandidat teratas).
3. Pertanyaan pertama yang memenuhi kedua kriteria di atas akan diajukan.
4. Jika tidak ada pertanyaan yang memenuhi kriteria, sesi pertanyaan otomatis berakhir dan sistem langsung menampilkan hasil diagnosis.

**Kondisi terminasi sesi pertanyaan:**

| Kondisi                                  | Keterangan                                                     |
| ---------------------------------------- | -------------------------------------------------------------- |
| Tidak ada pertanyaan relevan tersisa     | Semua pertanyaan sudah dijawab atau tidak ada yang relevan.    |
| Jumlah pertanyaan dijawab ≥ 5            | Batas maksimal pertanyaan per sesi diagnosis.                  |
| Hanya tersisa ≤ 1 kandidat               | Eliminasi alami telah menyisakan satu atau nol kandidat.       |
| Selisih skor peringkat 1 dan 2 > 25 poin | Dominasi skor yang cukup signifikan untuk menghentikan proses. |

### 1.6. Klasifikasi Tingkat Kecocokan

Skor numerik akhir dikonversi ke label tingkat kecocokan sebagai berikut:

| Rentang Skor | Label Kecocokan | Makna Klinis                                                               |
| :----------: | --------------- | -------------------------------------------------------------------------- |
|  **80–100**  | Sangat Tinggi   | Diagnosis sangat meyakinkan; tindakan penanganan dapat langsung dilakukan. |
|  **60–79**   | Tinggi          | Diagnosis cukup meyakinkan; disarankan konfirmasi visual tambahan.         |
|  **40–59**   | Sedang          | Beberapa gejala cocok tetapi belum konklusif; perlu observasi lanjutan.    |
|   **0–39**   | Rendah          | Kecocokan rendah; kemungkinan penyakit lain atau gejala belum lengkap.     |

---

## BAB II — Alur Pengguna (User Flow)

Fitur diagnosis mengimplementasikan alur interaktif 4 langkah yang dirancang menyerupai sesi konsultasi seorang ahli fitopatologi:

```
┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐
│  LANGKAH 1 │────>│  LANGKAH 2 │────>│  LANGKAH 3 │────>│  LANGKAH 4 │
│   Bagian   │     │   Gejala   │     │ Pertanyaan │     │   Hasil    │
│  Tanaman   │     │ (Checklist)│     │  Pembeda   │     │ Diagnosis  │
└────────────┘     └──────┬─────┘     └────────────┘     └────────────┘
                          │                                     ↑
                          │    [Skip jika dominasi skor > 30    │
                          │     atau ≤1 kandidat               │
                          │     atau tidak ada pertanyaan]      │
                          └─────────────────────────────────────┘
```

### 2.1. Langkah 1: Pemilihan Bagian Tanaman

**Tujuan:** Menyaring ruang gejala agar pengguna hanya melihat gejala yang relevan dengan bagian tanaman yang bermasalah.

- Pengguna memilih **satu** dari 5 bagian tanaman: Daun, Batang, Buah, Akar, atau Serangga/Hama.
- Antarmuka menampilkan 5 kartu dalam tata letak _grid_ 2 kolom (kartu terakhir lebar penuh jika jumlah ganjil), masing-masing dilengkapi ikon dan deskripsi singkat.
- Setelah memilih, sistem secara otomatis berpindah ke Langkah 2 dan memfilter daftar gejala berdasarkan kategori yang dipilih.

### 2.2. Langkah 2: Pemilihan Gejala (Checklist)

**Tujuan:** Mengumpulkan fakta (gejala) yang teramati di lapangan.

- Ditampilkan daftar gejala sesuai kategori bagian tanaman yang dipilih di Langkah 1, dalam format _checklist_ (centang/tidak centang).
- Setiap gejala memiliki label deskriptif. Gejala dengan tingkat keparahan "high" ditandai dengan _badge_ "Serius".
- Pengguna dapat memilih satu atau lebih gejala.
- Tombol **"Diagnosis Sekarang (n)"** aktif ketika minimal 1 gejala dipilih, menampilkan jumlah gejala terpilih.

**Kondisi lompat langsung ke Langkah 4 (melewati Langkah 3):**

Ketika tombol "Diagnosis Sekarang" ditekan, sistem menghitung skor awal (`calculateScores`) dan memeriksa tiga kondisi berikut. Jika **salah satu** terpenuhi, Langkah 3 dilewati:

1. Hanya terdapat ≤ 1 kandidat penyakit (tidak ada ambiguitas).
2. Selisih skor antara kandidat peringkat 1 dan peringkat 2 melebihi **30 poin** (dominasi jelas).
3. Tidak ditemukan pertanyaan pembeda yang relevan untuk kandidat teratas.

### 2.3. Langkah 3: Sesi Pertanyaan Diagnostik

**Tujuan:** Menyempitkan kandidat penyakit melalui pertanyaan diagnostik yang ditargetkan untuk membedakan penyakit dengan gejala yang tumpang tindih.

- Pertanyaan ditampilkan **satu per satu** dalam kartu pertanyaan, disertai nomor urut pertanyaan.
- Pengguna menjawab menggunakan 3 tombol: **Ya**, **Tidak**, atau **Tidak Yakin**.
- Setelah setiap jawaban, skor seluruh kandidat diperbarui secara real-time.
- Panel **"Kemungkinan saat ini"** menampilkan 3 kandidat teratas beserta persentase skor terkini.
- Sesi pertanyaan berakhir secara otomatis ketika salah satu kondisi terminasi terpenuhi (lihat Bagian 1.5), dan sistem berpindah ke Langkah 4.
- Terdapat juga mekanisme _auto-transition_: jika pada saat memasuki Step 3 ternyata tidak ada pertanyaan yang relevan (misalnya, semua pertanyaan sudah dijawab atau tidak ada yang memenuhi kriteria), sistem otomatis berpindah ke Langkah 4 melalui `useEffect`.

### 2.4. Langkah 4: Hasil Diagnosis

**Tujuan:** Menampilkan hasil diagnosis akhir secara komprehensif dan memberikan opsi penyimpanan.

Elemen antarmuka yang ditampilkan:

| No. | Elemen UI                      | Deskripsi                                                                                                                                                                     |
| :-: | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  1  | **Kartu Hasil Utama**          | Nama penyakit, nama ilmiah (_scientific name_), ikon risiko, dan tiga metrik: persentase kecocokan, label tingkat kecocokan, dan label tingkat risiko (Rendah/Sedang/Tinggi). |
|  2  | **Deskripsi**                  | Penjelasan lengkap tentang penyakit hasil diagnosis: etiologi, patogenesis, karakteristik, dan penyebaran.                                                                    |
|  3  | **Rekomendasi Penanganan**     | Daftar terurut (numbered list) berisi langkah-langkah penanganan spesifik — umumnya 4 butir rekomendasi per penyakit.                                                         |
|  4  | **Kemungkinan Lain**           | Hingga 3 penyakit kandidat alternatif (peringkat 2–4) beserta persentase skor masing-masing, ditampilkan jika ada lebih dari 1 kandidat.                                      |
|  5  | **Gejala yang Dipilih**        | Daftar gejala yang dipilih pengguna di Langkah 2, ditampilkan dalam format _chip/tag_.                                                                                        |
|  6  | **Pertanyaan Dijawab**         | Daftar pertanyaan pembeda yang dijawab di Langkah 3 beserta jawaban pengguna (Ya/Tidak/Tidak Yakin), ditampilkan hanya jika ada pertanyaan yang dijawab.                      |
|  7  | **Tombol "Simpan ke Riwayat"** | Menyimpan hasil diagnosis ke tabel `diagnosis_records` pada database SQLite lokal.                                                                                            |
|  8  | **Tombol "Diagnosis Baru"**    | Me-_reset_ seluruh state dan kembali ke Langkah 1 untuk sesi diagnosis baru.                                                                                                  |

**Integrasi Penyimpanan Database:**

Ketika pengguna menekan tombol "Simpan ke Riwayat", data berikut ditulis ke tabel `diagnosis_records` di SQLite:

| Kolom                | Tipe         | Isi                                                                      |
| -------------------- | ------------ | ------------------------------------------------------------------------ |
| `id`                 | INTEGER (PK) | Auto-increment.                                                          |
| `date`               | TEXT         | Tanggal diagnosis (format `YYYY-MM-DD`).                                 |
| `selected_symptoms`  | TEXT (JSON)  | Array JSON berisi ID gejala yang dipilih, contoh: `["D01","D05","D07"]`. |
| `risk_level`         | TEXT         | Tingkat keparahan penyakit: `"low"`, `"medium"`, atau `"high"`.          |
| `result_title`       | TEXT         | Nama penyakit hasil diagnosis, contoh: `"Virus Mosaik Mentimun (CMV)"`.  |
| `result_description` | TEXT         | Deskripsi ringkasan: nama ilmiah, persentase kecocokan, dan label.       |
| `recommendations`    | TEXT (JSON)  | Array JSON berisi butir-butir rekomendasi penanganan.                    |

**Penanganan kasus kosong:**

Apabila tidak ditemukan penyakit yang cocok sama sekali (0 kandidat), sistem menampilkan _empty state_ dengan pesan informatif dan tombol "Coba Lagi" yang mengarahkan pengguna kembali ke Langkah 1.

---

## BAB III — Sumber Referensi Data (Data Provenance)

### 3.1. Daftar Pustaka Primer

Knowledge Base pada fitur Diagnosis Penyakit Agri-Smart disusun berdasarkan sumber-sumber literatur fitopatologi dan entomologi terpercaya berikut:

> [1] Zitter, T.A., Hopkins, D.L., & Thomas, C.E. (1996). _Compendium of Cucurbit Diseases._ St. Paul, Minnesota: The American Phytopathological Society (APS) Press. ISBN: 978-0-89054-184-2.

> [2] Blancard, D., Lecoq, H., & Pitrat, M. (2006). _A Colour Atlas of Cucurbit Diseases: Observation, Identification and Control._ London: Manson Publishing Ltd. ISBN: 978-1-874545-88-2.

> [3] Semangun, H. (2007). _Penyakit-Penyakit Tanaman Hortikultura di Indonesia._ Edisi Kedua. Yogyakarta: Gadjah Mada University Press. ISBN: 979-420-401-X.

> [4] Keinath, A.P. (2017). "Gummy Stem Blight of Cucurbits." _Clemson Cooperative Extension Bulletin_, IL-57. Clemson University, South Carolina.

> [5] CABI — Centre for Agriculture and Biosciences International. (2023). _Crop Protection Compendium: Cucumis melo — Pests & Diseases._ Wallingford, UK: CABI International. Diakses daring: [https://www.cabi.org/cpc](https://www.cabi.org/cpc).

> [6] Badan Penelitian dan Pengembangan Pertanian, Kementerian Pertanian RI. (2020). _Teknologi Pengendalian Organisme Pengganggu Tumbuhan (OPT) Tanaman Melon._ Jakarta: Pusat Penelitian dan Pengembangan Hortikultura (Puslitbanghorti).

**Catatan Data Provenance:**

- Data deskripsi penyakit dan gejala utama bersumber dari referensi [1] dan [2] sebagai standar internasional fitopatologi cucurbit.
- Konteks agroklimat tropis Indonesia disesuaikan dari referensi [3] dan [6].
- Informasi spesifik _Gummy Stem Blight_ (P04) merujuk referensi [4].
- Referensi [5] digunakan untuk validasi silang dan pembaruan data taksonomi terkini.
- Rekomendasi penanganan disesuaikan dengan ketersediaan bahan aktif dan praktik budidaya yang umum di Indonesia.

---

## BAB IV — Katalog Lengkap Knowledge Base

### 4.A. Daftar Bagian Tanaman (5 Entri)

| No. |     ID     | Label           | Deskripsi                                        | Jumlah Gejala |
| :-: | :--------: | --------------- | ------------------------------------------------ | :-----------: |
|  1  |   `daun`   | Daun            | Gejala pada permukaan, warna, atau bentuk daun   |      16       |
|  2  |  `batang`  | Batang          | Gejala pada batang, cabang, atau pangkal tanaman |       7       |
|  3  |   `buah`   | Buah            | Gejala pada buah melon                           |       7       |
|  4  |   `akar`   | Akar            | Gejala pada sistem perakaran                     |       4       |
|  5  | `serangga` | Serangga / Hama | Terdapat serangga, hama, atau tanda kehadirannya |       6       |
|     |            |                 | **Total Gejala**                                 |    **39**     |

---

### 4.B. Daftar Lengkap Gejala (39 Entri)

#### 4.B.1. Kategori: Daun (D01–D16)

| No. | ID Gejala | Label / Deskripsi Gejala                                | Keparahan |
| :-: | :-------: | ------------------------------------------------------- | :-------: |
|  1  |    D01    | Bercak kuning pada daun                                 |  Sedang   |
|  2  |    D02    | Bercak coklat atau nekrotik pada daun                   |  Sedang   |
|  3  |    D03    | Tepung atau serbuk putih di permukaan daun              |  Sedang   |
|  4  |    D04    | Daun layu meskipun tanah cukup lembap                   |  Tinggi   |
|  5  |    D05    | Daun menggulung atau keriting                           |  Sedang   |
|  6  |    D06    | Daun menguning menyeluruh (klorosis)                    |  Sedang   |
|  7  |    D07    | Pola mosaik (belang hijau tua dan hijau muda) pada daun |  Tinggi   |
|  8  |    D08    | Bercak basah (water-soaked) pada daun                   |  Tinggi   |
|  9  |    D09    | Daun mengering dari tepi                                |  Sedang   |
| 10  |    D10    | Bercak berbentuk sudut (angular) dibatasi tulang daun   |  Sedang   |
| 11  |    D11    | Bercak coklat tua dengan lingkaran kuning (halo)        |  Sedang   |
| 12  |    D12    | Lapisan spora keunguan atau abu-abu di bawah daun       |  Tinggi   |
| 13  |    D13    | Daun menyempit dan memanjang seperti tali (shoestring)  |  Tinggi   |
| 14  |    D14    | Layu terjadi pada satu sisi tanaman terlebih dahulu     |  Tinggi   |
| 15  |    D15    | Nekrosis berbentuk huruf V dari tepi daun               |  Tinggi   |
| 16  |    D16    | Bercak dengan pola cincin konsentris (target spot)      |  Sedang   |

#### 4.B.2. Kategori: Batang (B01–B07)

| No. | ID Gejala | Label / Deskripsi Gejala                                    | Keparahan |
| :-: | :-------: | ----------------------------------------------------------- | :-------: |
| 17  |    B01    | Lesi atau bercak coklat pada batang                         |  Sedang   |
| 18  |    B02    | Batang mengeluarkan getah/eksudat berwarna coklat kemerahan |  Tinggi   |
| 19  |    B03    | Busuk pada pangkal batang                                   |  Tinggi   |
| 20  |    B04    | Perubahan warna coklat pada jaringan pembuluh batang        |  Tinggi   |
| 21  |    B05    | Batang pecah atau retak memanjang                           |  Tinggi   |
| 22  |    B06    | Batang menjadi basah, lunak, dan membusuk                   |  Tinggi   |
| 23  |    B07    | Lesi cekung memanjang pada batang                           |  Sedang   |

#### 4.B.3. Kategori: Buah (F01–F07)

| No. | ID Gejala | Label / Deskripsi Gejala                             | Keparahan |
| :-: | :-------: | ---------------------------------------------------- | :-------: |
| 24  |    F01    | Bercak cekung pada permukaan buah                    |  Sedang   |
| 25  |    F02    | Busuk buah basah (wet rot)                           |  Tinggi   |
| 26  |    F03    | Bercak berminyak (water-soaked) pada kulit buah      |  Tinggi   |
| 27  |    F04    | Buah berubah bentuk atau cacat (deformasi)           |  Sedang   |
| 28  |    F05    | Jaring kulit buah (netting) tidak rata atau abnormal |  Sedang   |
| 29  |    F06    | Bercak coklat atau nekrotik pada kulit buah          |  Sedang   |
| 30  |    F07    | Buah membusuk sebelum mencapai kematangan            |  Tinggi   |

#### 4.B.4. Kategori: Akar (A01–A04)

| No. | ID Gejala | Label / Deskripsi Gejala                           | Keparahan |
| :-: | :-------: | -------------------------------------------------- | :-------: |
| 31  |    A01    | Akar membusuk dan berwarna coklat atau hitam       |  Tinggi   |
| 32  |    A02    | Bengkak atau bintil abnormal pada akar (puru/gall) |  Sedang   |
| 33  |    A03    | Tanaman mudah tercabut dari tanah                  |  Tinggi   |
| 34  |    A04    | Bibit/kecambah rebah dan mati (damping off)        |  Tinggi   |

#### 4.B.5. Kategori: Serangga / Hama (S01–S06)

| No. | ID Gejala | Label / Deskripsi Gejala                                          | Keparahan |
| :-: | :-------: | ----------------------------------------------------------------- | :-------: |
| 35  |    S01    | Koloni kutu kecil hijau/hitam di bawah daun (kutu daun)           |  Sedang   |
| 36  |    S02    | Serangga kecil putih berterbangan saat daun digoyang (kutu kebul) |  Sedang   |
| 37  |    S03    | Bercak perak atau bekas tusukan halus pada daun                   |  Rendah   |
| 38  |    S04    | Lapisan lengket (embun madu) dan jelaga hitam pada daun           |  Sedang   |
| 39  |    S05    | Serangga kecil coklat/kuning pada bunga dan pucuk daun (thrips)   |  Sedang   |
| 40  |    S06    | Belatung atau larva di dalam buah (lalat buah)                    |  Tinggi   |

---

### 4.C. Daftar Lengkap Penyakit & Hama (19 Entri)

#### 4.C.1. Penyakit Jamur (Fungi) — P01 s.d. P08

---

#### P01 — Embun Bulu (Downy Mildew)

| Atribut            | Detail                       |
| ------------------ | ---------------------------- |
| **ID**             | P01                          |
| **Nama Umum**      | Embun Bulu (Downy Mildew)    |
| **Nama Ilmiah**    | _Pseudoperonospora cubensis_ |
| **Tingkat Risiko** | Tinggi (high)                |
| **Gejala Terkait** | D01, D10, D12, D15, D09      |

**Deskripsi:**
Penyakit jamur obligat yang utamanya menyerang daun melon dalam kondisi kelembaban tinggi (>85%) dan suhu 15–25°C. Spora (sporangia) menyebar melalui angin dan percikan air. Gejala awal berupa bercak kuning angular pada permukaan atas daun, diikuti munculnya lapisan spora berwarna keunguan atau abu-abu di permukaan bawah daun — terutama terlihat pada pagi hari saat udara masih lembap. Tanpa penanganan, bercak meluas membentuk nekrosis berbentuk huruf V dari tepi daun, dan akhirnya seluruh daun mengering.

**Rekomendasi Penanganan:**

1. Aplikasikan fungisida berbahan aktif mankozeb atau klorotalonil secara preventif setiap 7–10 hari saat musim hujan.
2. Gunakan fungisida sistemik (metalaksil atau dimetomorf) jika serangan sudah terjadi; rotasikan dengan fungisida kontak untuk mencegah resistensi.
3. Tingkatkan sirkulasi udara dengan jarak tanam minimal 60 cm dan lakukan pemangkasan daun bawah yang rapat.
4. Hindari penyiraman pada sore atau malam hari untuk mengurangi kelembaban kanopi daun.

---

#### P02 — Embun Tepung (Powdery Mildew)

| Atribut            | Detail                        |
| ------------------ | ----------------------------- |
| **ID**             | P02                           |
| **Nama Umum**      | Embun Tepung (Powdery Mildew) |
| **Nama Ilmiah**    | _Podosphaera xanthii_         |
| **Tingkat Risiko** | Sedang (medium)               |
| **Gejala Terkait** | D03, D06, D09                 |

**Deskripsi:**
Penyakit jamur yang ditandai munculnya lapisan tepung atau serbuk putih pada permukaan atas maupun bawah daun. Berbeda dengan embun bulu, embun tepung justru berkembang baik pada kondisi kering dengan suhu moderat (20–27°C) dan kelembaban udara tinggi tanpa hujan langsung. Spora menyebar melalui angin. Infeksi biasanya dimulai pada daun tua di bagian bawah tanaman, kemudian menjalar ke atas. Daun yang terinfeksi parah menguning dan mengering sehingga mengurangi fotosintesis, yang berdampak pada penurunan ukuran dan kualitas buah.

**Rekomendasi Penanganan:**

1. Aplikasikan fungisida berbahan aktif sulfur (belerang) atau trifloksistrobin pada awal kemunculan gejala.
2. Semprot larutan kalium bikarbonat (5 g/L air) sebagai alternatif organik yang cukup efektif.
3. Gunakan varietas melon yang memiliki ketahanan terhadap powdery mildew jika tersedia.
4. Buang dan musnahkan daun yang terinfeksi berat untuk mengurangi sumber inokulum di lahan.

---

#### P03 — Layu Fusarium (Fusarium Wilt)

| Atribut            | Detail                               |
| ------------------ | ------------------------------------ |
| **ID**             | P03                                  |
| **Nama Umum**      | Layu Fusarium (Fusarium Wilt)        |
| **Nama Ilmiah**    | _Fusarium oxysporum_ f.sp. _melonis_ |
| **Tingkat Risiko** | Tinggi (high)                        |
| **Gejala Terkait** | D04, D14, D06, B04, B03              |

**Deskripsi:**
Penyakit layu yang disebabkan jamur tanah (soil-borne). Patogen masuk melalui akar dan mengkolonisasi jaringan pembuluh (xylem), menyumbat aliran air ke bagian atas tanaman. Gejala khas adalah layu yang dimulai dari satu sisi tanaman (unilateral wilt) — yaitu hanya satu cabang atau sisi yang layu sementara sisi lain masih segar. Ketika batang dipotong melintang, terlihat perubahan warna coklat pada jaringan pembuluh. Pangkal batang dapat membusuk. Jamur bertahan di tanah selama bertahun-tahun sebagai klamidospora, sehingga sulit dieradikasi.

**Rekomendasi Penanganan:**

1. Gunakan varietas tahan atau rootstock (batang bawah) yang resisten terhadap Fusarium, seperti labu _Cucurbita moschata_.
2. Lakukan rotasi tanaman dengan tanaman non-cucurbit selama minimal 3–4 tahun.
3. Aplikasikan agen hayati _Trichoderma harzianum_ ke media tanam sebelum penanaman dengan dosis 10–20 g per lubang tanam.
4. Pastikan drainase lahan baik dan hindari penggenangan air yang meningkatkan risiko infeksi akar.

---

#### P04 — Busuk Batang Gummy (Gummy Stem Blight)

| Atribut            | Detail                                 |
| ------------------ | -------------------------------------- |
| **ID**             | P04                                    |
| **Nama Umum**      | Busuk Batang Gummy (Gummy Stem Blight) |
| **Nama Ilmiah**    | _Didymella bryoniae_                   |
| **Tingkat Risiko** | Tinggi (high)                          |
| **Gejala Terkait** | B01, B02, B05, B07, D02, F06           |

**Deskripsi:**
Penyakit jamur yang dapat menyerang seluruh bagian tanaman melon — daun, batang, dan buah. Gejala paling khas terdapat pada batang berupa lesi coklat yang mengeluarkan eksudat (getah) berwarna coklat kemerahan (gummy exudate). Batang yang terinfeksi berat dapat pecah atau retak memanjang. Pada daun muncul bercak coklat nekrotik, sedangkan pada buah terdapat bercak coklat yang dapat menjadi pintu masuk busuk sekunder. Patogen terbawa benih dan bertahan pada sisa tanaman, menyebar pesat saat kelembaban tinggi.

**Rekomendasi Penanganan:**

1. Gunakan benih bersertifikat yang bebas patogen atau perlakukan benih dengan fungisida tiram sebelum tanam.
2. Aplikasikan fungisida klorotalonil atau boskamid secara preventif pada batang dan daun bagian bawah, terutama saat kelembaban tinggi.
3. Bersihkan seluruh sisa tanaman di akhir musim tanam dan bakar untuk mencegah inokulum tersisa di lahan.
4. Hindari pelukaan batang saat pemangkasan; gunakan alat steril dan jangan bekerja di lahan saat tanaman basah.

---

#### P05 — Antraknosa (Anthracnose)

| Atribut            | Detail                      |
| ------------------ | --------------------------- |
| **ID**             | P05                         |
| **Nama Umum**      | Antraknosa (Anthracnose)    |
| **Nama Ilmiah**    | _Colletotrichum orbiculare_ |
| **Tingkat Risiko** | Tinggi (high)               |
| **Gejala Terkait** | D02, D16, F01, B07          |

**Deskripsi:**
Penyakit jamur yang menyebabkan bercak cekung (sunken lesion) pada buah serta lesi pada daun dan batang. Pada daun, muncul bercak coklat yang terkadang memiliki pola cincin konsentris. Pada buah, bercak cekung berwarna coklat tua sering kali menjadi pintu masuk busuk sekunder. Dalam kondisi lembap, pada permukaan bercak dapat terlihat massa spora berwarna merah muda-salmon (acervuli). Patogen menyebar melalui percikan air hujan dan berkembang optimal pada suhu 22–27°C dengan kelembaban tinggi.

**Rekomendasi Penanganan:**

1. Aplikasikan fungisida berbahan aktif mankozeb atau azoksistrobin setiap 7–10 hari, terutama saat musim hujan.
2. Gunakan mulsa plastik untuk mengurangi percikan tanah ke tanaman dan mencegah infeksi dari bawah.
3. Panen buah tepat waktu dan hindari luka mekanis pada buah selama penanganan pascapanen.
4. Lakukan rotasi tanaman minimal 2 tahun dengan tanaman non-cucurbit.

---

#### P06 — Bercak Daun Cercospora (Cercospora Leaf Spot)

| Atribut            | Detail                                        |
| ------------------ | --------------------------------------------- |
| **ID**             | P06                                           |
| **Nama Umum**      | Bercak Daun Cercospora (Cercospora Leaf Spot) |
| **Nama Ilmiah**    | _Cercospora citrullina_                       |
| **Tingkat Risiko** | Sedang (medium)                               |
| **Gejala Terkait** | D02, D11, D09                                 |

**Deskripsi:**
Penyakit jamur yang menyebabkan bercak kecil bulat (diameter 3–6 mm) berwarna coklat tua dengan lingkaran kuning (halo) di sekelilingnya pada permukaan daun. Bercak biasanya muncul tersebar di seluruh permukaan daun tanpa pola angular. Pada serangan berat, bercak-bercak dapat bergabung (koalesensi) menyebabkan daun mengering dari tepi. Penyakit ini umum di daerah tropis dengan kelembaban tinggi dan suhu hangat, serta bertahan pada sisa tanaman sebagai sumber inokulum.

**Rekomendasi Penanganan:**

1. Buang daun-daun yang terinfeksi berat dan musnahkan untuk mengurangi sumber spora.
2. Aplikasikan fungisida berbahan aktif mankozeb atau klorotalonil secara preventif setiap 10–14 hari.
3. Jaga jarak tanam yang cukup untuk meningkatkan sirkulasi udara di antara tanaman.
4. Hindari irigasi overhead (sprinkler) yang membuat daun basah dalam waktu lama; gunakan irigasi tetes.

---

#### P07 — Hawar Daun Alternaria (Alternaria Leaf Blight)

| Atribut            | Detail                                         |
| ------------------ | ---------------------------------------------- |
| **ID**             | P07                                            |
| **Nama Umum**      | Hawar Daun Alternaria (Alternaria Leaf Blight) |
| **Nama Ilmiah**    | _Alternaria cucumerina_                        |
| **Tingkat Risiko** | Sedang (medium)                                |
| **Gejala Terkait** | D02, D16, D09, F06                             |

**Deskripsi:**
Penyakit jamur yang menyebabkan bercak nekrotik dengan pola cincin konsentris khas (target spot / bull's-eye pattern) pada daun tua. Bercak dimulai kecil lalu meluas menjadi 1–2 cm. Pola cincin konsentris ini merupakan ciri pembeda utama Alternaria dibandingkan bercak jamur lainnya. Pada serangan berat, daun mengering dan rontok. Patogen juga dapat menginfeksi buah menyebabkan bercak coklat pada kulit. Jamur bertahan pada sisa tanaman dan menyebar melalui spora udara, berkembang optimal saat tanaman mengalami stres nutrisi.

**Rekomendasi Penanganan:**

1. Aplikasikan fungisida berbahan aktif iprodion atau azoksistrobin saat gejala awal muncul.
2. Pastikan pemupukan seimbang — terutama kalium — untuk memperkuat ketahanan alami tanaman.
3. Bersihkan sisa tanaman dari musim sebelumnya karena jamur bertahan sebagai saprofit di sisa jaringan.
4. Lakukan penyiraman di pagi hari agar daun cepat kering dan tidak kondusif untuk perkembangan spora.

---

#### P08 — Rebah Kecambah (Damping Off)

| Atribut            | Detail                                  |
| ------------------ | --------------------------------------- |
| **ID**             | P08                                     |
| **Nama Umum**      | Rebah Kecambah (Damping Off)            |
| **Nama Ilmiah**    | _Pythium_ spp. dan _Rhizoctonia solani_ |
| **Tingkat Risiko** | Tinggi (high)                           |
| **Gejala Terkait** | A04, B03, B06, A01, A03                 |

**Deskripsi:**
Penyakit kompleks yang menyerang bibit atau kecambah muda (umur kurang dari 2 minggu). Disebabkan oleh satu atau lebih patogen tanah — terutama _Pythium_ dan _Rhizoctonia_. Patogen menyerang pangkal batang dan akar bibit, menyebabkan jaringan menjadi basah, lunak, dan mengerut. Bibit roboh (rebah) dan mati dalam waktu singkat. Tanaman yang sudah tercabut menunjukkan akar yang membusuk berwarna coklat/hitam. Penyakit berkembang cepat pada kondisi tanah terlalu lembap, suhu rendah, dan kepadatan bibit tinggi.

**Rekomendasi Penanganan:**

1. Gunakan media semai steril atau perlakukan media tanam dengan fungisida metalaksil atau kaptam sebelum semai.
2. Hindari penyiraman berlebihan pada fase kecambah; pastikan drainase media semai benar-benar baik.
3. Berikan jarak semai yang cukup untuk mengurangi kelembaban antar bibit dan meningkatkan sirkulasi udara.
4. Rendam benih dalam larutan fungisida metalaksil 25% WP (dosis 2 g/L air) selama 15 menit sebelum disemai.

---

#### 4.C.2. Penyakit Bakteri — P09 s.d. P11

---

#### P09 — Busuk Buah Bakteri (Bacterial Fruit Blotch)

| Atribut            | Detail                                      |
| ------------------ | ------------------------------------------- |
| **ID**             | P09                                         |
| **Nama Umum**      | Busuk Buah Bakteri (Bacterial Fruit Blotch) |
| **Nama Ilmiah**    | _Acidovorax citrulli_                       |
| **Tingkat Risiko** | Tinggi (high)                               |
| **Gejala Terkait** | F03, D08, F02                               |

**Deskripsi:**
Penyakit bakteri serius yang terbawa benih (seed-borne) dan berpotensi menghancurkan hasil panen secara total. Gejala awal pada bibit berupa bercak basah (water-soaked) pada kotiledon dan daun muda. Pada buah, muncul bercak berminyak gelap (water-soaked blotch) yang cepat meluas dan diikuti busuk basah (wet rot). Bakteri menyebar sangat cepat melalui percikan air hujan, irigasi overhead, alat pertanian, dan aktivitas pekerja di lahan. Penyakit ini sangat destruktif pada melon dan semangka.

**Rekomendasi Penanganan:**

1. Gunakan benih bersertifikat bebas patogen; perlakukan benih dengan HCl 1% selama 15 menit atau panas kering (70°C, 72 jam) untuk mengurangi inokulum.
2. Aplikasikan bakterisida berbahan aktif tembaga (copper hydroxide) secara preventif setiap 7 hari sejak fase bibit.
3. Segera cabut dan musnahkan tanaman yang menunjukkan gejala untuk mencegah penyebaran ke tanaman sehat.
4. Sterilkan semua alat pertanian dan hindari bekerja di lahan saat tanaman masih basah.

---

#### P10 — Layu Bakteri (Bacterial Wilt)

| Atribut            | Detail                        |
| ------------------ | ----------------------------- |
| **ID**             | P10                           |
| **Nama Umum**      | Layu Bakteri (Bacterial Wilt) |
| **Nama Ilmiah**    | _Erwinia tracheiphila_        |
| **Tingkat Risiko** | Tinggi (high)                 |
| **Gejala Terkait** | D04, D06                      |

**Deskripsi:**
Penyakit bakteri yang ditularkan oleh kumbang ketimun (cucumber beetle). Bakteri berkembang biak di dalam jaringan pembuluh (xylem) dan menghasilkan polisakarida kental yang menyumbat aliran air, menyebabkan layu mendadak dan permanen. Gejala layu biasanya terjadi sangat cepat (1–2 hari) dan tidak pulih meskipun disiram air. Uji diagnostik sederhana: potong batang yang layu, tempelkan kedua ujung potongan, lalu tarik perlahan — jika ada benang lendir putih susu yang ikut tertarik, ini merupakan indikasi kuat layu bakteri.

**Rekomendasi Penanganan:**

1. Kendalikan populasi kumbang ketimun (cucumber beetle) sebagai vektor utama menggunakan insektisida karbaril atau imidakloprid.
2. Gunakan perangkap kuning lengket (yellow sticky trap) di sekitar lahan untuk memantau dan mengurangi populasi vektor.
3. Cabut dan musnahkan tanaman yang sudah layu total untuk mencegah bakteri menyebar ke tanaman sehat melalui vektor.
4. Gunakan row cover (penutup barisan) pada awal pertumbuhan untuk melindungi tanaman muda dari serangan kumbang vektor.

---

#### P11 — Bercak Daun Sudut (Angular Leaf Spot)

| Atribut            | Detail                                  |
| ------------------ | --------------------------------------- |
| **ID**             | P11                                     |
| **Nama Umum**      | Bercak Daun Sudut (Angular Leaf Spot)   |
| **Nama Ilmiah**    | _Pseudomonas syringae_ pv. _lachrymans_ |
| **Tingkat Risiko** | Sedang (medium)                         |
| **Gejala Terkait** | D10, D08, D09                           |

**Deskripsi:**
Penyakit bakteri yang menyebabkan bercak kecil berbentuk sudut (angular) pada daun — bentuknya dibatasi oleh tulang daun sehingga tidak bulat melainkan bersudut. Bercak awalnya tampak basah atau berminyak (water-soaked), kemudian mengering menjadi berwarna coklat dan rapuh. Pada pagi hari yang lembap, sering terlihat tetesan eksudat bakteri berwarna putih susu di bawah bercak. Bakteri menyebar melalui percikan air hujan, irigasi, dan alat pertanian yang terkontaminasi.

**Rekomendasi Penanganan:**

1. Aplikasikan bakterisida berbahan aktif tembaga (copper oxychloride) secara preventif setiap 7–10 hari.
2. Hindari irigasi sprinkler; gunakan irigasi tetes untuk mengurangi percikan air yang menyebarkan bakteri.
3. Lakukan rotasi tanaman dengan tanaman non-cucurbit selama minimal 2 tahun untuk memutus siklus bakteri.
4. Gunakan benih yang sudah diperlakukan (seed treatment) dan varietas toleran jika tersedia.

---

#### 4.C.3. Penyakit Virus — P12 s.d. P14

---

#### P12 — Virus Mosaik Mentimun (CMV)

| Atribut            | Detail                      |
| ------------------ | --------------------------- |
| **ID**             | P12                         |
| **Nama Umum**      | Virus Mosaik Mentimun (CMV) |
| **Nama Ilmiah**    | _Cucumber Mosaic Virus_     |
| **Tingkat Risiko** | Tinggi (high)               |
| **Gejala Terkait** | D07, D05, D06, D13, F04     |

**Deskripsi:**
Virus yang ditularkan secara non-persisten oleh kutu daun (aphid), terutama _Aphis gossypii_. Virus ini memiliki kisaran inang yang sangat luas (lebih dari 1.000 spesies tanaman). Gejala khas meliputi pola mosaik (belang hijau tua dan hijau muda) pada daun, daun keriting atau menggulung, klorosis menyeluruh, dan pada infeksi berat daun menyempit memanjang menyerupai tali sepatu (shoestring leaf). Pertumbuhan tanaman terhambat secara signifikan dan buah yang terbentuk mengalami deformasi. Tanaman tidak dapat disembuhkan setelah terinfeksi.

**Rekomendasi Penanganan:**

1. Cabut dan musnahkan (bakar) tanaman yang terinfeksi segera untuk mencegah penyebaran ke tanaman sehat.
2. Kendalikan populasi kutu daun sebagai vektor menggunakan insektisida imidakloprid atau abamektin, atau semprot minyak neem secara rutin.
3. Gunakan mulsa plastik perak/aluminium untuk mengusir aphid — refleksi cahaya mengganggu navigasi serangga vektor.
4. Tanam tanaman penghalang (barrier crop) seperti jagung di sekeliling lahan melon untuk mengurangi migrasi vektor.

---

#### P13 — Virus Mosaik Kuning Zucchini (ZYMV)

| Atribut            | Detail                              |
| ------------------ | ----------------------------------- |
| **ID**             | P13                                 |
| **Nama Umum**      | Virus Mosaik Kuning Zucchini (ZYMV) |
| **Nama Ilmiah**    | _Zucchini Yellow Mosaic Virus_      |
| **Tingkat Risiko** | Tinggi (high)                       |
| **Gejala Terkait** | D07, D05, D01, F04, F05             |

**Deskripsi:**
Virus dari keluarga Potyviridae yang ditularkan secara non-persisten oleh beberapa spesies kutu daun. Gejala utama berupa mosaik kuning mencolok pada daun, daun keriting dan berubah bentuk, serta deformasi buah yang parah. Berbeda dengan CMV, ZYMV cenderung menyebabkan kerusakan buah yang lebih berat — permukaan buah menjadi benjol-benjol (knobby) dan jaring kulit (netting) tidak rata. Virus menyebar cepat di lapangan dan dapat menurunkan hasil panen hingga 50–100% pada serangan berat.

**Rekomendasi Penanganan:**

1. Cabut dan musnahkan tanaman bergejala sesegera mungkin untuk mengurangi sumber penularan.
2. Kendalikan vektor kutu daun secara intensif sejak awal tanam menggunakan insektisida sistemik atau minyak mineral (petroleum spray oil) yang menghambat penularan virus.
3. Gunakan varietas melon yang memiliki gen ketahanan terhadap ZYMV jika tersedia di pasaran.
4. Terapkan sistem border crop atau tanaman perangkap di sekeliling lahan untuk mengurangi laju penyebaran vektor.

---

#### P14 — Virus Mosaik Semangka (WMV)

| Atribut            | Detail                      |
| ------------------ | --------------------------- |
| **ID**             | P14                         |
| **Nama Umum**      | Virus Mosaik Semangka (WMV) |
| **Nama Ilmiah**    | _Watermelon Mosaic Virus_   |
| **Tingkat Risiko** | Tinggi (high)               |
| **Gejala Terkait** | D07, D05, D06, F04          |

**Deskripsi:**
Virus dari keluarga Potyviridae yang ditularkan oleh kutu daun secara non-persisten. Gejala pada melon berupa mosaik hijau pada daun, daun keriting, klorosis menyeluruh, dan deformasi buah. Gejala WMV umumnya lebih ringan dibandingkan ZYMV tetapi tetap menurunkan kualitas dan kuantitas produksi. Virus memiliki kisaran inang luas pada tanaman Cucurbitaceae dan Leguminosae, sehingga gulma dan tanaman liar di sekitar lahan sering menjadi sumber inokulum (reservoir).

**Rekomendasi Penanganan:**

1. Kendalikan gulma di sekitar lahan, terutama dari famili labu-labuan dan kacang-kacangan yang dapat menjadi reservoir virus.
2. Aplikasikan insektisida atau minyak mineral untuk menekan populasi kutu daun penular.
3. Cabut tanaman bergejala dan musnahkan untuk mengurangi sumber penularan di dalam lahan.
4. Tanam varietas melon yang toleran terhadap potyvirus jika tersedia di pasaran.

---

#### 4.C.4. Nematoda — P15

---

#### P15 — Nematoda Puru Akar (Root-Knot Nematode)

| Atribut            | Detail                                  |
| ------------------ | --------------------------------------- |
| **ID**             | P15                                     |
| **Nama Umum**      | Nematoda Puru Akar (Root-Knot Nematode) |
| **Nama Ilmiah**    | _Meloidogyne incognita_ / _M. javanica_ |
| **Tingkat Risiko** | Sedang (medium)                         |
| **Gejala Terkait** | A02, A01, D06, D04, A03                 |

**Deskripsi:**
Nematoda parasit akar berukuran mikroskopis yang menyebabkan pembengkakan atau puru (gall) pada sistem perakaran melon. Nematoda masuk ke jaringan akar dan membentuk sel raksasa (giant cell) yang mengganggu penyerapan air dan unsur hara. Tanaman yang terinfeksi menunjukkan klorosis, layu pada siang hari yang pulih di malam hari (reversible wilt), pertumbuhan kerdil, dan mudah tercabut karena akar rapuh. Populasi nematoda meningkat cepat di tanah berpasir dan bersuhu hangat. Pada pemeriksaan akar, terlihat benjolan/bintil abnormal.

**Rekomendasi Penanganan:**

1. Lakukan rotasi tanaman dengan tanaman non-inang seperti tagetes (_Tagetes erecta_), jagung, atau rumput-rumputan selama 1–2 musim.
2. Aplikasikan nematisida hayati berbahan _Paecilomyces lilacinus_ atau _Purpureocillium lilacinum_ ke lubang tanam sebelum penanaman.
3. Tingkatkan bahan organik tanah (kompos matang atau pupuk kandang) untuk mendukung pertumbuhan mikroorganisme antagonis nematoda.
4. Pada serangan berat, gunakan nematisida berbahan aktif karbofuran atau fostiazat sesuai dosis anjuran label.

---

#### 4.C.5. Hama Serangga — P16 s.d. P19

---

#### P16 — Kutu Daun (Aphid)

| Atribut            | Detail                  |
| ------------------ | ----------------------- |
| **ID**             | P16                     |
| **Nama Umum**      | Kutu Daun (Aphid)       |
| **Nama Ilmiah**    | _Aphis gossypii_        |
| **Tingkat Risiko** | Sedang (medium)         |
| **Gejala Terkait** | S01, S04, S03, D05, D06 |

**Deskripsi:**
Serangga penghisap cairan tanaman berukuran kecil (1–2 mm) yang membentuk koloni padat di bawah permukaan daun muda dan pucuk pertumbuhan. Kutu daun menghisap cairan floem menyebabkan daun keriting, menguning, dan pertumbuhan terhambat. Kutu mengeluarkan embun madu (honeydew) yang menjadi media tumbuh cendawan jelaga hitam (sooty mold). Selain merusak langsung, kutu daun merupakan vektor utama penularan virus CMV, ZYMV, dan WMV pada tanaman melon dan cucurbit lainnya.

**Rekomendasi Penanganan:**

1. Semprot insektisida berbahan aktif imidakloprid atau tiametoksam secara sistemik pada awal ditemukan koloni.
2. Gunakan insektisida nabati (minyak neem 5 mL/L atau ekstrak bawang putih) sebagai alternatif untuk serangan ringan-sedang.
3. Budidayakan musuh alami seperti kumbang koksi (Coccinellidae), lacewing (_Chrysoperla_), atau parasitoid _Aphidius colemani_.
4. Pasang perangkap kuning lengket (yellow sticky trap) untuk monitoring populasi dan deteksi dini serangan.

---

#### P17 — Kutu Kebul (Whitefly)

| Atribut            | Detail                |
| ------------------ | --------------------- |
| **ID**             | P17                   |
| **Nama Umum**      | Kutu Kebul (Whitefly) |
| **Nama Ilmiah**    | _Bemisia tabaci_      |
| **Tingkat Risiko** | Sedang (medium)       |
| **Gejala Terkait** | S02, S04, S03, D06    |

**Deskripsi:**
Serangga kecil berwarna putih (1–1,5 mm) yang hidup di permukaan bawah daun dan berterbangan saat tanaman digoyangkan. Seperti kutu daun, kutu kebul menghisap cairan tanaman dan menghasilkan embun madu yang memicu pertumbuhan cendawan jelaga hitam. Serangan parah menyebabkan klorosis, daun menjadi keriput, dan pertumbuhan terlambat. Kutu kebul juga merupakan vektor penting begomovirus dan crinivirus yang dapat menyerang cucurbit. Populasi meledak pada musim kemarau.

**Rekomendasi Penanganan:**

1. Pasang perangkap kuning lengket (yellow sticky trap) di antara barisan tanaman dengan kepadatan 20–40 per hektar untuk monitoring dan pengendalian langsung.
2. Aplikasikan insektisida berbahan aktif spiromesifen atau siantraniliprol yang efektif terhadap telur dan nimfa kutu kebul.
3. Gunakan mulsa plastik perak untuk mengusir kutu kebul melalui efek refleksi cahaya ultraviolet.
4. Jaga kebersihan lahan dari gulma inang dan sisa tanaman terinfeksi yang menjadi sumber populasi.

---

#### P18 — Lalat Buah (Fruit Fly)

| Atribut            | Detail                  |
| ------------------ | ----------------------- |
| **ID**             | P18                     |
| **Nama Umum**      | Lalat Buah (Fruit Fly)  |
| **Nama Ilmiah**    | _Bactrocera cucurbitae_ |
| **Tingkat Risiko** | Tinggi (high)           |
| **Gejala Terkait** | S06, F07, F02           |

**Deskripsi:**
Lalat buah melon berukuran sedang (6–8 mm) berwarna coklat kekuningan dengan sayap transparan. Lalat betina meletakkan telur di bawah kulit buah yang mulai matang dengan cara menusukkan ovipositor. Larva (belatung) menetas dan memakan daging buah dari dalam, menyebabkan buah membusuk sebelum matang dan akhirnya jatuh. Serangan biasanya tidak terlihat dari luar hingga buah dipotong. Hama ini sangat merusak pada pertanaman melon terbuka di daerah tropis sepanjang tahun.

**Rekomendasi Penanganan:**

1. Pasang perangkap metil eugenol (ME trap) atau cue-lure di sekitar lahan untuk menarik dan membunuh lalat jantan sehingga mengurangi populasi.
2. Bungkus buah dengan kertas koran atau kantong plastik berlubang setelah buah mencapai ukuran segenggaman tangan untuk mencegah peletakan telur.
3. Kumpulkan dan musnahkan (kubur dalam) semua buah yang terserang atau jatuh busuk untuk memutus siklus hidup hama.
4. Aplikasikan protein umpan beracun (protein bait spray) dicampur insektisida spinosad seminggu sekali pada fase pembuahan.

---

#### P19 — Trips (Thrips)

| Atribut            | Detail          |
| ------------------ | --------------- |
| **ID**             | P19             |
| **Nama Umum**      | Trips (Thrips)  |
| **Nama Ilmiah**    | _Thrips palmi_  |
| **Tingkat Risiko** | Sedang (medium) |
| **Gejala Terkait** | S05, S03, D05   |

**Deskripsi:**
Serangga bertubuh sangat kecil (1–1,5 mm) berwarna kuning pucat hingga coklat yang hidup di bunga, pucuk daun, dan permukaan bawah daun muda. Trips menghisap cairan sel epidermis daun menggunakan stilet, menyebabkan bercak perak atau perunggu (silver/bronze speckling) dan jaringan mengering. Pada serangan berat, daun menggulung atau keriting. Pada buah muda, bekas gigitan trips meninggalkan bekas luka (scarring) yang mengurangi kualitas penampilan buah. Trips berpotensi menularkan tospovirus. Populasinya meledak saat musim kering dan panas.

**Rekomendasi Penanganan:**

1. Pasang perangkap biru lengket (blue sticky trap) di antara barisan tanaman — trips lebih tertarik warna biru dibandingkan kuning.
2. Aplikasikan insektisida berbahan aktif spinosad atau abamektin yang efektif terhadap trips dewasa dan larva.
3. Semprotkan insektisida nabati (ekstrak biji mimba/neem oil) sebagai alternatif pengendalian organik yang ramah lingkungan.
4. Bersihkan gulma di sekitar lahan yang menjadi inang alternatif dan tempat berkembang biak trips.

---

### 4.D. Daftar Pertanyaan Pembeda (8 Entri)

Pertanyaan-pertanyaan berikut diajukan secara dinamis oleh engine Forward Chaining pada Langkah 3 untuk membedakan penyakit yang memiliki gejala tumpang tindih. Setiap pertanyaan menyasar kelompok penyakit tertentu (_target diseases_) dan memiliki konfigurasi dukungan jawaban (_yes supports_ dan _no supports_).

| No. |  ID  | Teks Pertanyaan                                                                                                                                                               | Target Penyakit | Ya Mendukung | Tidak Mendukung |
| :-: | :--: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------ | --------------- |
|  1  | DQ01 | Ketika batang yang layu dipotong melintang, apakah terlihat perubahan warna coklat pada jaringan pembuluh (xylem) di dalamnya?                                                | P03, P10, P15   | P03          | P10, P15        |
|  2  | DQ02 | Apakah tanaman layu secara permanen dan tidak pulih kembali meskipun disiram air atau menunggu hingga pagi hari?                                                              | P03, P10, P15   | P03, P10     | P15             |
|  3  | DQ03 | Coba potong batang yang layu, tempelkan kedua ujung potongan, lalu tarik perlahan. Apakah terlihat benang atau lendir putih susu yang ikut tertarik di antara kedua potongan? | P03, P10        | P10          | P03             |
|  4  | DQ04 | Pada saat pagi hari atau udara lembap, apakah terlihat lapisan spora berwarna keunguan atau abu-abu di permukaan bawah daun (tepat di bawah bercak)?                          | P01, P11, P06   | P01          | P11, P06        |
|  5  | DQ05 | Apakah bercak pada daun memiliki pola cincin konsentris yang jelas (lingkaran berlapis di dalam bercak) menyerupai papan target/sasaran?                                      | P05, P07, P06   | P07          | P06             |
|  6  | DQ06 | Apakah daun yang terinfeksi menjadi sangat sempit dan memanjang (bentuknya menyerupai tali sepatu), bukan sekadar menggulung biasa?                                           | P12, P13, P14   | P12          | P13, P14        |
|  7  | DQ07 | Apakah buah yang terbentuk menunjukkan permukaan yang benjol-benjol (knobby) atau jaring kulit (netting) yang sangat tidak rata?                                              | P12, P13, P14   | P13          | P12, P14        |
|  8  | DQ08 | Apakah batang yang sakit mengeluarkan cairan atau getah (eksudat) berwarna coklat kemerahan yang mengental di permukaan batang?                                               | P04, P05        | P04          | P05             |

---

### Lampiran: Matriks Gejala × Penyakit

Matriks berikut menunjukkan relasi antara setiap gejala dan penyakit dalam Knowledge Base. Tanda **X** menandakan bahwa gejala tersebut termasuk dalam daftar gejala penyakit terkait.

| Gejala | P01 | P02 | P03 | P04 | P05 | P06 | P07 | P08 | P09 | P10 | P11 | P12 | P13 | P14 | P15 | P16 | P17 | P18 | P19 |
| :----: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
|  D01   |  X  |     |     |     |     |     |     |     |     |     |     |     |  X  |     |     |     |     |     |     |
|  D02   |     |     |     |  X  |  X  |  X  |  X  |     |     |     |     |     |     |     |     |     |     |     |     |
|  D03   |     |  X  |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |
|  D04   |     |     |  X  |     |     |     |     |     |     |  X  |     |     |     |     |  X  |     |     |     |     |
|  D05   |     |     |     |     |     |     |     |     |     |     |     |  X  |  X  |  X  |     |  X  |     |     |  X  |
|  D06   |     |  X  |  X  |     |     |     |     |     |     |  X  |     |  X  |     |  X  |  X  |  X  |  X  |     |     |
|  D07   |     |     |     |     |     |     |     |     |     |     |     |  X  |  X  |  X  |     |     |     |     |     |
|  D08   |     |     |     |     |     |     |     |     |  X  |     |  X  |     |     |     |     |     |     |     |     |
|  D09   |  X  |  X  |     |     |     |  X  |  X  |     |     |     |  X  |     |     |     |     |     |     |     |     |
|  D10   |  X  |     |     |     |     |     |     |     |     |     |  X  |     |     |     |     |     |     |     |     |
|  D11   |     |     |     |     |     |  X  |     |     |     |     |     |     |     |     |     |     |     |     |     |
|  D12   |  X  |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |
|  D13   |     |     |     |     |     |     |     |     |     |     |     |  X  |     |     |     |     |     |     |     |
|  D14   |     |     |  X  |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |
|  D15   |  X  |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |
|  D16   |     |     |     |     |  X  |     |  X  |     |     |     |     |     |     |     |     |     |     |     |     |
|  B01   |     |     |     |  X  |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |
|  B02   |     |     |     |  X  |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |
|  B03   |     |     |  X  |     |     |     |     |  X  |     |     |     |     |     |     |     |     |     |     |     |
|  B04   |     |     |  X  |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |
|  B05   |     |     |     |  X  |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |
|  B06   |     |     |     |     |     |     |     |  X  |     |     |     |     |     |     |     |     |     |     |     |
|  B07   |     |     |     |  X  |  X  |     |     |     |     |     |     |     |     |     |     |     |     |     |     |
|  F01   |     |     |     |     |  X  |     |     |     |     |     |     |     |     |     |     |     |     |     |     |
|  F02   |     |     |     |     |     |     |     |     |  X  |     |     |     |     |     |     |     |     |  X  |     |
|  F03   |     |     |     |     |     |     |     |     |  X  |     |     |     |     |     |     |     |     |     |     |
|  F04   |     |     |     |     |     |     |     |     |     |     |     |  X  |  X  |  X  |     |     |     |     |     |
|  F05   |     |     |     |     |     |     |     |     |     |     |     |     |  X  |     |     |     |     |     |     |
|  F06   |     |     |     |  X  |     |     |  X  |     |     |     |     |     |     |     |     |     |     |     |     |
|  F07   |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |  X  |     |
|  A01   |     |     |     |     |     |     |     |  X  |     |     |     |     |     |     |  X  |     |     |     |     |
|  A02   |     |     |     |     |     |     |     |     |     |     |     |     |     |     |  X  |     |     |     |     |
|  A03   |     |     |     |     |     |     |     |  X  |     |     |     |     |     |     |  X  |     |     |     |     |
|  A04   |     |     |     |     |     |     |     |  X  |     |     |     |     |     |     |     |     |     |     |     |
|  S01   |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |  X  |     |     |     |
|  S02   |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |  X  |     |     |
|  S03   |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |  X  |  X  |     |  X  |
|  S04   |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |  X  |  X  |     |     |
|  S05   |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |  X  |
|  S06   |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |  X  |     |

---

### Ringkasan Statistik Knowledge Base

| Parameter                             |                        Nilai                        |
| ------------------------------------- | :-------------------------------------------------: |
| Total bagian tanaman                  |                          5                          |
| Total gejala                          |                         39                          |
| Total penyakit/hama                   |                         19                          |
| Penyakit jamur (fungi)                |                          8                          |
| Penyakit bakteri                      |                          3                          |
| Penyakit virus                        |                          3                          |
| Nematoda                              |                          1                          |
| Hama serangga                         |                          4                          |
| Total pertanyaan pembeda              |                          8                          |
| Total rekomendasi penanganan          |             76 (4 per entri × 19 entri)             |
| Rata-rata gejala per penyakit         |                        4,05                         |
| Gejala paling banyak relevansi        | D02, D05, D06 (masing-masing muncul di ≥5 penyakit) |
| Penyakit dengan gejala terbanyak      |         P04 — Busuk Batang Gummy (6 gejala)         |
| Penyakit dengan gejala paling sedikit |            P10 — Layu Bakteri (2 gejala)            |

---

_Dokumen ini disusun sebagai lampiran teknis resmi fitur Diagnosis Penyakit Cerdas pada aplikasi Agri-Smart. Seluruh data Knowledge Base bersumber dari literatur fitopatologi dan entomologi yang telah tervalidasi secara akademik. Dokumen ini dapat direproduksi untuk keperluan akademik dengan menyertakan atribusi yang sesuai._

---

**© 2026 Agri-Smart Development Team — Semua Hak Dilindungi**
