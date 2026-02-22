# LAPORAN AUDIT TEKNIS — Agri-Smart

**Tanggal Audit:** 20 Februari 2026  
**Auditor:** Principal QA Engineer & Lead Software Architect  
**Lingkup:** Full codebase audit — Database, Repository, Sync, Diagnosis Engine, UI/UX  
**Stack:** React Native (Expo SDK 54), TypeScript ~5.9, SQLite (expo-sqlite v16), Firebase Firestore v12.9

---

## 🟢 STATUS KESEHATAN KODE: **52 / 100**

> Skor rendah-menengah karena ditemukan **3 critical blocker** yang menyebabkan error kompilasi dan kerusakan data sinkronisasi, serta **beberapa warning** terkait keamanan data antar-perangkat. Arsitektur dasar (SQLite offline-first, Forward Chaining engine) terancang dengan baik, tetapi implementasi `device_id` ke lapisan Context dan Sync belum selesai secara menyeluruh.

---

## 🔴 CRITICAL ISSUES (Blockers)

### CRITICAL-01: TypeScript Compile Error — `DataContext` Omit Tidak Meng-exclude `device_id`

**File:** `src/contexts/data-context.tsx`  
**Baris:** 44–47 (`addLogEntry`), 55–59 (`addDiagnosisRecord`), 65–69 (`addHarvestRecord`)  
**Dampak:** Aplikasi **gagal compile** di TypeScript strict mode.

**Deskripsi:**  
Interface `DataContextType` mendeklarasikan tipe parameter write-functions sebagai:

```typescript
addLogEntry: (entry: Omit<LogEntry, "id" | "created_at" | "updated_at" | "synced" | "deleted">) => ...
addDiagnosisRecord: (record: Omit<DiagnosisRecord, "id" | "created_at" | "updated_at" | "synced" | "deleted">) => ...
addHarvestRecord: (record: Omit<HarvestRecord, "id" | "created_at" | "updated_at" | "synced" | "deleted">) => ...
```

Tipe ini **tidak meng-exclude `device_id`**, padahal fungsi-fungsi repository yang sesungguhnya (di `logbook-repository.ts`, `diagnosis-repository.ts`, `harvest-repository.ts`) sudah benar meng-exclude `"device_id"`. Akibatnya, semua pemanggil di UI (misalnya `diagnosis.tsx` baris 284, `logbook.tsx` baris handleSubmit) **harus menyertakan `device_id`** menurut tipe Context — padahal tidak seharusnya.

Error yang terkonfirmasi dari compiler:

```
Argument of type '{ date: string; selected_symptoms: string; ... }' is not assignable to parameter of type 'Omit<DiagnosisRecord, "id" | "created_at" | "updated_at" | "synced" | "deleted">'.
  Property 'device_id' is missing...
```

**Perbaikan:**

```typescript
// src/contexts/data-context.tsx — Interface DataContextType

addLogEntry: (
  entry: Omit<
    LogEntry,
    "id" | "device_id" | "created_at" | "updated_at" | "synced" | "deleted"
  >,
) => Promise<LogEntry>;

addDiagnosisRecord: (
  record: Omit<
    DiagnosisRecord,
    "id" | "device_id" | "created_at" | "updated_at" | "synced" | "deleted"
  >,
) => Promise<DiagnosisRecord>;

addHarvestRecord: (
  record: Omit<
    HarvestRecord,
    "id" | "device_id" | "created_at" | "updated_at" | "synced" | "deleted"
  >,
) => Promise<HarvestRecord>;
```

Juga perbaiki tipe yang sama pada callback implementations (baris ~251, ~280, ~297):

```typescript
const addLogEntry = useCallback(
  async (entry: Omit<LogEntry, "id" | "device_id" | "created_at" | "updated_at" | "synced" | "deleted">) => { ... }
);
// dan seterusnya untuk addDiagnosisRecord, addHarvestRecord
```

---

### CRITICAL-02: SyncService Pull — Semua Data dari Cloud Mendapat `device_id = "unknown"`

**File:** `src/services/sync-service.ts`  
**Baris:** ~233 (`pullLogEntries`), ~260 (`pullDiagnosisRecords`), ~286 (`pullHarvestRecords`), ~311 (`pullPlants`), ~338 (`pullAlerts`)  
**Dampak:** **Seluruh data yang di-pull dari Firestore tidak terlihat di "Local View" perangkat manapun.**

**Deskripsi:**  
Semua 5 fungsi `pull*` membangun objek record dari `docSnap.data()` tetapi **tidak menyertakan properti `device_id`** dari data Firestore. Contoh pada `pullLogEntries`:

```typescript
await upsertLogEntryFromCloud({
  id: docSnap.id,
  date: data.date,
  block: data.block,
  // ... field lainnya
  // ❌ device_id TIDAK disertakan!
});
```

Karena fungsi `upsertLogEntryFromCloud` menggunakan `entry.device_id ?? "unknown"` sebagai fallback, **semua record yang di-pull dari cloud akan memiliki `device_id = "unknown"`**. Akibatnya:

- Fungsi "Local View" (e.g. `getAllLogEntries` dengan `WHERE device_id = ?`) **tidak pernah menampilkan data cloud**, karena tidak ada perangkat dengan device_id "unknown".
- Sinkronisasi dua arah menjadi **efektif satu arah** (hanya push, pull tidak terlihat).

**Perbaikan** — Tambahkan `device_id: data.device_id` pada semua 5 fungsi pull:

```typescript
// pullLogEntries
await upsertLogEntryFromCloud({
  id: docSnap.id,
  device_id: data.device_id, // ← TAMBAHKAN
  date: data.date,
  // ...
});

// Ulangi pola yang sama untuk:
// pullDiagnosisRecords, pullHarvestRecords, pullPlants, pullAlerts
```

---

### CRITICAL-03: Filter Aktivitas di Riwayat Logbook Tidak Pernah Cocok (Emoji Mismatch)

**File:** `app/riwayat-logbook.tsx` (baris 42–50) vs `components/ui/logbook.tsx` (baris 175–183)  
**Dampak:** **Filter aktivitas di halaman Riwayat Logbook 100% tidak berfungsi** — tidak ada hasil ditampilkan saat filter aktivitas dipilih.

**Deskripsi:**

- Halaman **Logbook (Form)** menyimpan nama aktivitas **tanpa emoji**: `"Penyiraman"`, `"Pemupukan"`, `"Panen"`, dll.
- Halaman **Riwayat Logbook (Filter)** menggunakan nilai filter **dengan emoji**: `"💧 Penyiraman"`, `"🌱 Pemupukan"`, `"🪴 Panen"`, dll.

Logika filter menggunakan perbandingan ketat `log.activity === selectedActivity` (baris 443), sehingga `"Penyiraman" === "💧 Penyiraman"` selalu `false`.

**Perbaikan** — Hapus emoji dari `value` pada array `ACTIVITIES` di `riwayat-logbook.tsx`:

```typescript
const ACTIVITIES = [
  { label: "Semua Kegiatan", value: "" },
  { label: "Penyiraman", value: "Penyiraman" },
  { label: "Pemupukan", value: "Pemupukan" },
  { label: "Panen", value: "Panen" },
  { label: "Menanam", value: "Menanam" },
  { label: "Pestisida", value: "Pestisida" },
  { label: "Pemangkasan", value: "Pemangkasan" },
  { label: "Inspeksi", value: "Inspeksi" },
];
```

---

## 🟡 WARNINGS & POTENTIAL BUGS

### WARN-01: Kebocoran Data Antar-Perangkat — `update/delete` Harvest & Diagnosis Tanpa Guard `device_id`

**File:**

- `src/database/harvest-repository.ts` — `updateHarvestRecord` (baris ~80), `deleteHarvestRecord` (baris ~107)
- `src/database/diagnosis-repository.ts` — `deleteDiagnosisRecord` (baris ~57)
- `src/database/dashboard-repository.ts` — `updatePlantStatus` (baris ~128), `markAlertRead` (baris ~245)

**Deskripsi:**  
Fungsi `updateLogEntry` dan `deleteLogEntry` di logbook-repository **sudah benar** menggunakan `WHERE id = ? AND device_id = ?`. Namun fungsi-fungsi setara di harvest-repository dan diagnosis-repository hanya menggunakan `WHERE id = ?` tanpa guard `device_id`.

Ini berarti secara teoretis, jika sebuah perangkat mengetahui ID record perangkat lain (misalnya dari data yang di-sync), ia dapat **memodifikasi atau menghapus data milik perangkat lain** — melanggar prinsip "Local View".

**Perbaikan:** Tambahkan `AND device_id = ?` ke semua fungsi update/delete di harvest, diagnosis, dan dashboard repository, persis seperti pola di logbook-repository.

---

### WARN-02: Foto Lokal (`file:///`) Di-sync ke Cloud — Broken Image di Perangkat Lain

**File:** `src/services/sync-service.ts` — `pushLogEntries` (baris ~153)

**Deskripsi:**  
Fungsi push log entries mengirim seluruh objek entry ke Firestore termasuk field `photo`, yang berisi URI lokal seperti `file:///data/user/0/.../photo.jpg`. URI ini **tidak valid di perangkat lain** karena merujuk ke file system lokal.

Ketika perangkat B melakukan pull, data foto akan berisi path perangkat A yang tidak bisa diakses — menghasilkan _broken image_.

**Rekomendasi:**

- **Opsi A (Ideal):** Upload foto ke Firebase Storage / Cloud Storage terlebih dahulu, dapatkan URL publik, kemudian simpan URL tersebut ke field `photo`.
- **Opsi B (Cepat):** Exclude/null-kan field `photo` saat push ke Firestore untuk menghindari path lokal tersebar.

---

### WARN-03: SQL Injection Risk di `updatePlantStatusByBlock` dan `addBulkPlants`

**File:** `src/database/dashboard-repository.ts`

- `updatePlantStatusByBlock` (baris ~177): Menggunakan string interpolation langsung ke SQL.
- `addBulkPlants` (baris ~147): Menggunakan string concatenation untuk VALUES (meski ada sanitasi `replace(/'/g, "''")`).

**Deskripsi:**

```typescript
// updatePlantStatusByBlock — baris ~184
const ids = plants.map((p) => `'${p.id}'`).join(",");
await db.execAsync(
  `UPDATE plants SET status = '${newStatus}', updated_at = '${now}', synced = 0 WHERE id IN (${ids})`,
);
```

Meskipun `ids` berasal dari DB dan `newStatus` berasal dari tipe union TypeScript, pola ini:

1. Tidak menggunakan parameterized queries → rawan SQL injection jika input tidak terkontrol di masa depan.
2. `newStatus` dan `now` di-interpolasi langsung tanpa escaping.

**Perbaikan:** Gunakan parameterized query atau sanitasi lebih ketat. Untuk bulk operations, pertimbangkan loop `runAsync` dengan prepared statement.

---

### WARN-04: Race Condition di `getDatabase()` — Potensi Double Initialization

**File:** `src/database/database.ts` (baris 7–11)

**Deskripsi:**

```typescript
export async function getDatabase() {
  if (db) return db;
  db = await SQLite.openDatabaseAsync("agrismart.db");
  // ...
}
```

Jika dua pemanggil async masuk ke `getDatabase()` secara bersamaan sebelum `db` di-assign, keduanya akan melewati guard `if (db)` dan membuka database dua kali. Ini dapat menyebabkan dua instance database atau migration ganda.

**Perbaikan:**

```typescript
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const database = await SQLite.openDatabaseAsync("agrismart.db");
      await initializeDatabase(database);
      return database;
    })();
  }
  return dbPromise;
}
```

---

### WARN-05: Migrasi Database Destruktif — Semua Data User Hilang Saat Upgrade

**File:** `src/database/database.ts` — `handleMigration` (baris ~121)

**Deskripsi:**  
Migrasi dari versi sebelumnya ke v5 menggunakan `DROP TABLE IF EXISTS` untuk semua tabel operasional. Ini berarti **seluruh data pengguna (logbook, diagnosis, panen, tanaman, alert) akan hilang** saat ada upgrade versi.

Selain itu, migrasi menggunakan satu blok monolitik `if (currentVersion < DB_VERSION)` tanpa step-by-step versioning (v3→v4→v5), sehingga migrasi non-destruktif di masa depan sulit ditambahkan.

**Rekomendasi:**

- Gunakan ALTER TABLE untuk penambahan kolom.
- Buat chain migrasi: `if (currentVersion < 5) { migrateV4toV5(); }`, dst.
- Untuk kolom NOT NULL baru, gunakan `ALTER TABLE ADD COLUMN ... DEFAULT ''` kemudian `UPDATE` dengan nilai sebenarnya.

---

### WARN-06: `getAllPlants()` dan `getAllAlerts()` Tidak Konsisten dengan Pola Local View / Global Aggregation

**File:** `src/database/dashboard-repository.ts` — `getAllPlants` (baris ~98), `getAllAlerts` (baris ~225)

**Deskripsi:**  
Fungsi `getAllPlants` dan `getAllAlerts` mengembalikan data **semua perangkat** tanpa filter `device_id`. Tidak jelas apakah ini merupakan "Global Aggregation" yang disengaja atau kelalaian. Jika digunakan di UI yang menampilkan data personal, ini merupakan kebocoran data.

**Rekomendasi:** Tentukan secara eksplisit:

- Jika untuk dashboard stats → biarkan tanpa filter (Global Aggregation), beri komentar.
- Jika untuk personal view → tambahkan filter `WHERE device_id = ?`.

---

### WARN-07: Tabel `chat_messages` Tidak Memiliki Kolom `device_id`

**File:** `src/database/database.ts` — skema `chat_messages` (baris ~102)

**Deskripsi:**  
Tabel `chat_messages` tidak memiliki kolom `device_id` — tidak konsisten dengan 5 tabel lainnya. Jika di masa depan chatbot diintegrasikan dengan sync, akan membutuhkan migrasi skema tambahan.

---

### WARN-08: Firebase API Key Hardcoded di Source Code

**File:** `src/firebase/config.js` (baris 12–18)

**Deskripsi:**  
Firebase configuration termasuk `apiKey` di-hardcode di source code dan akan terekspos jika repositori bersifat publik. Meskipun Firebase web API key memang dimaksudkan untuk sisi klien, tidak ada Firestore Security Rules yang terlihat di project — artinya data berpotensi diakses tanpa autentikasi.

**Rekomendasi:**

- Gunakan environment variables via `.env` dan `expo-constants`.
- Pastikan Firestore Security Rules minimal memiliki rule authenticated-only.

---

## 🔵 REKOMENDASI OPTIMASI

### OPT-01: N+1 Query Pattern di `getHarvestSummary()`

**File:** `src/database/harvest-repository.ts` (baris ~117–165)

**Deskripsi:**  
Fungsi ini melakukan **10 query terpisah** ke database (1 total bulan + 4 mingguan + 5 bulanan). Ini bisa dioptimasi menjadi 2–3 query menggunakan `GROUP BY`.

```sql
-- Contoh penggabungan volume bulanan dalam 1 query:
SELECT strftime('%Y-%m', date) as month, COALESCE(SUM(quantity), 0) as total
FROM harvest_records WHERE deleted = 0
GROUP BY month ORDER BY month DESC LIMIT 5;
```

---

### OPT-02: Duplikasi Query `getDashboardStats` dan `getHealthDistribution`

**File:** `src/database/dashboard-repository.ts`

**Deskripsi:**

- `getDashboardStats()` melakukan 4 query (`COUNT` per status) + 1 query harvest.
- `getHealthDistribution()` melakukan 3 query **yang identik** (COUNT per status).

Kedua fungsi dipanggil bersamaan di `refreshDashboard()`, menghasilkan **7 query duplikat** yang bisa dijadikan 1:

```sql
SELECT status, COUNT(*) as count FROM plants WHERE deleted = 0 GROUP BY status;
```

---

### OPT-03: Fungsi `generateId()` Terduplikasi di 4 File Repository

**File:** `logbook-repository.ts`, `harvest-repository.ts`, `dashboard-repository.ts`, `diagnosis-repository.ts`

**Perbaikan:** Ekstrak ke utility bersama:

```typescript
// src/database/utils.ts
export function generateId(): string {
  return (
    Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 9)
  );
}
```

---

### OPT-04: Tidak Ada Index Database pada Kolom yang Sering Di-query

**File:** `src/database/database.ts`

**Deskripsi:**  
Query paling umum menggunakan `WHERE deleted = 0 AND device_id = ?` serta `ORDER BY date DESC`. Tanpa index, ini melakukan full table scan pada setiap query.

**Perbaikan — Tambahkan di `initializeDatabase()`:**

```sql
CREATE INDEX IF NOT EXISTS idx_log_entries_device_date ON log_entries(device_id, date);
CREATE INDEX IF NOT EXISTS idx_harvest_records_device_date ON harvest_records(device_id, date);
CREATE INDEX IF NOT EXISTS idx_diagnosis_records_device_date ON diagnosis_records(device_id, date);
CREATE INDEX IF NOT EXISTS idx_plants_block_status ON plants(block, status);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at);
```

---

### OPT-05: `refreshAllData` useCallback Closure Stale

**File:** `src/contexts/data-context.tsx` (baris ~162)

**Deskripsi:**

```typescript
const refreshAllData = useCallback(async () => {
  await Promise.all([
    refreshLogEntries(),
    refreshDiagnosisRecords(),
    refreshHarvestRecords(),
    refreshDashboard(),
  ]);
}, []); // ← Empty deps: fungsi yang dipanggil di-capture saat mount
```

Dependency array kosong `[]` berarti `refreshAllData` mengcapture versi pertama dari `refreshLogEntries`, dll. — yang juga merupakan `useCallback` dengan `[]`. Karena semua callback deps-nya kosong dan menggunakan repository langsung, ini tidak menyebabkan bug saat ini, tetapi rentan jika salah satu callback nantinya bergantung pada state.

**Rekomendasi:** Masukkan referensi fungsi ke dependency array, atau gunakan `useRef` untuk stabilitas referensi.

---

### OPT-06: Scanner & Chatbot — Fitur Stub yang Sepenuhnya Simulasi

**File:**

- `components/ui/scanner.tsx` — QR scan menggunakan `setTimeout` simulasi, data tidak disimpan ke DB.
- `components/ui/chatbot.tsx` — Chatbot menggunakan string matching lokal hardcode, tanpa integrasi AI/API.

**Deskripsi:**  
Kedua fitur ini menampilkan "Coming Soon" modal, tetapi kode implementasi simulasi di belakangnya masih ada. Khusus untuk scanner, kode simulasi menggunakan emoji di nama aktivitas (`"💧 Penyiraman"`) yang tidak konsisten dengan format logbook form (lihat CRITICAL-03).

**Rekomendasi:** Jika fitur belum siap, pertimbangkan untuk menghapus implementasi simulasi agar tidak membingungkan dan mengurangi ukuran bundle. Cukup pertahankan modal "Coming Soon".

---

## 📊 RINGKASAN TEMUAN

| Kategori              | Jumlah | Severity                                 |
| --------------------- | ------ | ---------------------------------------- |
| 🔴 Critical (Blocker) | 3      | Compile error, data loss, broken filter  |
| 🟡 Warning            | 8      | Data integrity, security, migration risk |
| 🔵 Optimasi           | 6      | Performance, code quality                |
| **Total**             | **17** | —                                        |

---

## 🧭 PRIORITAS PERBAIKAN (Action Plan)

### Sprint 1 — Immediate Fix (Hari 1)

1. ✅ **CRITICAL-01:** Tambah `"device_id"` ke Omit di `data-context.tsx` (3 lokasi interface + 3 lokasi callback).
2. ✅ **CRITICAL-02:** Tambah `device_id: data.device_id` ke semua 5 fungsi `pull*` di `sync-service.ts`.
3. ✅ **CRITICAL-03:** Hapus emoji dari `value` di array `ACTIVITIES` di `riwayat-logbook.tsx`.

### Sprint 2 — Data Integrity (Hari 2–3)

4. **WARN-01:** Tambah guard `device_id` ke semua `update/delete` di harvest, diagnosis, dan dashboard repository.
5. **WARN-04:** Fix race condition di `getDatabase()` dengan promise caching.
6. **OPT-04:** Tambah index database.

### Sprint 3 — Architecture (Minggu 2)

7. **WARN-02:** Implementasi upload foto ke Cloud Storage sebelum sync.
8. **WARN-05:** Refactor migrasi ke chain versi.
9. **WARN-08:** Pindahkan Firebase config ke environment variables.
10. **OPT-01, OPT-02:** Optimasi query DB (N+1 fix, deduplicate counts).

---

_Laporan ini dihasilkan dari analisis statis seluruh source code dalam workspace Agri-Smart. Tidak ada runtime testing atau penetration testing yang dilakukan._
