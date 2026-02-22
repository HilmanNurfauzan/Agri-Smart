# Rekapitulasi Teknis — Agri-Smart Offline-First Architecture

> **Auditor:** Senior Mobile App Architect  
> **Tanggal Audit:** 2025  
> **Scope:** Konversi dari data statis ke arsitektur offline-first dengan SQLite + Firebase Firestore  
> **Versi Aplikasi:** 1.0.0  
> **Platform Target:** iOS, Android, Web

---

## Daftar Isi

1. [Keputusan Arsitektur](#1-keputusan-arsitektur)
2. [Model Data & Interface TypeScript](#2-model-data--interface-typescript)
3. [File Yang Diubah / Ditambahkan](#3-file-yang-diubah--ditambahkan)
4. [Titik Konflik & Error Yang Ditemukan](#4-titik-konflik--error-yang-ditemukan)
5. [Source Code Kritis](#5-source-code-kritis)
6. [Stack Teknologi](#6-stack-teknologi)
7. [ERD (Entity Relationship Diagram)](#7-erd-entity-relationship-diagram)

---

## 1. Keputusan Arsitektur

### 1.1 Pola Arsitektur: Offline-First

```
┌─────────────────────────────────────────────────────────┐
│                    React Native UI                       │
│   (Dashboard, Logbook, Diagnosis, Evaluation, Chatbot)   │
└──────────────────────┬──────────────────────────────────┘
                       │ useData() Hook
                       ▼
┌─────────────────────────────────────────────────────────┐
│              DataProvider (React Context)                 │
│      State management + CRUD operations wrapper          │
└──────────┬─────────────────────────────┬────────────────┘
           │                             │
           ▼                             ▼
┌────────────────────┐       ┌─────────────────────────┐
│   SQLite (Local)   │◄─────►│   SyncService           │
│   expo-sqlite      │       │   (Bidirectional Sync)   │
│   7 + 1 tables     │       └──────────┬──────────────┘
└────────────────────┘                  │
                                        │ writeBatch()
                                        ▼
                              ┌─────────────────────┐
                              │  Firebase Firestore  │
                              │  (Cloud Database)    │
                              │  agri-smart-27f82    │
                              └─────────────────────┘
```

**Alasan pemilihan:**

| Keputusan                                                  | Alasan                                                                                                                                              |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| SQLite sebagai primary storage                             | Aplikasi pertanian sering digunakan di area dengan koneksi internet buruk. SQLite memastikan data selalu tersedia tanpa koneksi.                    |
| Firebase Firestore sebagai cloud sync                      | Tidak memerlukan backend server sendiri, real-time capable, pricing model cocok untuk skala kecil-menengah.                                         |
| `expo-sqlite` v16 (bukan `@react-native-community/sqlite`) | Kompatibel native dengan Expo SDK 54, mendukung WASM untuk platform Web, tidak perlu eject.                                                         |
| Soft delete (`deleted=0/1`)                                | Data yang dihapus tidak benar-benar hilang dari database, sehingga sync bisa mengirim informasi penghapusan ke Firestore dan perangkat lain.        |
| `synced` flag per-row                                      | Menandai record mana yang sudah disinkronkan. Saat user menulis data baru, `synced=0`. Setelah berhasil di-push ke Firestore, `synced=1`.           |
| `writeBatch()` untuk batch write                           | Firestore mendukung hingga 500 operasi per batch. Mengurangi round-trip API dari N request menjadi ceil(N/499) request.                             |
| `Promise.all()` untuk parallel sync                        | Push 5 tabel dan pull 5 tabel dilakukan secara paralel, bukan sequential. Mempercepat total waktu sync secara signifikan.                           |
| Seed data dengan `synced=1`                                | Data awal (seed) tidak perlu di-push ke Firestore. Menandainya sebagai `synced=1` mencegah 571 item seed membanjiri Firestore saat koneksi pertama. |
| DB Versioning (`db_version` table)                         | Memungkinkan migrasi schema dan re-seed data saat versi database berubah. Increment `DB_VERSION` untuk memicu migrasi.                              |
| React Context (bukan Redux/Zustand)                        | Cukup untuk skala state management saat ini. Mengurangi dependency tambahan.                                                                        |
| NetworkMonitor sebagai singleton                           | Satu instance global yang melacak status jaringan, digunakan oleh SyncService dan DataProvider.                                                     |

### 1.2 Alur Write (Simpan Data)

```
User Input → addLogEntry() di DataProvider
  → LogbookRepo.addLogEntry() → INSERT INTO SQLite (synced=0)
  → refreshLogEntries() → Re-render UI
  → if (networkMonitor.isConnected) → syncService.syncAll()
    → pushLogEntries() → batchWrite("log_entries", items)
      → writeBatch().commit() → markLogEntrySynced(id)
```

### 1.3 Alur Sync (Auto-Sync)

```
NetworkMonitor detects connection
  → SyncService.syncAll()
    → Phase 1 (Push - Parallel):
      ├── pushLogEntries()
      ├── pushDiagnosisRecords()
      ├── pushHarvestRecords()
      ├── pushPlants()
      └── pushAlerts()
    → Phase 2 (Pull - Parallel):
      ├── pullLogEntries()     (filtered by lastSync)
      ├── pullDiagnosisRecords()
      ├── pullHarvestRecords()
      ├── pullPlants()
      └── pullAlerts()
    → Update sync_meta timestamps
    → notifyStatus("success")
    → DataProvider.refreshAllData()
```

### 1.4 Resolusi Konflik

**Strategi: Last-Write-Wins (LWW) berdasarkan `updated_at`.**

- Push: Seluruh object di-overwrite ke Firestore via `batch.set(ref, data)`.
- Pull: `INSERT OR REPLACE` di SQLite — jika `id` sudah ada, record di-replace.
- Filter pull: Hanya pull record dengan `updated_at > lastSync` untuk mengurangi data transfer.

> **Catatan:** Strategi ini cocok untuk single-user. Untuk multi-user collaboration, diperlukan mekanisme conflict detection yang lebih canggih (misalnya vector clocks atau CRDT).

---

## 2. Model Data & Interface TypeScript

### 2.1 Entity Relationship

| Tabel               | Jumlah Kolom | Primary Key       | Relasi                 |
| ------------------- | ------------ | ----------------- | ---------------------- |
| `log_entries`       | 10           | `id TEXT`         | Standalone             |
| `diagnosis_records` | 11           | `id TEXT`         | Standalone             |
| `harvest_records`   | 10           | `id TEXT`         | Standalone             |
| `plants`            | 10           | `id TEXT`         | Standalone             |
| `alerts`            | 9            | `id TEXT`         | Standalone             |
| `chat_messages`     | 5            | `id TEXT`         | Standalone             |
| `sync_meta`         | 2            | `table_name TEXT` | Meta-tabel             |
| `db_version`        | 2            | `id INTEGER`      | Meta-tabel (singleton) |

### 2.2 TypeScript Interfaces

File: `src/database/types.ts`

```typescript
export interface LogEntry {
  id: string;
  date: string;
  block: string;
  activity: string;
  notes: string;
  photo: string | null;
  created_at?: string;
  updated_at?: string;
  synced?: number;
  deleted?: number;
}

export interface DiagnosisRecord {
  id: string;
  date: string;
  selected_symptoms: string; // JSON array of symptom IDs
  risk_level: "high" | "medium" | "low" | "none";
  result_title: string;
  result_description: string;
  recommendations: string; // JSON array of strings
  created_at?: string;
  updated_at?: string;
  synced?: number;
  deleted?: number;
}

export interface HarvestRecord {
  id: string;
  date: string;
  block: string;
  quantity: number;
  quality: string;
  notes: string;
  created_at?: string;
  updated_at?: string;
  synced?: number;
  deleted?: number;
}

export interface Plant {
  id: string;
  block: string;
  name: string;
  status: "sehat" | "perhatian" | "sakit";
  planted_date: string | null;
  notes: string;
  created_at?: string;
  updated_at?: string;
  synced?: number;
  deleted?: number;
}

export interface AlertRecord {
  id: string;
  message: string;
  severity: "danger" | "warning" | "success" | "info";
  block: string | null;
  is_read: number;
  created_at?: string;
  updated_at?: string;
  synced?: number;
  deleted?: number;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: "user" | "bot";
  created_at?: string;
  synced?: number;
}

export interface DashboardStats {
  totalPlants: number;
  healthyPlants: number;
  attentionPlants: number;
  sickPlants: number;
  harvestThisMonth: number;
}

export interface SyncMeta {
  table_name: string;
  last_synced_at: string | null;
}
```

### 2.3 Kolom Sinkronisasi (Pola Berulang)

Setiap tabel utama (`log_entries`, `diagnosis_records`, `harvest_records`, `plants`, `alerts`) memiliki 4 kolom sistem:

| Kolom        | Tipe    | Default           | Fungsi                                                        |
| ------------ | ------- | ----------------- | ------------------------------------------------------------- |
| `created_at` | TEXT    | `datetime('now')` | Timestamp pembuatan record                                    |
| `updated_at` | TEXT    | `datetime('now')` | Timestamp update terakhir. Digunakan sebagai cursor saat pull |
| `synced`     | INTEGER | 0                 | `0` = belum disinkronkan, `1` = sudah disinkronkan            |
| `deleted`    | INTEGER | 0                 | `0` = aktif, `1` = soft-deleted                               |

### 2.4 Schema SQL

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS log_entries (
  id TEXT PRIMARY KEY NOT NULL,
  date TEXT NOT NULL,
  block TEXT NOT NULL,
  activity TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  photo TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  synced INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS diagnosis_records (
  id TEXT PRIMARY KEY NOT NULL,
  date TEXT NOT NULL,
  selected_symptoms TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  result_title TEXT NOT NULL,
  result_description TEXT NOT NULL,
  recommendations TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  synced INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS harvest_records (
  id TEXT PRIMARY KEY NOT NULL,
  date TEXT NOT NULL,
  block TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0,
  quality TEXT NOT NULL DEFAULT 'Grade B',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  synced INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS plants (
  id TEXT PRIMARY KEY NOT NULL,
  block TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'sehat',
  planted_date TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  synced INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  block TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  synced INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY NOT NULL,
  text TEXT NOT NULL,
  sender TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  synced INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sync_meta (
  table_name TEXT PRIMARY KEY NOT NULL,
  last_synced_at TEXT
);

CREATE TABLE IF NOT EXISTS db_version (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL DEFAULT 1
);
```

---

## 3. File Yang Diubah / Ditambahkan

### 3.1 File Baru (11 file)

| No  | File                                   | Baris | Fungsi                                                                                                                                                                                                                                                       |
| --- | -------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `src/database/database.ts`             | 261   | Inisialisasi SQLite, schema creation (8 tabel), seed data (550 plants + 6 logs + 12 harvests + 3 alerts), DB migration handler                                                                                                                               |
| 2   | `src/database/types.ts`                | 93    | TypeScript interfaces untuk seluruh entitas database                                                                                                                                                                                                         |
| 3   | `src/database/logbook-repository.ts`   | 137   | CRUD operations untuk `log_entries`: getAll, getByDate, add, update, delete (soft), getUnsynced, markSynced, upsertFromCloud                                                                                                                                 |
| 4   | `src/database/diagnosis-repository.ts` | 99    | CRUD operations untuk `diagnosis_records`: getAll, add, delete (soft), getUnsynced, markSynced, upsertFromCloud                                                                                                                                              |
| 5   | `src/database/harvest-repository.ts`   | 216   | CRUD + agregasi untuk `harvest_records`: getAll, getByPeriod, add, update, delete (soft), getHarvestSummary (totalThisMonth, gradeA/week, monthlyVolumes)                                                                                                    |
| 6   | `src/database/dashboard-repository.ts` | 265   | Computed statistics dari `plants` + `harvest_records` + `log_entries` + `alerts`: getDashboardStats, getHealthDistribution, getBlockActivityData, Plants CRUD, Alerts CRUD                                                                                   |
| 7   | `src/services/network-monitor.ts`      | 55    | Singleton class `NetworkMonitor` menggunakan `@react-native-community/netinfo`. Methods: start(), stop(), addListener(), checkConnection()                                                                                                                   |
| 8   | `src/services/sync-service.ts`         | 466   | Bidirectional sync engine. `batchWrite()` helper (max 499/batch). 5 push methods + 5 pull methods. Auto-sync on network connect. Status listener.                                                                                                            |
| 9   | `src/contexts/data-context.tsx`        | 340   | React Context `DataProvider` + `useData()` hook. Seluruh state management: isReady, isOnline, syncStatus, logEntries, diagnosisRecords, harvestRecords, dashboardStats, healthDistribution, blockActivityData, alerts. CRUD wrappers yang auto-trigger sync. |
| 10  | `components/ui/sync-status-bar.tsx`    | 109   | Komponen status bar visual. Menampilkan status: Online, Offline, Syncing, Error. Tombol manual sync.                                                                                                                                                         |
| 11  | `metro.config.js`                      | 14    | Konfigurasi Metro bundler untuk menambahkan `.wasm` ke `assetExts` agar `expo-sqlite` berfungsi di Web (WASM).                                                                                                                                               |

### 3.2 File Dimodifikasi (6 file)

| No  | File                             | Jenis Perubahan            | Detail                                                                                                                                                                                                  |
| --- | -------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `src/firebase/config.js` → `.ts` | Rename + Refactor          | Ditambahkan import `Firestore`, `getFirestore`, `initializeFirestore`. Export `firestore` instance. Dibungkus dalam `getFirestoreInstance()` helper dengan try-catch.                                   |
| 2   | `app/_layout.tsx`                | Tambah Provider            | Dibungkus `<DataProvider>` di dalam `<ThemeProvider>`, membungkus seluruh `<Stack>`. Import `DataProvider` dari `@/src/contexts/data-context`.                                                          |
| 3   | `components/ui/logbook.tsx`      | Major Refactor (921 baris) | Dari data statis → `useData()` hook. `handleSubmit()` async dengan `addLogEntryToDb()`. Filter menggunakan `logEntries` dari context. Ditambahkan `SyncStatusBar`. Perbaikan bug `logs` → `logEntries`. |
| 4   | `components/ui/dashboard.tsx`    | Major Refactor             | Dari hardcoded stats → `useData()` hook. Dashboard stats, health distribution, block activity, alerts semua dari context.                                                                               |
| 5   | `components/ui/diagnosis.tsx`    | Tambah Persistence         | Hasil diagnosis sekarang disimpan ke database via `addDiagnosisRecord()`.                                                                                                                               |
| 6   | `components/ui/evaluation.tsx`   | Major Refactor             | Dari hardcoded harvest data → `useData()` hook. `getHarvestSummary()` untuk chart data.                                                                                                                 |

### 3.3 File Konfigurasi Dimodifikasi (2 file)

| No  | File              | Perubahan                                                                                                        |
| --- | ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | `app.json`        | Dihapus `"newArchEnabled": false` dari `android` (deprecated di SDK 54). Ditambahkan `"expo-sqlite"` ke plugins. |
| 2   | `babel.config.js` | Dihapus `"expo-router/babel"` dari plugins (deprecated, sudah built-in di `babel-preset-expo`).                  |

### 3.4 Dependencies Ditambahkan

| Package                           | Versi    | Fungsi                                                                              |
| --------------------------------- | -------- | ----------------------------------------------------------------------------------- |
| `expo-sqlite`                     | ~16.0.10 | SQLite database engine (native + WASM web)                                          |
| `firebase`                        | ^12.9.0  | Firebase SDK termasuk Firestore                                                     |
| `@react-native-community/netinfo` | 11.4.1   | Deteksi status jaringan (connected/disconnected)                                    |
| `@expo/ngrok`                     | ^4.1.3   | Tunnel mode untuk akses dari perangkat Android via `--tunnel`                       |
| `uuid`                            | ^13.0.0  | Generate unique ID (tersedia tapi sebenarnya menggunakan `Date.now().toString(36)`) |

---

## 4. Titik Konflik & Error Yang Ditemukan

### 4.1 Web WASM Error

**Error:**

```
Unable to resolve module ./wa-sqlite/wa-sqlite.wasm
```

**Penyebab:** Metro bundler tidak mengenali file `.wasm` sebagai asset. `expo-sqlite` v16 menggunakan `wa-sqlite` WASM build untuk platform Web.

**Solusi:** Membuat `metro.config.js` yang menambahkan `.wasm` ke `assetExts`:

```javascript
const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push("wasm");
config.resolver.sourceExts = config.resolver.sourceExts.filter(
  (ext) => ext !== "wasm",
);
module.exports = config;
```

**Status:** ✅ Resolved

---

### 4.2 "logs is not defined" Runtime Error

**Error:**

```
ReferenceError: logs is not defined (logbook.tsx:360)
```

**Penyebab:** Saat migrasi dari data statis ke context, variabel `logs` (nama lama dari array static) tidak seluruhnya diganti ke `logEntries` (nama baru dari context). Terdapat sisa referensi `logs` yang terlewat.

**Lokasi:** `components/ui/logbook.tsx` — di area rendering `filteredLogs`

**Solusi:** Mengganti seluruh referensi `logs` ke `logEntries` pada komponen.

**Status:** ✅ Resolved

---

### 4.3 Firebase Permissions Error

**Error:**

```
FirebaseError: Missing or insufficient permissions
[Sync] Batch write failed for log_entries (chunk 0)
```

**Penyebab:** Firestore Security Rules default-nya memerlukan `request.auth != null`. Proyek ini tidak mengimplementasikan Firebase Authentication, sehingga semua request ditolak.

**Solusi:** Update Firestore Security Rules di Firebase Console:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

> ⚠️ **Peringatan Keamanan:** Rules ini membuka akses penuh. Untuk produksi, diperlukan autentikasi dan rules yang lebih ketat.

**Status:** ✅ Resolved

---

### 4.4 Sync Performance Bottleneck

**Gejala:** Sync sangat lambat saat koneksi pertama kali (~30+ detik). Log menunjukkan 571 item di-push satu per satu.

**Penyebab (Root Cause):**

1. Seed data (550 plants + 6 logs + 12 harvests + 3 alerts = 571 items) dibuat dengan `synced=0`
2. Setiap item di-push individual ke Firestore (571 API calls sequential)
3. Push dan pull dilakukan sequential, bukan parallel

**Solusi (3 perbaikan):**

1. **Seed data `synced=1`:** Data awal tidak perlu di-sync karena setiap perangkat sudah memiliki data yang sama. Ditambahkan migration handler untuk membersihkan seed lama.

2. **Batch writes:** Implementasi `batchWrite()` helper yang mengelompokkan operasi ke dalam Firestore `WriteBatch` (max 499 per batch):

```typescript
private async batchWrite(
  collectionName: string,
  items: { id: string; data: Record<string, any> }[],
): Promise<string[]> {
  const BATCH_LIMIT = 499;
  for (let i = 0; i < items.length; i += BATCH_LIMIT) {
    const chunk = items.slice(i, i + BATCH_LIMIT);
    const batch = writeBatch(firestore);
    for (const item of chunk) {
      batch.set(doc(firestore, collectionName, item.id), item.data);
    }
    await batch.commit();
  }
}
```

3. **Parallel execution:** Push 5 tabel + Pull 5 tabel menggunakan `Promise.all()`.

**Status:** ✅ Resolved — Log konfirmasi: `[Sync] All data synced successfully`

---

### 4.5 Android Expo Go Compatibility

**Gejala:** Android Expo Go tidak bisa mengakses development server.

**Penyebab:**

1. `"newArchEnabled": false` di `app.json` — deprecated dan menyebabkan warning di SDK 54
2. `"expo-router/babel"` di `babel.config.js` — deprecated plugin yang sudah built-in di `babel-preset-expo`
3. Koneksi jaringan — perangkat Android di network berbeda tidak bisa resolve `localhost`

**Solusi:**

1. Hapus `"newArchEnabled": false` dari `app.json`
2. Hapus `"expo-router/babel"` dari plugins di `babel.config.js`
3. Install `@expo/ngrok` dan jalankan dengan `npx expo start --tunnel`

**Status:** ✅ Fixed (menunggu konfirmasi pengguna)

---

### 4.6 Potensi Konflik di Masa Depan

| Area                                    | Risiko                                                                         | Mitigasi                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Multi-device conflict                   | Dua perangkat edit record yang sama saat offline → data di-overwrite saat sync | Implementasi `updated_at` comparison sebelum overwrite, atau gunakan CRDT |
| Photo sync                              | `photo` berisi URI lokal — tidak bisa diakses dari perangkat lain              | Upload foto ke Firebase Storage, simpan URL di database                   |
| Large datasets                          | Pull tanpa filter pada sync pertama bisa lambat jika data Firestore banyak     | Implement pagination atau limit pada pull query                           |
| Firestore Security                      | Rules saat ini `allow read, write: if true` — tidak aman untuk produksi        | Implement Firebase Authentication + role-based rules                      |
| `selected_symptoms` & `recommendations` | Disimpan sebagai JSON string, bukan relational                                 | Untuk query/filter yang kompleks, pertimbangkan normalisasi               |

---

## 5. Source Code Kritis

### 5.1 Database Initialization (`src/database/database.ts`)

```typescript
import * as SQLite from "expo-sqlite";

const DB_VERSION = 2;
let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync("agrismart.db");
  await initializeDatabase(db);
  return db;
}

async function initializeDatabase(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS log_entries (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      block TEXT NOT NULL,
      activity TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      photo TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced INTEGER NOT NULL DEFAULT 0,
      deleted INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS diagnosis_records (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      selected_symptoms TEXT NOT NULL,
      risk_level TEXT NOT NULL,
      result_title TEXT NOT NULL,
      result_description TEXT NOT NULL,
      recommendations TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced INTEGER NOT NULL DEFAULT 0,
      deleted INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS harvest_records (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      block TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      quality TEXT NOT NULL DEFAULT 'Grade B',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced INTEGER NOT NULL DEFAULT 0,
      deleted INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS plants (
      id TEXT PRIMARY KEY NOT NULL,
      block TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'sehat',
      planted_date TEXT,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced INTEGER NOT NULL DEFAULT 0,
      deleted INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY NOT NULL,
      message TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'info',
      block TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced INTEGER NOT NULL DEFAULT 0,
      deleted INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY NOT NULL,
      text TEXT NOT NULL,
      sender TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sync_meta (
      table_name TEXT PRIMARY KEY NOT NULL,
      last_synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS db_version (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      version INTEGER NOT NULL DEFAULT 1
    );
  `);

  await handleMigration(database);
  await seedInitialData(database);
}

async function handleMigration(database: SQLite.SQLiteDatabase) {
  const row = await database.getFirstAsync<{ version: number }>(
    "SELECT version FROM db_version WHERE id = 1",
  );
  const currentVersion = row?.version ?? 0;

  if (currentVersion < DB_VERSION) {
    await database.execAsync(`
      DELETE FROM log_entries WHERE id LIKE 'seed-%';
      DELETE FROM plants WHERE id LIKE 'plant-%';
      DELETE FROM harvest_records WHERE id LIKE 'harvest-%';
      DELETE FROM alerts WHERE id LIKE 'alert-%';
      DELETE FROM sync_meta;
      INSERT OR REPLACE INTO db_version (id, version) VALUES (1, ${DB_VERSION});
    `);
    console.log(`[DB] Migrated from v${currentVersion} to v${DB_VERSION}`);
  }
}

async function seedInitialData(database: SQLite.SQLiteDatabase) {
  const logCount = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM log_entries",
  );

  if (logCount && logCount.count === 0) {
    await database.execAsync(`
      INSERT INTO log_entries (id, date, block, activity, notes, photo, synced) VALUES
        ('seed-1', '2026-02-17', 'Blok A1', '💧 Penyiraman', 'Penyiraman rutin pagi', NULL, 1),
        ('seed-2', '2026-02-16', 'Blok B2', '🌱 Pemupukan', 'NPK 300g per polybag', NULL, 1),
        ('seed-3', '2026-02-15', 'Blok A2', '🪴 Panen', 'Panen tomat 15kg', NULL, 1),
        ('seed-4', '2026-02-14', 'Blok C1', '🧪 Pestisida', 'Aplikasi pestisida organik', NULL, 1),
        ('seed-5', '2026-02-13', 'Blok B1', '✂️ Pemangkasan', 'Pemangkasan tunas air', NULL, 1),
        ('seed-6', '2026-01-28', 'Blok C2', '🔍 Inspeksi', 'Pengecekan hama berkala', NULL, 1);
    `);
  }

  const plantCount = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM plants",
  );

  if (plantCount && plantCount.count === 0) {
    const plantInserts: string[] = [];
    for (let i = 1; i <= 450; i++) {
      const block = [
        "Blok A1",
        "Blok A2",
        "Blok B1",
        "Blok B2",
        "Blok C1",
        "Blok C2",
      ][i % 6];
      plantInserts.push(
        `('plant-sehat-${i}', '${block}', 'Tanaman ${i}', 'sehat', '2025-10-01', '', 1)`,
      );
    }
    for (let i = 1; i <= 80; i++) {
      const block = [
        "Blok A1",
        "Blok A2",
        "Blok B1",
        "Blok B2",
        "Blok C1",
        "Blok C2",
      ][i % 6];
      plantInserts.push(
        `('plant-perhatian-${i}', '${block}', 'Tanaman P${i}', 'perhatian', '2025-10-01', '', 1)`,
      );
    }
    for (let i = 1; i <= 20; i++) {
      const block = [
        "Blok A1",
        "Blok A2",
        "Blok B1",
        "Blok B2",
        "Blok C1",
        "Blok C2",
      ][i % 6];
      plantInserts.push(
        `('plant-sakit-${i}', '${block}', 'Tanaman S${i}', 'sakit', '2025-10-01', '', 1)`,
      );
    }

    const batchSize = 50;
    for (let i = 0; i < plantInserts.length; i += batchSize) {
      const batch = plantInserts.slice(i, i + batchSize);
      await database.execAsync(
        `INSERT INTO plants (id, block, name, status, planted_date, notes, synced) VALUES ${batch.join(",")};`,
      );
    }
  }

  const harvestCount = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM harvest_records",
  );

  if (harvestCount && harvestCount.count === 0) {
    await database.execAsync(`
      INSERT INTO harvest_records (id, date, block, quantity, quality, notes, synced) VALUES
        ('harvest-1', '2026-02-17', 'Blok A1', 25, 'Grade A', 'Panen pagi', 1),
        ('harvest-2', '2026-02-16', 'Blok B2', 18, 'Grade A', 'Panen sore', 1),
        ('harvest-3', '2026-02-15', 'Blok C1', 22, 'Grade B', 'Panen pagi', 1),
        ('harvest-4', '2026-02-14', 'Blok A2', 20, 'Grade A', 'Panen pagi', 1),
        ('harvest-5', '2026-01-15', 'Blok B1', 30, 'Grade A', 'Panen besar', 1),
        ('harvest-6', '2026-01-10', 'Blok C2', 15, 'Grade B', 'Panen reguler', 1),
        ('harvest-7', '2025-12-20', 'Blok A1', 28, 'Grade A', '', 1),
        ('harvest-8', '2025-12-15', 'Blok A2', 22, 'Grade B', '', 1),
        ('harvest-9', '2025-11-20', 'Blok B2', 25, 'Grade A', '', 1),
        ('harvest-10', '2025-11-10', 'Blok C1', 20, 'Grade B', '', 1),
        ('harvest-11', '2025-10-25', 'Blok B1', 18, 'Grade A', '', 1),
        ('harvest-12', '2025-10-15', 'Blok C2', 22, 'Grade B', '', 1);
    `);
  }

  const alertCount = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM alerts",
  );

  if (alertCount && alertCount.count === 0) {
    await database.execAsync(`
      INSERT INTO alerts (id, message, severity, block, created_at, synced) VALUES
        ('alert-1', 'Blok B2 menunjukkan gejala penyakit', 'danger', 'Blok B2', datetime('now', '-2 hours'), 1),
        ('alert-2', 'Blok A1 perlu penyiraman', 'warning', 'Blok A1', datetime('now', '-5 hours'), 1),
        ('alert-3', 'Pemupukan Blok C1 selesai', 'success', 'Blok C1', datetime('now', '-1 day'), 1);
    `);
  }
}

export async function closeDatabase() {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}
```

### 5.2 Sync Service (`src/services/sync-service.ts`)

```typescript
import {
  collection,
  doc,
  Firestore,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  getUnsyncedAlerts,
  getUnsyncedPlants,
  markAlertSynced,
  markPlantSynced,
  upsertAlertFromCloud,
  upsertPlantFromCloud,
} from "../database/dashboard-repository";
import { getDatabase } from "../database/database";
import {
  getUnsyncedDiagnosisRecords,
  markDiagnosisRecordSynced,
  upsertDiagnosisRecordFromCloud,
} from "../database/diagnosis-repository";
import {
  getUnsyncedHarvestRecords,
  markHarvestRecordSynced,
  upsertHarvestRecordFromCloud,
} from "../database/harvest-repository";
import {
  getUnsyncedLogEntries,
  markLogEntrySynced,
  upsertLogEntryFromCloud,
} from "../database/logbook-repository";
import { firestore as _firestore } from "../firebase/config";
import { networkMonitor } from "./network-monitor";

const firestore: Firestore = _firestore;

type SyncStatus = "idle" | "syncing" | "success" | "error";
type SyncStatusListener = (status: SyncStatus, message?: string) => void;

class SyncService {
  private isSyncing = false;
  private statusListeners: Set<SyncStatusListener> = new Set();
  private networkUnsubscribe: (() => void) | null = null;

  start() {
    networkMonitor.start();
    this.networkUnsubscribe = networkMonitor.addListener(
      async (isConnected) => {
        if (isConnected) {
          console.log("[Sync] Network available - starting sync...");
          await this.syncAll();
        }
      },
    );
    networkMonitor.checkConnection().then((isConnected) => {
      if (isConnected) {
        this.syncAll();
      }
    });
  }

  stop() {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }
    networkMonitor.stop();
  }

  addStatusListener(listener: SyncStatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private notifyStatus(status: SyncStatus, message?: string) {
    this.statusListeners.forEach((l) => l(status, message));
  }

  async syncAll(): Promise<void> {
    if (this.isSyncing) return;
    if (!networkMonitor.isConnected) return;

    this.isSyncing = true;
    this.notifyStatus("syncing");

    try {
      // Push all tables in parallel
      await Promise.all([
        this.pushLogEntries(),
        this.pushDiagnosisRecords(),
        this.pushHarvestRecords(),
        this.pushPlants(),
        this.pushAlerts(),
      ]);

      // Pull all tables in parallel
      await Promise.all([
        this.pullLogEntries(),
        this.pullDiagnosisRecords(),
        this.pullHarvestRecords(),
        this.pullPlants(),
        this.pullAlerts(),
      ]);

      // Update sync timestamps
      const db = await getDatabase();
      const now = new Date().toISOString();
      for (const table of [
        "log_entries",
        "diagnosis_records",
        "harvest_records",
        "plants",
        "alerts",
      ]) {
        await db.runAsync(
          `INSERT OR REPLACE INTO sync_meta (table_name, last_synced_at) VALUES (?, ?)`,
          [table, now],
        );
      }

      this.notifyStatus("success", "Semua data berhasil disinkronkan");
    } catch (error) {
      this.notifyStatus(
        "error",
        `Gagal sinkronisasi: ${(error as Error).message}`,
      );
    } finally {
      this.isSyncing = false;
    }
  }

  // Batch write helper (max 499 per batch)
  private async batchWrite(
    collectionName: string,
    items: { id: string; data: Record<string, any> }[],
  ): Promise<string[]> {
    const successIds: string[] = [];
    const BATCH_LIMIT = 499;

    for (let i = 0; i < items.length; i += BATCH_LIMIT) {
      const chunk = items.slice(i, i + BATCH_LIMIT);
      const batch = writeBatch(firestore);
      for (const item of chunk) {
        batch.set(doc(firestore, collectionName, item.id), item.data);
      }
      try {
        await batch.commit();
        successIds.push(...chunk.map((c) => c.id));
      } catch (e) {
        console.error(`[Sync] Batch write failed for ${collectionName}:`, e);
      }
    }
    return successIds;
  }

  // Push methods (Local → Firebase)
  private async pushLogEntries() {
    /* ... batch write pattern ... */
  }
  private async pushDiagnosisRecords() {
    /* ... */
  }
  private async pushHarvestRecords() {
    /* ... */
  }
  private async pushPlants() {
    /* ... */
  }
  private async pushAlerts() {
    /* ... */
  }

  // Pull methods (Firebase → Local)
  private async getLastSyncTime(tableName: string): Promise<string | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ last_synced_at: string | null }>(
      "SELECT last_synced_at FROM sync_meta WHERE table_name = ?",
      [tableName],
    );
    return row?.last_synced_at ?? null;
  }

  private async pullLogEntries() {
    const lastSync = await this.getLastSyncTime("log_entries");
    let q;
    if (lastSync) {
      q = query(
        collection(firestore, "log_entries"),
        where("updated_at", ">", lastSync),
      );
    } else {
      q = query(collection(firestore, "log_entries"));
    }
    const snapshot = await getDocs(q);
    for (const docSnap of snapshot.docs) {
      await upsertLogEntryFromCloud({
        id: docSnap.id,
        ...docSnap.data(),
      } as any);
    }
  }
  // ... pullDiagnosisRecords, pullHarvestRecords, pullPlants, pullAlerts (pola sama)
}

export const syncService = new SyncService();
```

### 5.3 Data Context Provider (`src/contexts/data-context.tsx`)

```typescript
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { getDatabase } from "../database/database";
import { networkMonitor } from "../services/network-monitor";
import { syncService } from "../services/sync-service";
import type { AlertRecord, DashboardStats, DiagnosisRecord, HarvestRecord, LogEntry } from "../database/types";
import * as DashboardRepo from "../database/dashboard-repository";
import * as DiagnosisRepo from "../database/diagnosis-repository";
import * as HarvestRepo from "../database/harvest-repository";
import * as LogbookRepo from "../database/logbook-repository";

type SyncStatus = "idle" | "syncing" | "success" | "error";

interface DataContextType {
  isReady: boolean;
  isOnline: boolean;
  syncStatus: SyncStatus;
  syncMessage: string;
  triggerSync: () => Promise<void>;

  logEntries: LogEntry[];
  refreshLogEntries: () => Promise<void>;
  addLogEntry: (entry: Omit<LogEntry, "id" | "created_at" | "updated_at" | "synced" | "deleted">) => Promise<LogEntry>;
  deleteLogEntry: (id: string) => Promise<void>;

  diagnosisRecords: DiagnosisRecord[];
  refreshDiagnosisRecords: () => Promise<void>;
  addDiagnosisRecord: (record: Omit<DiagnosisRecord, "id" | "created_at" | "updated_at" | "synced" | "deleted">) => Promise<DiagnosisRecord>;

  harvestRecords: HarvestRecord[];
  refreshHarvestRecords: () => Promise<void>;
  addHarvestRecord: (record: Omit<HarvestRecord, "id" | "created_at" | "updated_at" | "synced" | "deleted">) => Promise<HarvestRecord>;
  getHarvestSummary: () => Promise<{ totalThisMonth: number; gradeACounts: number[]; monthlyVolumes: { month: string; total: number }[] }>;

  dashboardStats: DashboardStats | null;
  healthDistribution: { name: string; value: number; color: string }[];
  blockActivityData: { labels: string[]; data: number[] };
  alerts: AlertRecord[];
  refreshDashboard: () => Promise<void>;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  // --- State declarations ---
  const [isReady, setIsReady] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncMessage, setSyncMessage] = useState("");
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [diagnosisRecords, setDiagnosisRecords] = useState<DiagnosisRecord[]>([]);
  const [harvestRecords, setHarvestRecords] = useState<HarvestRecord[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [healthDistribution, setHealthDistribution] = useState([]);
  const [blockActivityData, setBlockActivityData] = useState({ labels: [], data: [] });
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);

  // --- Initialization: DB + Network + Sync ---
  useEffect(() => {
    async function initialize() {
      await getDatabase();
      setIsReady(true);
      await refreshAllData();
      networkMonitor.addListener((connected) => setIsOnline(connected));
      await networkMonitor.checkConnection();
      syncService.addStatusListener((status, message) => {
        setSyncStatus(status);
        if (message) setSyncMessage(message);
        if (status === "success") refreshAllData();
      });
      syncService.start();
    }
    initialize();
    return () => { syncService.stop(); };
  }, []);

  // --- Foreground refresh ---
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && isReady) refreshAllData();
    });
    return () => sub.remove();
  }, [isReady]);

  // --- CRUD wrappers with auto-sync ---
  const addLogEntry = useCallback(async (entry) => {
    const newEntry = await LogbookRepo.addLogEntry(entry);
    await refreshLogEntries();
    if (networkMonitor.isConnected) syncService.syncAll();
    return newEntry;
  }, []);

  // ... similar pattern for deleteLogEntry, addDiagnosisRecord, addHarvestRecord

  if (!isReady) return null;
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextType {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within a DataProvider");
  return context;
}
```

### 5.4 Logbook Component (`components/ui/logbook.tsx`)

```typescript
import * as ImagePicker from "expo-image-picker";
import { Stack } from "expo-router";
import { BookOpen, Calendar, Camera, ChevronLeft, ChevronRight, Filter, Trash2, X } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Alert, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useData } from "../../src/contexts/data-context";
import SyncStatusBar from "./sync-status-bar";

export default function LogbookPage() {
  const {
    logEntries,
    addLogEntry: addLogEntryToDb,
    deleteLogEntry: deleteLogEntryFromDb,
  } = useData();

  // Form state
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedBlock, setSelectedBlock] = useState("");
  const [selectedActivity, setSelectedActivity] = useState("");
  const [notes, setNotes] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Filtered data from SQLite (via context)
  const filteredLogs = useMemo(() => {
    if (!filterDate) return logEntries;
    return logEntries.filter((log) => log.date === filterDate);
  }, [logEntries, filterDate]);

  // Submit handler — writes to SQLite, auto-syncs to Firebase
  const handleSubmit = async () => {
    if (!selectedBlock || !selectedActivity) {
      Alert.alert("Data Belum Lengkap", "Mohon pilih Blok dan Jenis Kegiatan.");
      return;
    }
    try {
      await addLogEntryToDb({
        date: selectedDate,
        block: selectedBlock,
        activity: selectedActivity,
        notes: notes,
        photo: photoPreview,
      });
      // Reset form
      setSelectedBlock(""); setSelectedActivity(""); setNotes(""); setPhotoPreview(null);
      Alert.alert("Berhasil", "Data kegiatan berhasil disimpan!");
    } catch (error) {
      Alert.alert("Gagal", "Terjadi kesalahan saat menyimpan data.");
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        {/* ... header content ... */}
        <SyncStatusBar />
      </View>
      {/* Date Picker Modal, Filter Modal, Form Card, History List */}
      {/* Total: 921 baris */}
    </View>
  );
}
```

### 5.5 Repository Pattern (contoh: `logbook-repository.ts`)

```typescript
import { getDatabase } from "./database";
import type { LogEntry } from "./types";

function generateId(): string {
  return (
    Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 9)
  );
}

export async function getAllLogEntries(): Promise<LogEntry[]> {
  const db = await getDatabase();
  return db.getAllAsync<LogEntry>(
    "SELECT * FROM log_entries WHERE deleted = 0 ORDER BY date DESC, created_at DESC",
  );
}

export async function addLogEntry(
  entry: Omit<
    LogEntry,
    "id" | "created_at" | "updated_at" | "synced" | "deleted"
  >,
): Promise<LogEntry> {
  const db = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO log_entries (id, date, block, activity, notes, photo, created_at, updated_at, synced, deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
    [
      id,
      entry.date,
      entry.block,
      entry.activity,
      entry.notes,
      entry.photo ?? null,
      now,
      now,
    ],
  );
  return {
    id,
    ...entry,
    created_at: now,
    updated_at: now,
    synced: 0,
    deleted: 0,
  };
}

export async function deleteLogEntry(id: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    "UPDATE log_entries SET deleted = 1, updated_at = ?, synced = 0 WHERE id = ?",
    [now, id],
  );
}

export async function getUnsyncedLogEntries(): Promise<LogEntry[]> {
  const db = await getDatabase();
  return db.getAllAsync<LogEntry>("SELECT * FROM log_entries WHERE synced = 0");
}

export async function markLogEntrySynced(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("UPDATE log_entries SET synced = 1 WHERE id = ?", [id]);
}

export async function upsertLogEntryFromCloud(entry: LogEntry): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO log_entries (id, date, block, activity, notes, photo, created_at, updated_at, synced, deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      entry.id,
      entry.date,
      entry.block,
      entry.activity,
      entry.notes,
      entry.photo ?? null,
      entry.created_at ?? new Date().toISOString(),
      entry.updated_at ?? new Date().toISOString(),
      entry.deleted ?? 0,
    ],
  );
}
```

### 5.6 Network Monitor (`src/services/network-monitor.ts`)

```typescript
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";

type NetworkListener = (isConnected: boolean) => void;

class NetworkMonitor {
  private listeners: Set<NetworkListener> = new Set();
  private _isConnected: boolean = false;
  private unsubscribe: (() => void) | null = null;

  get isConnected(): boolean {
    return this._isConnected;
  }

  start() {
    this.unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = !!(
        state.isConnected && state.isInternetReachable !== false
      );
      if (connected !== this._isConnected) {
        this._isConnected = connected;
        this.notifyListeners(connected);
      }
    });
  }

  stop() {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  addListener(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(isConnected: boolean) {
    this.listeners.forEach((listener) => listener(isConnected));
  }

  async checkConnection(): Promise<boolean> {
    const state = await NetInfo.fetch();
    this._isConnected = !!(
      state.isConnected && state.isInternetReachable !== false
    );
    return this._isConnected;
  }
}

export const networkMonitor = new NetworkMonitor();
```

### 5.7 Firebase Config (`src/firebase/config.ts`)

```typescript
import { initializeApp } from "firebase/app";
import {
  Firestore,
  getFirestore,
  initializeFirestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC0wsrqigar-cEtgzhT5Tte8zbqzNlvsKc",
  authDomain: "agri-smart-27f82.firebaseapp.com",
  projectId: "agri-smart-27f82",
  storageBucket: "agri-smart-27f82.firebasestorage.app",
  messagingSenderId: "718989239287",
  appId: "1:718989239287:web:5589b6de396acd848444f2",
};

const app = initializeApp(firebaseConfig);

function getFirestoreInstance(): Firestore {
  try {
    return initializeFirestore(app, {});
  } catch (e) {
    return getFirestore(app);
  }
}

const firestore: Firestore = getFirestoreInstance();
export { app, firestore };
```

### 5.8 Root Layout (`app/_layout.tsx`)

```typescript
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { DataProvider } from "@/src/contexts/data-context";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <DataProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
        </Stack>
      </DataProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
```

---

## 6. Stack Teknologi

| Layer             | Teknologi                       | Versi    |
| ----------------- | ------------------------------- | -------- |
| Framework         | Expo SDK                        | ~54.0.30 |
| Runtime           | React Native                    | 0.81.5   |
| UI Library        | React                           | 19.1.0   |
| Navigation        | expo-router                     | ~6.0.21  |
| Local Database    | expo-sqlite                     | ~16.0.10 |
| Cloud Database    | Firebase Firestore              | ^12.9.0  |
| Network Detection | @react-native-community/netinfo | 11.4.1   |
| Dev Tunnel        | @expo/ngrok                     | ^4.1.3   |
| Icons             | lucide-react-native             | ^0.562.0 |
| Charts            | react-native-chart-kit          | ^6.12.0  |
| Camera            | expo-image-picker               | ~17.0.10 |
| Animation         | react-native-reanimated         | ~4.1.1   |
| Language          | TypeScript                      | ~5.9.2   |
| Linting           | ESLint + eslint-config-expo     | ^9.25.0  |

---

## 7. ERD (Entity Relationship Diagram)

```
┌──────────────────────────┐     ┌──────────────────────────────────┐
│      log_entries         │     │       diagnosis_records           │
├──────────────────────────┤     ├──────────────────────────────────┤
│ PK id         TEXT       │     │ PK id                TEXT        │
│    date       TEXT       │     │    date              TEXT        │
│    block      TEXT       │     │    selected_symptoms TEXT (JSON) │
│    activity   TEXT       │     │    risk_level        TEXT        │
│    notes      TEXT       │     │    result_title      TEXT        │
│    photo      TEXT?      │     │    result_description TEXT       │
│    created_at TEXT       │     │    recommendations   TEXT (JSON) │
│    updated_at TEXT       │     │    created_at        TEXT        │
│    synced     INTEGER    │     │    updated_at        TEXT        │
│    deleted    INTEGER    │     │    synced            INTEGER     │
└──────────────────────────┘     │    deleted           INTEGER     │
                                 └──────────────────────────────────┘

┌──────────────────────────┐     ┌──────────────────────────┐
│    harvest_records       │     │         plants           │
├──────────────────────────┤     ├──────────────────────────┤
│ PK id         TEXT       │     │ PK id           TEXT     │
│    date       TEXT       │     │    block         TEXT    │
│    block      TEXT       │     │    name          TEXT    │
│    quantity   REAL       │     │    status        TEXT    │
│    quality    TEXT       │     │    planted_date  TEXT?   │
│    notes      TEXT       │     │    notes         TEXT    │
│    created_at TEXT       │     │    created_at    TEXT    │
│    updated_at TEXT       │     │    updated_at    TEXT    │
│    synced     INTEGER    │     │    synced        INTEGER │
│    deleted    INTEGER    │     │    deleted       INTEGER │
└──────────────────────────┘     └──────────────────────────┘

┌──────────────────────────┐     ┌─────────────────────────┐
│         alerts           │     │     chat_messages       │
├──────────────────────────┤     ├─────────────────────────┤
│ PK id         TEXT       │     │ PK id          TEXT     │
│    message    TEXT       │     │    text         TEXT    │
│    severity   TEXT       │     │    sender       TEXT    │
│    block      TEXT?      │     │    created_at   TEXT    │
│    is_read    INTEGER    │     │    synced       INTEGER │
│    created_at TEXT       │     └─────────────────────────┘
│    updated_at TEXT       │
│    synced     INTEGER    │     ┌─────────────────────────┐
│    deleted    INTEGER    │     │      sync_meta          │
└──────────────────────────┘     ├─────────────────────────┤
                                 │ PK table_name    TEXT   │
┌──────────────────────────┐     │    last_synced_at TEXT  │
│       db_version         │     └─────────────────────────┘
├──────────────────────────┤
│ PK id       INTEGER (=1) │
│    version  INTEGER      │
└──────────────────────────┘
```

**Catatan ERD:**

- Seluruh tabel utama bersifat **standalone** (tidak ada foreign key antar tabel).
- Kolom `block` muncul di `log_entries`, `harvest_records`, `plants`, dan `alerts` — secara logis menghubungkan entitas, walau tidak melalui foreign key constraint.
- `sync_meta` menyimpan timestamp sinkronisasi terakhir per tabel.
- `db_version` adalah singleton row (CHECK constraint `id = 1`) yang melacak versi schema.

---

> **Dokumen ini dibuat secara otomatis berdasarkan audit kode sumber proyek Agri-Smart.**
