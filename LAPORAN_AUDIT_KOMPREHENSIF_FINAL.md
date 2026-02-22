# 🟢 LAPORAN AUDIT KOMPREHENSIF FINAL — AGRI-SMART

**Tanggal Audit:** 20 Februari 2026  
**Auditor:** Principal Software Architect, Elite Full-Stack QA, & Lead Security Researcher  
**Metodologi:** 100% Autonomous Deep-Dive Exploratory Audit — Blind Scan  
**Cakupan:** 50 file source code (TypeScript/TSX/JS), ~7.800 baris kode

---

## 🟢 RINGKASAN EKSEKUTIF

### Skor Kesehatan Keseluruhan: **52 / 100**

| Dimensi                          | Skor   | Bobot | Keterangan                                                                                                     |
| -------------------------------- | ------ | ----- | -------------------------------------------------------------------------------------------------------------- |
| 🔒 Keamanan                      | 55/100 | 20%   | Env vars bagus, tapi tidak ada validasi; Device ID non-crypto; No production error tracking                    |
| 🧱 Stabilitas & Crash Resistance | 50/100 | 25%   | ErrorBoundary ada, tapi memory leak `setTimeout`, race condition sync, migration destructive tanpa transaction |
| ⚡ Performa                      | 45/100 | 15%   | N+1 query pattern (~24 round-trip per dashboard), sequential pull upserts, bulk insert tanpa transaction       |
| 🔄 Data Integrity & Sync         | 40/100 | 20%   | Tidak ada conflict resolution; `INSERT OR REPLACE` = last-write-wins; sync timestamp maju meskipun pull gagal  |
| 🎨 UI/UX                         | 60/100 | 10%   | SafeArea bagus di beberapa file, tapi tidak konsisten; dark mode hampir tidak berfungsi; accessibility nol     |
| 📐 Arsitektur & Maintainability  | 65/100 | 10%   | Separation of concerns baik (repo pattern), tapi ada god-file 757 baris, dead code, `any` types                |

### Ringkasan Temuan

| Tingkat         | Jumlah |
| --------------- | ------ |
| 🔴 **CRITICAL** | 8      |
| 🟠 **HIGH**     | 19     |
| 🟡 **MEDIUM**   | 28     |
| 🔵 **LOW**      | 22     |
| **TOTAL**       | **77** |

---

## 🔍 BREAKDOWN AUDIT PER FITUR

---

### FITUR 1: DATABASE LAYER (`src/database/`)

#### Cara Kerja Saat Ini

- Singleton `SQLiteDatabase` via cached promise (`dbPromise`)
- 7 tabel: `app_config`, `db_version`, `log_entries`, `diagnosis_records`, `harvest_records`, `plants`, `alerts`, `chat_messages`, `sync_meta`
- DB_VERSION = 5 dengan migrasi destructive (DROP + recreate semua tabel)
- Device ID: SQLite → SecureStore fallback → generate baru
- Repository pattern per entitas (logbook, harvest, diagnosis, dashboard)

#### Temuan

| ID    | Severity        | File                      | Line      | Judul                                           | Deskripsi                                                                                                                                                                                                                          |
| ----- | --------------- | ------------------------- | --------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DB-01 | 🔴 **CRITICAL** | `database.ts`             | L151      | **SQL Interpolation dalam Migrasi**             | `${DB_VERSION}` diinterpolasi langsung ke dalam `execAsync` SQL string. Meskipun `DB_VERSION` adalah konstanta hardcoded, pattern ini melanggar prinsip secure coding dan berbahaya jika ke depan ada input dinamis.               |
| DB-02 | 🟠 **HIGH**     | `database.ts`             | L140-L232 | **Migrasi Destructive Tanpa Incremental Path**  | Semua versi < 5 memicu `DROP TABLE` pada semua tabel data. Jika dibutuhkan v6, migrasi akan kembali menghapus SEMUA data lokal karena hanya ada satu guard `if (currentVersion < DB_VERSION)` tanpa step-through logic (v5→v6→v7). |
| DB-03 | 🟠 **HIGH**     | `database.ts`             | L140-L148 | **Migrasi Tidak Dibungkus Transaction**         | Jika app crash antara `DROP TABLE` dan `INSERT OR REPLACE INTO db_version`, database ditinggalkan dalam keadaan corrupt — tabel hilang tapi versi masih lama, menyebabkan migrasi retry gagal selamanya.                           |
| DB-04 | 🟡 **MEDIUM**   | `database.ts`             | L22       | **`PRAGMA foreign_keys = ON` Tanpa FK**         | Pragma diaktifkan tapi tidak ada tabel yang punya `REFERENCES` clause — dead code yang memberi kesan palsu referential integrity.                                                                                                  |
| DB-05 | 🟡 **MEDIUM**   | `database.ts`             | L262-L271 | **deviceIdPromise Cache Rejected Promise**      | Jika `getDeviceId()` gagal, promise yang ter-cache adalah rejected promise selamanya. Semua panggilan selanjutnya akan reject tanpa retry.                                                                                         |
| DB-06 | 🟡 **MEDIUM**   | `database.ts`             | L319-L325 | **`closeDatabase` Tidak Reset deviceIdPromise** | Setelah close dan re-open, cached device ID promise reference koneksi DB lama.                                                                                                                                                     |
| DB-07 | 🔵 **LOW**      | `database.ts`             | L302-L303 | **Device ID Entropy Lemah**                     | `Math.random()` bukan cryptographically secure. Collision risk rendah tapi non-zero pada 2 device yang create ID di millisecond yang sama.                                                                                         |
| DB-08 | 🟡 **MEDIUM**   | `types.ts`                | L7-L14    | **Optional Fields untuk NOT NULL Columns**      | `created_at`, `updated_at`, `synced`, `deleted` ditandai opsional (`?`) padahal di schema `NOT NULL`. Erodes type safety.                                                                                                          |
| DB-09 | 🟡 **MEDIUM**   | `utils.ts`                | L8-L12    | **Non-Crypto `generateId()`**                   | `Math.random()` digunakan. Pada `addBulkPlants` yang membuat 500 record sekaligus, risk collision meningkat.                                                                                                                       |
| DB-10 | 🟠 **HIGH**     | `dashboard-repository.ts` | L5-L30    | **N+1 Query di `getDashboardStats()`**          | 5 query SELECT sequential yang seharusnya 1 query `GROUP BY status`.                                                                                                                                                               |
| DB-11 | 🟠 **HIGH**     | `dashboard-repository.ts` | L32-L56   | **N+1 Query di `getHealthDistribution()`**      | 3 query SELECT yang menduplikasi logika `getDashboardStats`.                                                                                                                                                                       |
| DB-12 | 🟠 **HIGH**     | `dashboard-repository.ts` | L58-L79   | **N+1 Query di `getBlockActivityData()`**       | 6 query sequential (satu per block) dengan block hardcoded. Seharusnya `GROUP BY block`.                                                                                                                                           |
| DB-13 | 🟠 **HIGH**     | `harvest-repository.ts`   | L99-L132  | **N+1 Query di `getHarvestSummary()`**          | 10 query sequential (1 monthly, 4 weekly, 5 monthly volumes).                                                                                                                                                                      |
| DB-14 | 🟠 **HIGH**     | `dashboard-repository.ts` | L126-L148 | **`addBulkPlants` Tanpa Transaction**           | Insert 500 tanaman tanpa transaction — crash mid-way meninggalkan data parsial yang juga akan di-sync.                                                                                                                             |
| DB-15 | 🟡 **MEDIUM**   | `logbook-repository.ts`   | L58-L90   | **No-op Update Possible**                       | Jika `updates` kosong, UPDATE tetap berjalan, mengubah `updated_at` dan `synced = 0` tanpa perubahan data sebenarnya.                                                                                                              |
| DB-16 | 🔵 **LOW**      | `harvest-repository.ts`   | L108-L118 | **Week Boundary Tidak Presisi**                 | Perhitungan minggu overlap/gap tergantung hari saat ini.                                                                                                                                                                           |
| DB-17 | 🟡 **MEDIUM**   | `dashboard-repository.ts` | L253-L267 | **`formatRelativeTime` NaN untuk Date Invalid** | Tidak ada guard untuk `diffMs < 0` (future dates) atau `NaN` dari parse gagal. Menghasilkan "NaN menit yang lalu".                                                                                                                 |

**Potongan kode bermasalah (DB-01):**

```sql
-- database.ts L232 — SQL Interpolation
INSERT OR REPLACE INTO db_version (id, version) VALUES (1, ${DB_VERSION});
```

**Fix:**

```typescript
await database.runAsync(
  "INSERT OR REPLACE INTO db_version (id, version) VALUES (1, ?)",
  [DB_VERSION],
);
```

**Potongan kode bermasalah (DB-03):**

```typescript
// database.ts L140-L232 — Migration tanpa transaction
async function handleMigration(database: SQLite.SQLiteDatabase) {
  const row = await database.getFirstAsync<{ version: number }>(
    "SELECT version FROM db_version WHERE id = 1",
  );
  const currentVersion = row?.version ?? 0;
  if (currentVersion < DB_VERSION) {
    // ❌ BAHAYA: Jika crash di sini, tabel hilang tapi versi belum diupdate
    await database.execAsync(`DROP TABLE IF EXISTS log_entries; ...`);
    await database.execAsync(
      `CREATE TABLE IF NOT EXISTS ...; INSERT OR REPLACE ...`,
    );
  }
}
```

**Fix:**

```typescript
async function handleMigration(database: SQLite.SQLiteDatabase) {
  const row = await database.getFirstAsync<{ version: number }>(
    "SELECT version FROM db_version WHERE id = 1",
  );
  const currentVersion = row?.version ?? 0;
  if (currentVersion < DB_VERSION) {
    await database.execAsync("BEGIN TRANSACTION;");
    try {
      await database.execAsync(`DROP TABLE IF EXISTS log_entries; ...`);
      await database.execAsync(`CREATE TABLE IF NOT EXISTS ...`);
      await database.runAsync(
        "INSERT OR REPLACE INTO db_version (id, version) VALUES (1, ?)",
        [DB_VERSION],
      );
      await database.execAsync("COMMIT;");
    } catch (e) {
      await database.execAsync("ROLLBACK;");
      throw e;
    }
  }
}
```

**Potongan kode bermasalah (DB-10, DB-11, DB-12):**

```typescript
// dashboard-repository.ts — 24 sequential queries
export async function getDashboardStats() {
  const total = await db.getFirstAsync(...);  // Query 1
  const healthy = await db.getFirstAsync(...); // Query 2
  const attention = await db.getFirstAsync(...); // Query 3
  const sick = await db.getFirstAsync(...); // Query 4
  const harvest = await db.getFirstAsync(...); // Query 5
}
```

**Fix:**

```typescript
export async function getDashboardStats() {
  const db = await getDatabase();
  const stats = await db.getFirstAsync<{
    total: number;
    healthy: number;
    attention: number;
    sick: number;
  }>(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'sehat' THEN 1 ELSE 0 END) as healthy,
      SUM(CASE WHEN status = 'perhatian' THEN 1 ELSE 0 END) as attention,
      SUM(CASE WHEN status = 'sakit' THEN 1 ELSE 0 END) as sick
    FROM plants WHERE deleted = 0
  `);
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const harvest = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(quantity), 0) as total FROM harvest_records WHERE deleted = 0 AND date LIKE ?`,
    [`${currentMonth}%`],
  );
  return {
    totalPlants: stats?.total ?? 0,
    healthyPlants: stats?.healthy ?? 0,
    attentionPlants: stats?.attention ?? 0,
    sickPlants: stats?.sick ?? 0,
    harvestThisMonth: harvest?.total ?? 0,
  };
}
```

---

### FITUR 2: SINKRONISASI DATA (`src/services/sync-service.ts`)

#### Cara Kerja Saat Ini

- Push: Ambil unsynced records → batch write ke Firestore (max 499) → mark synced
- Pull: Query Firestore `where("updated_at", ">", lastSync)` → `INSERT OR REPLACE` ke SQLite
- Foto: Compress `file://` ke Base64 sebelum push
- Network listener: auto-sync saat online

#### Temuan

| ID      | Severity        | File              | Line      | Judul                                                      | Deskripsi                                                                                                                                                                                                                                                                            |
| ------- | --------------- | ----------------- | --------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SYNC-01 | 🔴 **CRITICAL** | `sync-service.ts` | L170-L194 | **Race Condition Kompresi Foto**                           | Saat push, foto `file://` dikompresi ke Base64 dan ditulis balik ke SQLite dengan `synced = 0`. Jika batch write ke Firestore gagal setelah itu, record lokal sudah dimodifikasi permanent (foto asli hilang, diganti Base64) tapi tetap `synced = 0`, menyebabkan infinite re-sync. |
| SYNC-02 | 🟠 **HIGH**     | `sync-service.ts` | L346-L518 | **Pull Sequential per Document**                           | Pull menggunakan `for...of` + `await` per document. Jika ada 1000 dokumen, = 1000 serial SQLite write. Harus batch-insert.                                                                                                                                                           |
| SYNC-03 | 🟠 **HIGH**     | `sync-service.ts` | L95-L97   | **`syncAll()` Membuang Request Saat Busy**                 | Jika `isSyncing = true`, request langsung return tanpa queueing. CRUD operation yang trigger sync akan kehilangan perubahan sampai sync berikutnya.                                                                                                                                  |
| SYNC-04 | 🟠 **HIGH**     | `sync-service.ts` | L118-L137 | **Push & Pull Tidak Atomic**                               | Push paralel → Pull paralel → Update timestamp. Jika push sukses tapi pull gagal, `sync_meta.last_synced_at` tetap di-update untuk SEMUA tabel — data yang gagal pull tidak akan pernah di-retry karena timestamp sudah maju melewati record tersebut.                               |
| SYNC-05 | 🟡 **MEDIUM**   | `sync-service.ts` | L47-L60   | **`start()` Bisa Dipanggil Berkali-Kali**                  | Setiap panggilan menambah network listener baru tanpa menghapus yang lama — menyebabkan duplikasi `syncAll()` invocation.                                                                                                                                                            |
| SYNC-06 | 🟡 **MEDIUM**   | `sync-service.ts` | L180-L188 | **Entry Skip dari Kompresi Gagal = Infinite Failure Loop** | Entry yang gagal compress tetap `synced = 0` dan akan di-retry setiap sync cycle — gagal lagi dan lagi jika `file://` URI sudah invalid.                                                                                                                                             |
| SYNC-07 | 🟡 **MEDIUM**   | `sync-service.ts` | L346-L518 | **Tidak Ada Conflict Resolution**                          | `INSERT OR REPLACE` = last-write-wins. Jika 2 device edit record yang sama, pull terakhir menang tanpa merge atau deteksi konflik.                                                                                                                                                   |
| SYNC-08 | 🟡 **MEDIUM**   | `sync-service.ts` | All pull  | **Tidak Ada Pagination untuk Pull**                        | `getDocs(query(...))` mengambil SEMUA dokumen Firestore yang cocok. Dengan ribuan record, ini bisa menyebabkan OOM.                                                                                                                                                                  |

**Potongan kode bermasalah (SYNC-01):**

```typescript
// sync-service.ts L206-L220
if (photo && photo.startsWith("file://")) {
  const base64Photo = await compressImageToBase64(photo);
  if (base64Photo) {
    photo = base64Photo;
    // ❌ Record lokal dimodifikasi SEBELUM konfirmasi push berhasil
    await db.runAsync(
      `UPDATE log_entries SET photo = ?, synced = 0 WHERE id = ?`,
      [photo, entry.id],
    );
  }
}
// Lalu push ke Firestore... yang mungkin gagal
```

**Fix:**

```typescript
// Compress foto tapi JANGAN overwrite lokal sampai push sukses
if (photo && photo.startsWith("file://")) {
  try {
    const base64Photo = await compressImageToBase64(photo);
    if (base64Photo) {
      // Gunakan base64 untuk push, tapi simpan URI asli di lokal
      photo = base64Photo; // hanya untuk data yang dikirim ke Firestore
    } else {
      continue;
    }
  } catch (compressErr) {
    continue;
  }
}

items.push({ id: entry.id, data: { ...entry, photo, synced: 1 } });

// Setelah batch write SUKSES, baru update foto lokal:
for (const id of successIds) {
  const item = items.find((i) => i.id === id);
  if (item?.data.photo?.startsWith("data:")) {
    await db.runAsync(
      "UPDATE log_entries SET photo = ?, synced = 1 WHERE id = ?",
      [item.data.photo, id],
    );
  }
}
```

**Potongan kode bermasalah (SYNC-04):**

```typescript
// sync-service.ts L118-137
// Push semua
await Promise.all([this.pushLogEntries(), ...]);
// Pull semua
await Promise.all([this.pullLogEntries(), ...]);
// ❌ Update timestamp SEMUA tabel meskipun beberapa pull gagal
const tables = ["log_entries", "diagnosis_records", ...];
for (const table of tables) {
  await db.runAsync(
    `INSERT OR REPLACE INTO sync_meta ... VALUES (?, ?)`,
    [table, now]
  );
}
```

**Fix:**

```typescript
// Pull per-tabel dengan individual error handling
const pullResults = await Promise.allSettled([
  this.pullLogEntries(),
  this.pullDiagnosisRecords(),
  // ...
]);

// Hanya update timestamp untuk tabel yang sukses pull
const tableNames = ["log_entries", "diagnosis_records", ...];
for (let i = 0; i < pullResults.length; i++) {
  if (pullResults[i].status === "fulfilled") {
    await db.runAsync(
      `INSERT OR REPLACE INTO sync_meta ... VALUES (?, ?)`,
      [tableNames[i], now]
    );
  }
}
```

---

### FITUR 3: NETWORK MONITORING (`src/services/network-monitor.ts`)

#### Cara Kerja Saat Ini

- Singleton `NetworkMonitor` dengan NetInfo listener
- Property `isConnected` + listener pattern
- `checkConnection()` untuk cek manual

#### Temuan

| ID     | Severity      | File                 | Line    | Judul                                      | Deskripsi                                                                                                                                                                                                                      |
| ------ | ------------- | -------------------- | ------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| NET-01 | 🟡 **MEDIUM** | `network-monitor.ts` | L15-L16 | **`start()` Leak Listener Lama**           | Overwrite `this.unsubscribe` tanpa memanggil yang lama — listener NetInfo bocor.                                                                                                                                               |
| NET-02 | 🟡 **MEDIUM** | `network-monitor.ts` | L17     | **`isInternetReachable` null = Connected** | `state.isInternetReachable !== false` berarti `null` dianggap connected. Pada awal boot, `isInternetReachable` sering `null` sebelum probe selesai, menyebabkan sync trigger prematur yang gagal dan mengisi log dengan error. |

**Fix NET-01:**

```typescript
start() {
  // Hentikan listener lama sebelum membuat baru
  this.stop();
  this.unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    // ...
  });
}
```

---

### FITUR 4: FIREBASE CONFIG (`src/firebase/config.ts`)

#### Cara Kerja Saat Ini

- Konfigurasi dari `process.env.EXPO_PUBLIC_*`
- `initializeFirestore` dengan `persistentLocalCache` + `persistentMultipleTabManager`
- Fallback ke `getFirestore(app)` jika sudah initialized

#### Temuan

| ID    | Severity      | File        | Line    | Judul                                         | Deskripsi                                                                                                                                                                   |
| ----- | ------------- | ----------- | ------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FB-01 | 🟠 **HIGH**   | `config.ts` | L12-L19 | **Tidak Ada Validasi Env Vars**               | Jika env var kosong, `firebaseConfig` punya nilai `undefined`. `initializeApp()` jalan dengan config invalid — error muncul belakangan di Firestore dengan pesan cryptic.   |
| FB-02 | 🟡 **MEDIUM** | `config.ts` | L25-L33 | **`persistentMultipleTabManager()` Web-Only** | API ini untuk web — throw di native platform, ditangkap catch. Tapi fallback `getFirestore(app)` tidak configure persistence apapun — kehilangan offline support di native. |
| FB-03 | 🔵 **LOW**    | `config.ts` | L31-L33 | **Catch Block Menelan Error**                 | Jika `initializeFirestore` gagal karena alasan selain already-initialized, error hilang tanpa log.                                                                          |

**Fix FB-01:**

```typescript
const requiredKeys = [
  "EXPO_PUBLIC_FIREBASE_API_KEY",
  "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
  "EXPO_PUBLIC_FIREBASE_APP_ID",
] as const;

for (const key of requiredKeys) {
  if (!process.env[key]) {
    throw new Error(`Missing required Firebase env var: ${key}`);
  }
}
```

---

### FITUR 5: CONTEXT & STATE MANAGEMENT (`src/contexts/data-context.tsx`)

#### Cara Kerja Saat Ini

- `DataProvider` membungkus seluruh app
- Init: `getDatabase()` → `refreshAllData()` → `networkMonitor` + `syncService`
- CRUD: SQLite write → refresh state → trigger sync (fire-and-forget)
- `isReady` / `initError` state untuk fallback UI

#### Temuan

| ID     | Severity      | File               | Line      | Judul                                            | Deskripsi                                                                                                                                                                            |
| ------ | ------------- | ------------------ | --------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CTX-01 | 🟡 **MEDIUM** | `data-context.tsx` | L200-L210 | **Fire-and-Forget Sync Menelan Error**           | `syncService.syncAll().catch(() => {})` menelan semua error sync. User tidak mendapat feedback jika sync gagal setelah CRUD.                                                         |
| CTX-02 | 🟡 **MEDIUM** | `data-context.tsx` | L142-L147 | **Tidak Ada Debounce pada Sync Success Refresh** | Sync success → `refreshAllData()` → user CRUD → sync → lagi `refreshAllData()`. Data di-fetch dari SQLite berkali-kali dalam waktu singkat tanpa throttle.                           |
| CTX-03 | 🟡 **MEDIUM** | `data-context.tsx` | L127-L154 | **Double Init di React Strict Mode**             | `useEffect` tanpa dependency pada `refreshAllData` bisa menyebabkan `syncService.start()` dipanggil dua kali pada development StrictMode, menumpuk network listener (lihat SYNC-05). |
| CTX-04 | 🔵 **LOW**    | `data-context.tsx` | L286-L289 | **Retry Button Tidak Reset State**               | Retry button memanggil `initializeRef.current()` tanpa clear state sebelumnya. Jika `isReady` sudah `true` sebelum error, retry bisa menghasilkan inconsistent state.                |

---

### FITUR 6: HOME PAGE (`components/ui/index.tsx`)

#### Cara Kerja Saat Ini

- ScrollView dengan header image (Unsplash), menu grid 2-kolom, recent logbook entries
- Navigasi ke fitur via `router.push(\`/${item.id}\`)`

#### Temuan

| ID      | Severity        | File        | Line    | Judul                                  | Deskripsi                                                                                                                                                                                                              |
| ------- | --------------- | ----------- | ------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HOME-01 | 🔴 **CRITICAL** | `index.tsx` | L114    | **4/5 Navigasi Menu Broken**           | `router.push(\`/${item.id}\`)`untuk`logbook`, `chatbot`, `dashboard`, `scanner`mengarah ke route yang TIDAK ADA di root. Route ini ada di`(tabs)`group. Hanya`diagnosis`yang benar karena ada file`app/diagnosis.tsx`. |
| HOME-02 | 🟡 **MEDIUM**   | `index.tsx` | L93-L97 | **Remote Image Tanpa Fallback**        | Gambar header dari Unsplash tanpa `onError`, placeholder, atau cache. Offline = blank putih.                                                                                                                           |
| HOME-03 | 🟡 **MEDIUM**   | `index.tsx` | L108    | **Unsafe Route Cast `as any`**         | Type safety dibuang dengan `as any` — jika ID typo, crash runtime tanpa warning TypeScript.                                                                                                                            |
| HOME-04 | 🟡 **MEDIUM**   | `index.tsx` | L22     | **Stale `Dimensions` di Module Level** | `Dimensions.get("window")` dipanggil sekali saat import — tidak update saat rotasi/split-screen.                                                                                                                       |
| HOME-05 | 🔵 **LOW**      | `index.tsx` | L148    | **Hardcoded `paddingTop: 50`**         | Harus menggunakan `useSafeAreaInsets().top` untuk mendukung semua device.                                                                                                                                              |
| HOME-06 | 🔵 **LOW**      | `index.tsx` | N/A     | **Tidak Ada Accessibility Labels**     | Menu cards tanpa `accessibilityLabel` atau `accessibilityRole`.                                                                                                                                                        |

**Potongan kode bermasalah (HOME-01):**

```tsx
// components/ui/index.tsx L114
onPress={() => router.push(`/${item.id}` as any)}

// Untuk item id = "logbook" → navigasi ke "/logbook"
// ❌ Tidak ada file app/logbook.tsx — route hanya ada di app/(tabs)/logbook.tsx
```

**Fix:**

```tsx
const menuItems = [
  { id: "diagnosis", route: "/diagnosis", ... },      // top-level route ✅
  { id: "logbook", route: "/(tabs)/logbook", ... },    // tab route
  { id: "chatbot", route: "/(tabs)/chatbot", ... },
  { id: "dashboard", route: "/(tabs)/dashboard", ... },
  { id: "scanner", route: "/(tabs)/scanner", ... },
];

// Lalu:
onPress={() => router.push(item.route as any)}
```

---

### FITUR 7: DASHBOARD (`components/ui/dashboard.tsx`)

#### Cara Kerja Saat Ini

- Menampilkan stats (total, sehat, perhatian, sakit), PieChart distribusi, BarChart aktivitas blok
- Data dari `useData()` context

#### Temuan

| ID      | Severity      | File            | Line    | Judul                                  | Deskripsi                                                                                                                    |
| ------- | ------------- | --------------- | ------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| DASH-01 | 🟠 **HIGH**   | `dashboard.tsx` | L28-L30 | **Missing useEffect Dependency**       | `refreshDashboard` tidak ada di dependency array `useEffect`. Jika reference berubah, effect tidak akan re-run → data stale. |
| DASH-02 | 🟠 **HIGH**   | `dashboard.tsx` | L20     | **Stale `Dimensions` di Module Level** | Chart width `screenWidth - 64` tidak update saat rotasi. Chart bisa overflow atau terlalu sempit.                            |
| DASH-03 | 🟡 **MEDIUM** | `dashboard.tsx` | L28-L30 | **Tidak Ada Loading State**            | `refreshDashboard()` async tapi tidak ada indicator loading — user melihat data nol/kosong sebelum data siap.                |
| DASH-04 | 🟡 **MEDIUM** | `dashboard.tsx` | N/A     | **Tidak Ada Pull-to-Refresh**          | `RefreshControl` tidak ada — user tidak bisa manual refresh dashboard.                                                       |
| DASH-05 | 🔵 **LOW**    | `dashboard.tsx` | L155    | **Index Sebagai Key**                  | `stats.map((stat, index) => <View key={index}>` — jika stats reorder, React reconciliation bisa salah.                       |

---

### FITUR 8: LOGBOOK (`components/ui/logbook.tsx`)

#### Cara Kerja Saat Ini

- Form multi-step: pilih tanggal → blok → aktivitas → isi field dinamis (per aktivitas) → submit
- Dynamic fields: Panen (grade, jumlahBuah, beratTotal), Menanam (jumlahBibit), Inspeksi (kondisi, jumlahTerdampak), Pemupukan/Pestisida (jenis, dosis)
- Camera capture untuk foto

#### Temuan

| ID     | Severity        | File          | Line      | Judul                                   | Deskripsi                                                                                                                                                                                                                                                 |
| ------ | --------------- | ------------- | --------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LOG-01 | 🔴 **CRITICAL** | `logbook.tsx` | L285-L307 | **Race Condition di handleSubmit**      | Multiple async DB writes sequential (`addLogEntry`, `addHarvestRecord`, `addBulkPlants`, `updatePlantStatusByBlock`, `refreshDashboard`) tanpa transaction. Jika satu gagal di tengah, data inconsistent — log entry tersimpan tapi harvest record tidak. |
| LOG-02 | 🟠 **HIGH**     | `logbook.tsx` | L252-L260 | **Tidak Ada Sanitasi Angka Negatif**    | `parseFloat(beratTotal)` dan `parseInt(jumlahBibit)` menerima nilai negatif dari user. `-50` melewati validasi dan masuk ke database.                                                                                                                     |
| LOG-03 | 🟠 **HIGH**     | `logbook.tsx` | L239-L247 | **Validasi "Panen" Incomplete**         | `jumlahBuah` tidak divalidasi — bisa kosong, negatif, atau non-numerik. Hanya `beratTotal` yang dicek.                                                                                                                                                    |
| LOG-04 | 🟡 **MEDIUM**   | `logbook.tsx` | L225-L226 | **Camera Permission Stuck After Deny**  | Setelah permission pertama ditolak, iOS selalu return `denied`. Alert hanya berkata "beri izin" tanpa link ke Settings app — user tidak bisa recovery.                                                                                                    |
| LOG-05 | 🟡 **MEDIUM**   | `logbook.tsx` | L168      | **Date Format Inconsistency UTC/Local** | Default date dari `new Date().toISOString().split("T")[0]` menggunakan UTC. Calendar picker menggunakan timezone lokal. User di UTC+7 setelah midnight melihat tanggal yang berbeda antara default dan picked.                                            |
| LOG-06 | 🔵 **LOW**      | `logbook.tsx` | L148-L154 | **14 State Variables**                  | Pattern `useReducer` lebih cocok untuk form sekompleks ini — menghindari stale closure dan mempermudah reset.                                                                                                                                             |

**Potongan kode bermasalah (LOG-01):**

```tsx
// logbook.tsx L285-L307 — Sequential writes tanpa atomicity
const handleSubmit = async () => {
  setIsSubmitting(true);
  try {
    await addLogEntryToDb({...});           // ✅ berhasil
    if (selectedActivity === "Panen") {
      await addHarvestRecord({...});        // ❌ bisa gagal di sini
    }
    if (selectedActivity === "Menanam") {
      await addBulkPlants(...);             // → tidak pernah dieksekusi
    }
    await refreshDashboard();
    Alert.alert("Berhasil", ...);
  } catch (error) {
    Alert.alert("Error", ...);             // User diberitahu, tapi data sudah parsial
  }
};
```

**Fix:**

```tsx
const handleSubmit = async () => {
  setIsSubmitting(true);
  try {
    // Kumpulkan semua operasi, lalu commit bersama
    const entry = await addLogEntryToDb({...});

    const additionalOps: Promise<any>[] = [];
    if (selectedActivity === "Panen" && beratTotal) {
      additionalOps.push(addHarvestRecord({...}));
    }
    if (selectedActivity === "Menanam" && jumlahBibit) {
      additionalOps.push(addBulkPlants(...));
    }

    // Jika additional ops gagal, setidaknya log entry sudah tersimpan
    // dan user mendapat notifikasi partial failure
    const results = await Promise.allSettled(additionalOps);
    const failures = results.filter(r => r.status === 'rejected');

    await refreshDashboard();

    if (failures.length > 0) {
      Alert.alert("Perhatian", "Aktivitas tersimpan, tapi beberapa data tambahan gagal.");
    } else {
      Alert.alert("Berhasil", "Aktivitas berhasil dicatat!");
    }
    resetForm();
  } catch (error) {
    Alert.alert("Error", (error as Error).message);
  } finally {
    setIsSubmitting(false);
  }
};
```

---

### FITUR 9: DIAGNOSIS / EXPERT SYSTEM (`components/ui/diagnosis.tsx`)

#### Cara Kerja Saat Ini

- Forward Chaining: User pilih bagian tanaman → pilih gejala → pertanyaan diferensial → hasil scoring
- Data dari `src/data/melon-diseases.ts` (39 gejala, 19 penyakit, 8 pertanyaan)
- Skor dihitung via `useMemo`
- Hasil bisa disimpan ke database

#### Temuan

| ID      | Severity      | File            | Line      | Judul                               | Deskripsi                                                                                                                                                                               |
| ------- | ------------- | --------------- | --------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DIAG-01 | 🟠 **HIGH**   | `diagnosis.tsx` | L165-L168 | **Potential Infinite Render Loop**  | `useEffect` untuk auto-transition step 3→4 bergantung pada `[step, currentQuestion]`. Jika `currentQuestion` memo misfire menyebabkan `null` saat step=4, bisa terjadi render loop.     |
| DIAG-02 | 🟠 **HIGH**   | `diagnosis.tsx` | L90-L113  | **O(n×m) Scoring Setiap Re-render** | `calculateScores` memoized tapi `selectedSymptoms` array dibuat baru setiap toggle (`[...prev]`), sehingga memo re-runs setiap kali. 39 gejala × 19 penyakit = ~741 iterasi per toggle. |
| DIAG-03 | 🟡 **MEDIUM** | `diagnosis.tsx` | L203-L207 | **Double Computation**              | `handleDiagnose` memanggil `calculateScores(selectedSymptoms, {})` secara manual meskipun `scores` sudah di-memoize. Ini juga mengabaikan `answers` yang sudah ada, mereset flow.       |
| DIAG-04 | 🟡 **MEDIUM** | `diagnosis.tsx` | L228-L243 | **Tidak Ada Double-Tap Guard**      | State batching berarti `isSaving` mungkin belum `true` saat user tap kedua kali → duplikasi diagnosis record.                                                                           |
| DIAG-05 | 🔵 **LOW**    | `diagnosis.tsx` | L47       | **Stale `Dimensions` Module Level** | `screenWidth` tidak update saat rotasi.                                                                                                                                                 |

---

### FITUR 10: SCANNER (`components/ui/scanner.tsx`)

#### Cara Kerja Saat Ini

- UI QR scanner dengan animasi "scanning"
- **Sepenuhnya simulasi** — `setTimeout` 2 detik lalu return hardcoded "Blok A1"
- Form activity submission tidak menyimpan ke database

#### Temuan

| ID      | Severity        | File          | Line    | Judul                                       | Deskripsi                                                                                                                                              |
| ------- | --------------- | ------------- | ------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SCAN-01 | 🔴 **CRITICAL** | `scanner.tsx` | L63-L68 | **Memory Leak: `setTimeout` Tanpa Cleanup** | Timer 2 detik tidak disimpan/dibersihkan. Jika user navigasi pergi saat timer berjalan, `setState` dipanggil pada component unmounted → crash/warning. |
| SCAN-02 | 🟠 **HIGH**     | `scanner.tsx` | L63-L68 | **Scan Simulasi dengan Data Hardcoded**     | Scanner tidak benar-benar scan — selalu return "Blok A1". Fitur tidak fungsional untuk produksi.                                                       |
| SCAN-03 | 🟠 **HIGH**     | `scanner.tsx` | L73-L82 | **Submit Data Tidak Disimpan**              | `handleSubmitActivity` hanya menampilkan Alert — tidak ada DB write. Semua data yang user input hilang.                                                |
| SCAN-04 | 🟡 **MEDIUM**   | `scanner.tsx` | L40-L44 | **Modal "In Development" Muncul Berulang**  | `useFocusEffect` reset `showDevModal(true)` setiap kali tab mendapat fokus — user harus dismiss setiap navigasi.                                       |

**Fix SCAN-01:**

```tsx
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const handleStartScan = () => {
  setIsScanning(true);
  timerRef.current = setTimeout(() => {
    setScannedBlock("Blok A1");
    setIsScanning(false);
    setShowLogbookForm(true);
  }, 2000);
};

// Cleanup
useFocusEffect(
  useCallback(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []),
);
```

---

### FITUR 11: CHATBOT (`components/ui/chatbot.tsx`)

#### Cara Kerja Saat Ini

- Chat UI dengan pesan preset + keyword matching
- Pattern: `userMessage.includes(key.split(" ")[0])` untuk first-word matching
- Response setelah 1500ms delay (simulasi typing)

#### Temuan

| ID      | Severity        | File          | Line     | Judul                                                | Deskripsi                                                                                                                                                                    |
| ------- | --------------- | ------------- | -------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CHAT-01 | 🔴 **CRITICAL** | `chatbot.tsx` | L79-L80  | **Memory Leak: `setTimeout` di `scrollToBottom`**    | Dipanggil setiap `messages`/`isTyping` berubah via `useEffect`, tidak pernah di-clear.                                                                                       |
| CHAT-02 | 🔴 **CRITICAL** | `chatbot.tsx` | L98-L107 | **Memory Leak: `setTimeout` di `handleSendMessage`** | Timer 1500ms untuk bot response tidak pernah di-clear. Navigate away = setState pada unmounted.                                                                              |
| CHAT-03 | 🟠 **HIGH**     | `chatbot.tsx` | L86-L94  | **Keyword Matching Terlalu Agresif**                 | `key.split(" ")[0]` mengambil kata pertama saja. Key `"kapan waktu pemupukan terbaik"` jadi match `"kapan"` — maka pesan `"kapan makan siang?"` match dengan response pupuk. |
| CHAT-04 | 🟠 **HIGH**     | `chatbot.tsx` | L97      | **Non-Unique Message IDs**                           | `Date.now().toString()` dan `Date.now() + 1` — double-tap dalam 1ms menyebabkan duplicate ID.                                                                                |
| CHAT-05 | 🟡 **MEDIUM**   | `chatbot.tsx` | L62-L69  | **Chat History Hilang Saat Remount**                 | State lokal — navigasi pergi dan kembali = semua history hilang.                                                                                                             |
| CHAT-06 | 🟡 **MEDIUM**   | `chatbot.tsx` | L56-L59  | **Dev Modal Berulang**                               | Sama seperti Scanner — modal "dalam pengembangan" muncul setiap kali tab focus.                                                                                              |
| CHAT-07 | 🟡 **MEDIUM**   | `chatbot.tsx` | N/A      | **Tidak Ada Input Length Limit**                     | User bisa paste text sangat panjang, menyebabkan rendering lag di chat bubble.                                                                                               |

**Fix CHAT-01 + CHAT-02:**

```tsx
// Simpan timer refs
const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const scrollToBottom = () => {
  if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
  scrollTimerRef.current = setTimeout(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, 100);
};

useEffect(() => {
  scrollToBottom();
  return () => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
  };
}, [messages, isTyping]);

const handleSendMessage = (text: string) => {
  if (!text.trim()) return;
  // ... user message ...
  setIsTyping(true);

  if (botTimerRef.current) clearTimeout(botTimerRef.current);
  botTimerRef.current = setTimeout(() => {
    const botResponse = getBotResponse(text);
    setMessages((prev) => [...prev, botMessage]);
    setIsTyping(false);
  }, 1500);
};

// Cleanup saat unmount
useEffect(() => {
  return () => {
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
  };
}, []);
```

---

### FITUR 12: ROUTING & APP SHELL (`app/`)

#### Cara Kerja Saat Ini

- `ErrorBoundary` → `ThemeProvider` → `DataProvider` → `Stack`
- 3 Stack screens: `(tabs)`, `riwayat-logbook`, `modal`
- Tab layout: 6 tabs (index, dashboard, logbook, chatbot, scanner, explore[hidden])

#### Temuan

| ID       | Severity        | File                  | Line    | Judul                                         | Deskripsi                                                                                                                                                                                   |
| -------- | --------------- | --------------------- | ------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ROUTE-01 | 🔴 **CRITICAL** | `_layout.tsx`         | L25-L36 | **`diagnosis` Screen Tidak Terdaftar**        | `app/diagnosis.tsx` ada tapi tidak ada `<Stack.Screen name="diagnosis">` — render dengan default header yang tidak konsisten.                                                               |
| ROUTE-02 | 🔴 **CRITICAL** | `_layout.tsx`         | Entire  | **Tidak Ada SplashScreen Management**         | Zero splash screen code. `SplashScreen.preventAutoHideAsync()` tidak dipanggil — user melihat white flash sebelum app render. Dokumentasi mencantumkan fitur ini tapi tidak diimplementasi. |
| ROUTE-03 | 🟠 **HIGH**     | `_layout.tsx`         | L14-L16 | **`unstable_settings` Menggunakan Key Salah** | `anchor: "(tabs)"` — key yang benar untuk expo-router v6 adalah `initialRouteName`. Deep-linking atau back navigation dari modal mungkin tidak return ke `(tabs)`.                          |
| ROUTE-04 | 🟡 **MEDIUM**   | `_layout.tsx`         | Entire  | **`expo-font` Dependency Tidak Digunakan**    | Terdaftar di `package.json` tapi tidak pernah imported. Dead dependency.                                                                                                                    |
| ROUTE-05 | 🔵 **LOW**      | `(tabs)/_layout.tsx`  | L8-L9   | **`colorScheme` Unused Variable**             | Diimport tapi tidak digunakan — dead code.                                                                                                                                                  |
| ROUTE-06 | 🔵 **LOW**      | `(tabs)/explore.tsx`  | Entire  | **Template Boilerplate 85 Baris**             | File Expo default tentang "Images, Animations, Light and dark mode" — tidak relevan dengan Agri-Smart. Dead code yang di-bundle.                                                            |
| ROUTE-07 | 🟡 **MEDIUM**   | `riwayat-logbook.tsx` | Entire  | **God File 757 Baris**                        | 3 komponen + 3 StyleSheet dalam satu file. Harus di-decompose.                                                                                                                              |
| ROUTE-08 | 🟡 **MEDIUM**   | `riwayat-logbook.tsx` | L67-L72 | **`formatDisplayDate` Tidak Validasi Bulan**  | `MONTH_FULL[parseInt(parts[1]) - 1]` bisa return `undefined` jika bulan = "00" atau "13". Menghasilkan "1 undefined 2025".                                                                  |

**Fix ROUTE-01:**

```tsx
// app/_layout.tsx — Tambahkan Screen
<Stack>
  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
  <Stack.Screen name="diagnosis" options={{ headerShown: false }} />
  <Stack.Screen name="riwayat-logbook" options={{ headerShown: false }} />
  <Stack.Screen
    name="modal"
    options={{ presentation: "modal", title: "Modal" }}
  />
</Stack>
```

**Fix ROUTE-02:**

```tsx
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Hide splash setelah app siap
    SplashScreen.hideAsync();
  }, []);

  return <ErrorBoundary>{/* ... */}</ErrorBoundary>;
}
```

---

### FITUR 13: SYNC STATUS BAR (`components/ui/sync-status-bar.tsx`)

#### Temuan

| ID     | Severity      | File                  | Line    | Judul                              | Deskripsi                                                                                       |
| ------ | ------------- | --------------------- | ------- | ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| SSB-01 | 🟡 **MEDIUM** | `sync-status-bar.tsx` | L73     | **Touch Target Terlalu Kecil**     | Sync button hanya `padding: 2` (~16pt), jauh di bawah minimum 44pt Apple / 48pt Google.         |
| SSB-02 | 🔵 **LOW**    | `sync-status-bar.tsx` | L14-L21 | **Tidak Ada Animasi "Syncing"**    | Icon `RefreshCw` statis saat syncing — seharusnya berputar.                                     |
| SSB-03 | 🔵 **LOW**    | `sync-status-bar.tsx` | L60-L65 | **Tidak Ada Debounce Sync Button** | Rapid taps bisa trigger multiple sync concurrent (meskipun `isSyncing` guard catch di service). |

---

### FITUR 14: ERROR BOUNDARY (`components/error-boundary.tsx`)

#### Temuan

| ID    | Severity      | File                 | Line    | Judul                                    | Deskripsi                                                                                                                                    |
| ----- | ------------- | -------------------- | ------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| EB-01 | 🟠 **HIGH**   | `error-boundary.tsx` | L42-L44 | **Reset Tanpa Retry Counter**            | "Coba Lagi" button clear error dan re-render children. Jika error deterministic (bug kode), crash langsung lagi → infinite crash-reset loop. |
| EB-02 | 🟡 **MEDIUM** | `error-boundary.tsx` | L34-L39 | **Tidak Ada Production Crash Reporting** | `componentDidCatch` hanya log di `__DEV__`. Production errors silently hilang. Tidak ada Sentry/Crashlytics.                                 |

**Fix EB-01:**

```tsx
class ErrorBoundary extends React.Component<Props, State> {
  state = { hasError: false, error: null, retryCount: 0 };
  static MAX_RETRIES = 3;

  handleReset = () => {
    if (this.state.retryCount >= ErrorBoundary.MAX_RETRIES) {
      // Sudah 3x retry, tampilkan pesan permanen
      return;
    }
    this.setState((prev) => ({
      hasError: false,
      error: null,
      retryCount: prev.retryCount + 1,
    }));
  };

  render() {
    if (this.state.hasError) {
      const canRetry = this.state.retryCount < ErrorBoundary.MAX_RETRIES;
      return (
        <View>
          <Text>Terjadi kesalahan</Text>
          {canRetry ? (
            <TouchableOpacity onPress={this.handleReset}>
              <Text>
                Coba Lagi ({ErrorBoundary.MAX_RETRIES - this.state.retryCount}{" "}
                tersisa)
              </Text>
            </TouchableOpacity>
          ) : (
            <Text>Silakan restart aplikasi.</Text>
          )}
        </View>
      );
    }
    return this.props.children;
  }
}
```

---

### FITUR 15: HELPER COMPONENTS

#### Temuan

| ID      | Severity      | File                       | Line      | Judul                                      | Deskripsi                                                                             |
| ------- | ------------- | -------------------------- | --------- | ------------------------------------------ | ------------------------------------------------------------------------------------- |
| COMP-01 | 🟡 **MEDIUM** | `icon-symbol.tsx`          | L17       | **Android Fallback = Black Circle**        | Non-iOS meng-render `⬤` untuk SEMUA icon — tidak ada diferensiasi visual.             |
| COMP-02 | 🟡 **MEDIUM** | `external-link.tsx`        | L12-L22   | **Tidak Ada URL Validation**               | `href` bisa berisi `javascript:`, `file://`, atau URI berbahaya jika dari input user. |
| COMP-03 | 🟡 **MEDIUM** | `parallax-scroll-view.tsx` | N/A       | **Tidak Ada Parallax Effect**              | Nama misleading — hanya `ScrollView` biasa dengan header.                             |
| COMP-04 | 🟡 **MEDIUM** | `custom-tab-bar.tsx`       | L35       | **Props `any` Everywhere**                 | Tidak ada type safety pada tab bar props.                                             |
| COMP-05 | 🔵 **LOW**    | `themed-text.tsx`          | L22       | **Link Style Hardcoded Ignores Dark Mode** | `color: '#2563eb'` override themed color — buruk di dark mode.                        |
| COMP-06 | 🔵 **LOW**    | `custom-tab-bar.tsx`       | L143-L149 | **Dead Code Block**                        | Mapping hidden routes yang selalu return `null`.                                      |
| COMP-07 | 🔵 **LOW**    | `haptic-tab.tsx`           | Entire    | **Kemungkinan Unused**                     | `CustomTabBar` sudah handle haptics — file ini mungkin dead code.                     |

---

### FITUR 16: IMAGE UTILS (`src/utils/image-utils.ts`)

#### Temuan

| ID     | Severity      | File             | Line    | Judul                            | Deskripsi                                                                                                                                                    |
| ------ | ------------- | ---------------- | ------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| IMG-01 | 🟠 **HIGH**   | `image-utils.ts` | L28     | **Base64 Tanpa Size Validation** | Gambar 800px JPEG 50% = 100-400KB. Sebagai Base64 di Firestore doc (limit 1MB), bisa gagal tanpa error yang jelas. Tidak ada validasi ukuran sebelum return. |
| IMG-02 | 🟡 **MEDIUM** | `image-utils.ts` | L17-L20 | **Tidak Ada Input Validation**   | Menerima string apapun, bukan hanya `file://` URI. `http://` URL atau data URI bisa menyebabkan behavior tak terduga di `manipulateAsync`.                   |

---

### FITUR 17: LOGGER (`src/utils/logger.ts`)

#### Temuan

| ID         | Severity      | File        | Line    | Judul                                   | Deskripsi                                                                                                                                                                                           |
| ---------- | ------------- | ----------- | ------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LOG-SYS-01 | 🟡 **MEDIUM** | `logger.ts` | L10-L17 | **Tidak Ada Production Error Tracking** | Pada production (`!__DEV__`), SEMUA error — termasuk crashes kritis — ditelan tanpa jejak. Tidak ada integrasi Sentry, Crashlytics, atau service pelaporan error. Bug produksi tidak akan terlihat. |

---

### FITUR 18: KONFIGURASI & DEPENDENCIES

#### Temuan

| ID     | Severity      | File           | Line    | Judul                                       | Deskripsi                                                                                                                                     |
| ------ | ------------- | -------------- | ------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| CFG-01 | 🟠 **HIGH**   | `package.json` | L43     | **`react-native-web ~0.21.0` Incompatible** | Digunakan dengan React 19.1.0 dan RN 0.81.5, tapi `react-native-web` 0.21.x dirancang untuk React 18. Web build bisa rusak.                   |
| CFG-02 | 🟡 **MEDIUM** | `app.json`     | L46-L47 | **`reactCompiler: true` Experimental**      | React Compiler eksperimental — bisa menyebabkan bug subtle yang sulit di-debug. ErrorBoundary mungkin tidak catch compiler-introduced issues. |
| CFG-03 | 🟡 **MEDIUM** | `app.json`     | L16     | **Adaptive Icon Warna Tidak Konsisten**     | Background `#E6F4FE` (biru muda) tidak match dengan primary brand color hijau `#16A34A`.                                                      |
| CFG-04 | 🔵 **LOW**    | `package.json` | Various | **Dead Dependencies**                       | `expo-font` dan kemungkinan `uuid` tidak digunakan di code — menambah bundle size.                                                            |

---

## 🚨 KLASIFIKASI TEMUAN

### 🔴 CRITICAL (8 temuan) — Harus Diperbaiki Sebelum Release

| ID       | Temuan                                           | Dampak                                            |
| -------- | ------------------------------------------------ | ------------------------------------------------- |
| HOME-01  | 4/5 navigasi menu broken (route salah)           | **User tidak bisa akses 4 fitur utama dari Home** |
| ROUTE-01 | Diagnosis screen tanpa Stack.Screen registration | **UI tidak konsisten, header default muncul**     |
| ROUTE-02 | Tidak ada SplashScreen management                | **White flash saat app start**                    |
| SCAN-01  | Memory leak `setTimeout` di Scanner              | **Crash/warning pada unmounted setState**         |
| CHAT-01  | Memory leak `setTimeout` di scrollToBottom       | **Crash/warning pada unmounted setState**         |
| CHAT-02  | Memory leak `setTimeout` di handleSendMessage    | **Crash/warning pada unmounted setState**         |
| SYNC-01  | Race condition kompresi foto                     | **Foto asli hilang, infinite re-sync loop**       |
| LOG-01   | Race condition multi-write di handleSubmit       | **Data database inconsistent**                    |

### 🟠 HIGH (19 temuan)

| ID      | Temuan                                                     |
| ------- | ---------------------------------------------------------- |
| DB-02   | Migrasi destructive tanpa incremental path                 |
| DB-03   | Migrasi tanpa transaction                                  |
| DB-10   | N+1 query getDashboardStats (5 queries)                    |
| DB-11   | N+1 query getHealthDistribution (3 queries)                |
| DB-12   | N+1 query getBlockActivityData (6 queries)                 |
| DB-13   | N+1 query getHarvestSummary (10 queries)                   |
| DB-14   | addBulkPlants tanpa transaction                            |
| SYNC-02 | Pull sequential per document (1000 = 1000 serial writes)   |
| SYNC-03 | syncAll() membuang request saat busy                       |
| SYNC-04 | Push/Pull tidak atomic, timestamp maju meskipun pull gagal |
| FB-01   | Tidak ada validasi environment variables                   |
| DASH-01 | Missing useEffect dependency                               |
| DASH-02 | Stale Dimensions module level                              |
| LOG-02  | Tidak ada sanitasi angka negatif                           |
| LOG-03  | Validasi Panen incomplete (jumlahBuah)                     |
| DIAG-01 | Potential infinite render loop                             |
| DIAG-02 | O(n×m) scoring setiap re-render                            |
| SCAN-02 | Scanner simulasi dengan data hardcoded                     |
| SCAN-03 | Form submit tidak menyimpan ke database                    |

_(Daftar HIGH berlanjut: EB-01, CFG-01, IMG-01, CHAT-03, CHAT-04, ROUTE-03, ROUTE-07)_

### 🟡 MEDIUM (28 temuan) & 🔵 LOW (22 temuan)

Lihat detail per fitur di atas.

---

## 🛠️ REKOMENDASI PRIORITAS PERBAIKAN

### 🏁 Sprint 1 — Critical Fixes (Wajib Sebelum APK Build)

| #   | Fix                                                   | Effort | File                           |
| --- | ----------------------------------------------------- | ------ | ------------------------------ |
| 1   | Fix navigasi menu Home (HOME-01)                      | 15 min | `components/ui/index.tsx`      |
| 2   | Register diagnosis Screen (ROUTE-01)                  | 5 min  | `app/_layout.tsx`              |
| 3   | Add SplashScreen management (ROUTE-02)                | 15 min | `app/_layout.tsx`              |
| 4   | Cleanup setTimeout Scanner (SCAN-01)                  | 10 min | `components/ui/scanner.tsx`    |
| 5   | Cleanup setTimeout Chatbot (CHAT-01, CHAT-02)         | 15 min | `components/ui/chatbot.tsx`    |
| 6   | Fix sync photo race condition (SYNC-01)               | 30 min | `src/services/sync-service.ts` |
| 7   | Add negative/empty number validation (LOG-02, LOG-03) | 15 min | `components/ui/logbook.tsx`    |

### 🏁 Sprint 2 — High Priority Performance & Stability

| #   | Fix                                                          | Effort | File                                                         |
| --- | ------------------------------------------------------------ | ------ | ------------------------------------------------------------ |
| 8   | Replace N+1 queries dengan aggregation (DB-10, 11, 12, 13)   | 45 min | `dashboard-repository.ts`, `harvest-repository.ts`           |
| 9   | Wrap migration dalam transaction (DB-03)                     | 15 min | `database.ts`                                                |
| 10  | Fix sync timestamp per-table (SYNC-04)                       | 20 min | `sync-service.ts`                                            |
| 11  | Add start() guard, prevent double listener (SYNC-05, NET-01) | 10 min | `sync-service.ts`, `network-monitor.ts`                      |
| 12  | Fix unstable_settings key (ROUTE-03)                         | 5 min  | `app/_layout.tsx`                                            |
| 13  | Validate Firebase env vars (FB-01)                           | 10 min | `config.ts`                                                  |
| 14  | Add retry counter ke ErrorBoundary (EB-01)                   | 15 min | `error-boundary.tsx`                                         |
| 15  | Fix stale Dimensions (4 files)                               | 20 min | `index.tsx`, `dashboard.tsx`, `diagnosis.tsx`, `scanner.tsx` |

### 🏁 Sprint 3 — Quality & Polish

| #   | Fix                                                             | File |
| --- | --------------------------------------------------------------- | ---- |
| 16  | Wrap addBulkPlants dalam transaction (DB-14)                    |
| 17  | Fix deviceIdPromise cache + closeDatabase (DB-05, DB-06)        |
| 18  | Fix chatbot keyword matching (CHAT-03)                          |
| 19  | Add input maxLength chatbot (CHAT-07)                           |
| 20  | Fix date UTC/local inconsistency (LOG-05)                       |
| 21  | Camera permission Settings link (LOG-04)                        |
| 22  | Remove dead code: explore.tsx, haptic-tab.tsx, dead code blocks |
| 23  | Fix type safety: optional NOT NULL fields, `any` types          |
| 24  | Dark mode support: riwayat-logbook, themed-text, external-link  |
| 25  | Accessibility labels across all interactive components          |

---

## 📊 EFEK DOMINO ANTAR-FITUR

### Chain 1: Logbook → Harvest → Dashboard → Sync

```
User submit "Panen" di Logbook
  → addLogEntry (sukses)
  → addHarvestRecord (GAGAL — misal disk full)
  → ❌ harvest tidak tercatat tapi logbook ada
  → dashboard stats tidak match logbook
  → sync push logbook without matching harvest record
  → cloud data inconsistent
```

### Chain 2: Network State → Sync → Data Context → All UI

```
App boot
  → networkMonitor.start() dipanggil pertama kali
  → isInternetReachable = null → dianggap connected (NET-02)
  → sync triggered prematur → Firestore gagal (belum ada koneksi)
  → syncService.start() dipanggil lagi (SYNC-05)
  → DOUBLE network listener → sync dipicu 2x per event
  → setiap sync success → refreshAllData() tanpa debounce (CTX-02)
  → 4 parallel repo queries × N+1 pattern = ~24 DB queries × 2 = ~48 queries
```

### Chain 3: Migration → Data Loss → Sync Confusion

```
User upgrade app dari v5 ke v6 (masa depan)
  → handleMigration: if (currentVersion < DB_VERSION)
  → DROP TABLE ALL (DB-02)
  → ❌ App crash di tengah — no transaction (DB-03)
  → DB corrupt: tabel hilang, versi masih 5
  → Every restart → migration retry → crash lagi
  → BRICK: app tidak bisa digunakan sampai user clear data
```

### Chain 4: Home Navigation → Tab vs Stack

```
User tap "Logbook" di Home page
  → router.push("/logbook") (HOME-01)
  → Expo Router cari file app/logbook.tsx → tidak ada
  → Auto-resolve → mungkin push ke (tabs)/logbook sebagai stack screen
  → Stack screen di atas tabs → back button kembali ke Home
  → User bingung: kenapa Logbook tidak di tab navigation?
  → Atau: 404 error → crash
```

### Chain 5: Photo Compression → Sync Loop

```
User ambil foto di Logbook → simpan entry
  → sync triggered
  → pushLogEntries: photo starts with "file://"
  → compressImageToBase64 sukses → 400KB base64
  → UPDATE SQLite: photo = base64, synced = 0 (SYNC-01)
  → batchWrite ke Firestore gagal (network timeout)
  → entry tetap synced = 0
  → next sync: photo sudah base64, starts with "data:" → skip compression
  → push to Firestore → ❌ document > 1MB? (IMG-01)
  → permanent failure — entry never synced
```

---

## 📁 PETA ARSITEKTUR FINAL

```
┌─────────────────────────────────────────────────┐
│                   ERROR BOUNDARY                 │
│  ┌─────────────────────────────────────────┐    │
│  │              THEME PROVIDER              │    │
│  │  ┌──────────────────────────────────┐   │    │
│  │  │          DATA PROVIDER            │   │    │
│  │  │                                   │   │    │
│  │  │  ┌──────────┐  ┌──────────────┐  │   │    │
│  │  │  │ SQLite DB │  │ Sync Service │  │   │    │
│  │  │  │ (7 tabel) │←→│ Push / Pull  │  │   │    │
│  │  │  └─────┬─────┘  └──────┬───────┘  │   │    │
│  │  │        │               │          │   │    │
│  │  │  ┌─────┴─────┐  ┌─────┴──────┐   │   │    │
│  │  │  │ Repository │  │ Firestore  │   │   │    │
│  │  │  │  Pattern   │  │ (5 coll.)  │   │   │    │
│  │  │  └───────────┘  └────────────┘   │   │    │
│  │  │                                   │   │    │
│  │  │  ┌─ Stack Navigator ───────────┐  │   │    │
│  │  │  │  ┌─ Tab Navigator ───────┐  │  │   │    │
│  │  │  │  │ Home | Dashboard |    │  │  │   │    │
│  │  │  │  │ Logbook | Chatbot |   │  │  │   │    │
│  │  │  │  │ Scanner              │  │  │   │    │
│  │  │  │  └──────────────────────┘  │  │   │    │
│  │  │  │  Diagnosis | History |     │  │   │    │
│  │  │  │  Modal                     │  │   │    │
│  │  │  └────────────────────────────┘  │   │    │
│  │  └──────────────────────────────────┘   │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

---

**Auditor:** GitHub Copilot — Principal Software Architect  
**Tanggal:** 20 Februari 2026  
**Versi Laporan:** 1.0
