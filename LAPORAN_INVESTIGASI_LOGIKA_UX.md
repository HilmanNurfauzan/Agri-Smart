# 🔍 Laporan Investigasi Logika & UX — Agri-Smart

**Auditor:** Lead QA Automation Engineer, UX Researcher, & Security Auditor  
**Tanggal:** 20 Februari 2026  
**Metode:** Manual Code Tracing & Worst-Case Scenario Simulation  
**Scope:** 4 Modul Inti — Device ID, Logbook+Base64, Sistem Pakar, SyncService

---

## 1. Modul "Device ID" & Arsitektur Multi-Device

### 🟢 STATUS LOGIKA: Ada Celah (1 Kritis, 1 Minor)

### 🔴 SKENARIO BOCOR

**VULN-01: Orphaned Data setelah Clear Cache/Data (KRITIS)**

**Alur:**
1. User menggunakan aplikasi → `getDeviceId()` membuat ID `abc123`, disimpan di `app_config`
2. User mencatat 50 logbook, 10 panen → semua tersimpan dengan `device_id = 'abc123'`
3. User melakukan "Clear App Data" di pengaturan HP (atau reinstall)
4. `app_config` terhapus → `cachedDeviceId` di memori juga hilang (app restart)
5. `getDeviceId()` tidak menemukan row → membuat ID baru `xyz789`
6. **DAMPAK:** Semua 50 logbook & 10 panen dengan `device_id = 'abc123'` menjadi TIDAK TERLIHAT di "Local View" karena filtering `WHERE device_id = ?` sekarang menggunakan `'xyz789'`
7. Data lama tetap ada di SQLite dan Firestore, tapi user melihat layar kosong

**Bukti kode** (`database.ts` baris 260–280):
```typescript
export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;
  const row = await database.getFirstAsync<{ value: string }>(...);
  if (row?.value) { ... return; }
  // ← Jika tidak ada, buat baru — data lama YATIM PIATU
  const newId = Date.now().toString(36) + Math.random()...;
}
```

**VULN-02: Race Condition pada Inisialisasi Ganda `getDeviceId()` (MINOR)**

**Alur:**
1. Saat app startup, `data-context.tsx` memanggil `getDatabase()` → `setIsReady(true)` → `refreshAllData()`
2. `refreshAllData()` memicu 4 refresh paralel (`refreshLogEntries`, `refreshDiagnosis`, dll.)
3. Masing-masing repository memanggil `getDeviceId()` secara bersamaan
4. Karena `cachedDeviceId` masih `null`, semua panggilan lolos check `if (cachedDeviceId)`
5. Semua memanggil `getFirstAsync` secara paralel → semua mendapat `null`
6. Dua+ panggilan membuat ID baru berbeda → `INSERT OR REPLACE` saling menimpa
7. **DAMPAK:** Beberapa record awal bisa tercatat dengan device_id yang berbeda dari yang akhirnya tersimpan

### 🔵 REKOMENDASI PERBAIKAN

**Untuk VULN-01 (Orphaned Data):**
```typescript
// database.ts — tambahkan promise caching pada getDeviceId, 
// sama seperti pola getDatabase()
let deviceIdPromise: Promise<string> | null = null;

export function getDeviceId(): Promise<string> {
  if (!deviceIdPromise) {
    deviceIdPromise = (async () => {
      const database = await getDatabase();
      const row = await database.getFirstAsync<{ value: string }>(
        "SELECT value FROM app_config WHERE key = 'device_id'"
      );
      if (row?.value) return row.value;

      const newId = Date.now().toString(36) + Math.random().toString(36).substring(2);
      await database.runAsync(
        "INSERT OR REPLACE INTO app_config (key, value) VALUES ('device_id', ?)",
        [newId]
      );
      console.log(`[DB] Device ID baru dibuat: ${newId}`);
      return newId;
    })();
  }
  return deviceIdPromise;
}
```
> **Efek:** Ini memperbaiki VULN-02 (race condition) sekaligus. Semua panggilan paralel mendapat promise yang sama.

**Untuk VULN-01 (data recovery):**
Tambahkan opsi "Pulihkan Device ID" di pengaturan, atau simpan device_id di `expo-secure-store` sebagai backup:
```typescript
import * as SecureStore from 'expo-secure-store';

// Saat membuat device ID baru, simpan juga di SecureStore:
await SecureStore.setItemAsync('agri_device_id', newId);

// Saat inisialisasi, cek SecureStore dulu sebelum buat baru:
const backupId = await SecureStore.getItemAsync('agri_device_id');
if (backupId) { /* gunakan backupId, simpan ke app_config */ }
```

---

## 2. Modul "Logbook" & "Base64 Image Sync"

### 🟢 STATUS LOGIKA: Aman (dengan 1 Advisory)

### 🔴 SKENARIO BOCOR

**SKENARIO A: File Non-Gambar — AMAN ✅**

**Alur penelusuran:**
1. `handlePhotoUpload()` di `logbook.tsx` baris 285 menggunakan `ImagePicker.launchCameraAsync()`
2. Parameter `mediaTypes: ImagePicker.MediaTypeOptions.Images` **membatasi input ke gambar saja**
3. User tidak bisa memilih PDF/video dari kamera
4. Bahkan jika URI invalid masuk ke `compressImageToBase64()`, fungsi tersebut memiliki `try/catch` yang mengembalikan `null`
5. Di `sync-service.ts`, jika hasilnya `null` → `continue` (entry dilewati, bukan crash)

**Kesimpulan:** Tidak ada jalur untuk file non-gambar masuk ke pipeline. Aman.

**SKENARIO B: Double Submit — AMAN ✅**

**Alur penelusuran:**
1. `isSubmitting` di-set `true` di awal `handleSubmit()` (baris 367)
2. Tombol "Simpan Data" memiliki `disabled={isSubmitting}` (baris 804)
3. Di blok `finally`, `isSubmitting` direset ke `false` (baris 420)

**Kesimpulan:** Proteksi double-submit sudah terpasang dengan benar.

**ADVISORY-01: Base64 Writeback Membuat `synced = 0` Sementara (INFORMASIONAL)**

**Alur:**
1. `pushLogEntries()` mengompresi foto file:// → base64
2. UPDATE SQLite: `SET photo = base64, synced = 0` ← ini benar sebagai marker bahwa data berubah
3. Entry di-push ke Firestore
4. `markLogEntrySynced(id)` → `synced = 1`

**Skenario edge case:** Jika app crash TEPAT antara langkah 2 dan 4, entry memiliki `photo = base64, synced = 0`. Pada sync berikutnya, foto sudah base64 (bukan file://), jadi kompresi dilewati → langsung push. **Tidak ada data loss.** ✅

---

## 3. Modul "Sistem Pakar (Diagnosis Penyakit Melon)"

### 🟢 STATUS LOGIKA: Ada Celah (1 Minor UX, 1 Edge Case)

### 🔴 SKENARIO BOCOR

**SKENARIO A: User Tidak Memilih Gejala di Step 2 — AMAN ✅**

**Bukti:**
- Tombol "Diagnosis Sekarang" memiliki `disabled={selectedSymptoms.length === 0}` (baris 498)
- `calculateScores()` juga mengembalikan `[]` jika `selectedSymptoms.length === 0` (baris 91)
- Tidak ada jalur untuk memaksa ke Step 3/4 tanpa gejala

**SKENARIO B: Back dari Step 3 → Step 2, Reset Skor — AMAN ✅**

**Bukti:**
- `handleBack()` di Step 3 memanggil `setAnswers({})` (baris 268)
- `scores` adalah `useMemo` dengan dependency `[selectedSymptoms, answers]` (baris 183)
- Saat `answers` menjadi `{}`, skor dihitung ulang TANPA adjustment → kembali ke base score murni
- **Tidak ada akumulasi skor ganda**

**VULN-03: Tie-Breaking Tidak Deterministik (EDGE CASE)**

**Alur:**
1. User memilih 2 gejala yang ada di penyakit A dan B dengan proporsi yang identik
2. `calculateScores()` menghasilkan `[{diseaseId: 'A', score: 50}, {diseaseId: 'B', score: 50}]`
3. `scored.sort((a, b) => b.score - a.score)` — sort comparator HANYA membandingkan `score`
4. Saat score sama (seri), `Array.sort()` mempertahankan urutan asli (stable sort di V8/Hermes)
5. Artinya penyakit yang muncul LEBIH AWAL di `diseasesData[]` array akan selalu "menang"

**Dampak:** Ini bukan bug crash, tapi penyakit yang menempati indeks awal di knowledge base memiliki keuntungan tidak adil. User mungkin mendapat diagnosis yang kurang akurat pada kasus ambiguitas tinggi.

**VULN-04: Save Button Tidak Memiliki Loading Guard (MINOR UX)**

**Bukti** (`diagnosis.tsx` baris 826-828):
```tsx
<TouchableOpacity
  onPress={handleSave}
  disabled={isSaved}  // ← hanya disabled setelah BERHASIL simpan
```

**Alur:**
1. User tekan "Simpan ke Riwayat"
2. `handleSave()` berjalan (async) — melakukan `await addDiagnosisRecord(...)`
3. Selama menunggu, `isSaved` masih `false` → tombol masih aktif
4. User tekan lagi → record tersimpan GANDA

**Dampak:** Duplikasi record diagnosis di database.

### 🔵 REKOMENDASI PERBAIKAN

**Untuk VULN-03 (Tie-Breaking):**
```typescript
// Tambahkan secondary sort by matchCount (descending)
return scored.sort((a, b) => {
  if (b.score !== a.score) return b.score - a.score;
  return b.matchCount - a.matchCount; // penyakit dengan lebih banyak gejala cocok menang
});
```

**Untuk VULN-04 (Double Save):**
```typescript
const [isSaving, setIsSaving] = useState(false);

const handleSave = async () => {
  if (!topDisease || scores.length === 0 || isSaving) return;
  setIsSaving(true);
  try {
    await addDiagnosisRecord({ ... });
    setIsSaved(true);
    Alert.alert("Berhasil", "Hasil diagnosis telah disimpan.");
  } catch (error) { ... }
  finally { setIsSaving(false); }
};

// Di render:
<TouchableOpacity disabled={isSaved || isSaving} ...>
```

---

## 4. Modul "Sinkronisasi (SyncService)"

### 🟢 STATUS LOGIKA: Aman

### 🔴 SKENARIO BOCOR

**SKENARIO: Kehilangan Sinyal Saat `pushLogEntries` Loop — AMAN ✅**

**Alur detail:**

**Fase 1 — Kompresi Base64 (OFFLINE-SAFE):**
1. `for (const entry of unsynced)` iterasi satu-per-satu
2. `compressImageToBase64()` menggunakan `expo-image-manipulator` → operasi LOKAL, tidak butuh internet
3. Base64 disimpan ke SQLite → operasi LOKAL
4. **Jika internet hilang di sini:** Kompresi tetap selesai, data aman di SQLite

**Fase 2 — Batch Write ke Firestore:**
5. `batchWrite("log_entries", items)` memecah items per 499
6. `batch.commit()` mengirim ke Firestore
7. **Jika internet hilang di sini:** `try/catch` menangkap error
8. `successIds` hanya berisi ID dari batch yang BERHASIL commit
9. Entry yang gagal TIDAK masuk `successIds` → `markLogEntrySynced()` TIDAK dipanggil → tetap `synced = 0`

**Fase 3 — Recovery di Sync Berikutnya:**
10. Flag `isSyncing` di-reset di `finally` block → sync bisa jalan lagi
11. Entry gagal masih `synced = 0` → tertangkap oleh `getUnsyncedLogEntries()` → di-push ulang
12. Foto sudah base64 (bukan file://) → skip kompresi → langsung push

**Kesimpulan:** Mekanisme retry sudah robust. Tidak ada data loss, tidak ada infinite loop, tidak ada corruption.

**SKENARIO EDGE: Batch Parsial (1 dari N Batch Gagal) — AMAN ✅**

Jika ada 1000 entries (3 batch: 499+499+2):
- Batch 1 commit ✅ → 499 entries ditandai `synced = 1`
- Batch 2 commit ❌ (network loss) → 499 entries tetap `synced = 0`
- Batch 3 tidak dieksekusi (loop dilanjutkan tapi commit gagal juga)
- Pada sync berikutnya: hanya 501 entry tersisa yang perlu di-push
- **Progress tidak hilang** ✅

---

## 📊 Ringkasan Temuan

| ID | Modul | Severity | Deskripsi | Status |
|---|---|:---:|---|:---:|
| VULN-01 | Device ID | 🔴 HIGH | Orphaned data setelah clear cache — data lama tidak terlihat | Celah |
| VULN-02 | Device ID | 🟡 LOW | Race condition pada inisialisasi paralel `getDeviceId()` | Celah |
| VULN-03 | Diagnosis | 🟡 LOW | Tie-breaking seri tidak deterministik (sort by score saja) | Celah |
| VULN-04 | Diagnosis | 🟡 MEDIUM | Save button tidak memiliki loading guard → double save | Celah |
| — | Logbook | 🟢 SAFE | Double submit sudah diproteksi `isSubmitting` | Aman |
| — | Logbook | 🟢 SAFE | Non-image file dicegah oleh `ImagePicker.MediaTypeOptions.Images` | Aman |
| — | Logbook | 🟢 SAFE | Base64 writeback flow sudah benar dan idempotent | Aman |
| — | SyncService | 🟢 SAFE | Network loss mid-push ditangani gracefully, retry otomatis | Aman |
| — | Diagnosis | 🟢 SAFE | Empty symptoms + Back reset sudah benar | Aman |

**Prioritas Perbaikan:**
1. 🔴 VULN-01 + VULN-02: Refactor `getDeviceId()` ke promise caching (1 perubahan = 2 fix)
2. 🟡 VULN-04: Tambah `isSaving` state di diagnosis save button
3. 🟡 VULN-03: Tambah secondary sort key `matchCount` (opsional, nice-to-have)
