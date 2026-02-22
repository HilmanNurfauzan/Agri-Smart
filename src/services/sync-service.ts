import {
  collection,
  doc,
  Firestore,
  getDocs,
  query,
  writeBatch,
} from "firebase/firestore";
import {
  getUnsyncedAlerts,
  getUnsyncedPlants,
  markAlertSynced,
  markPlantSynced,
  reconcileAlerts,
  reconcilePlants,
  upsertAlertFromCloud,
  upsertPlantFromCloud,
} from "../database/dashboard-repository";
import { getDatabase } from "../database/database";
import {
  getUnsyncedDiagnosisRecords,
  markDiagnosisRecordSynced,
  reconcileDiagnosisRecords,
  upsertDiagnosisRecordFromCloud,
} from "../database/diagnosis-repository";
import {
  getUnsyncedHarvestRecords,
  markHarvestRecordSynced,
  reconcileHarvestRecords,
  upsertHarvestRecordFromCloud,
} from "../database/harvest-repository";
import {
  getUnsyncedLogEntries,
  markLogEntrySynced,
  reconcileLogEntries,
  upsertLogEntryFromCloud,
} from "../database/logbook-repository";
import { firestore as _firestore } from "../firebase/config";
import { compressImageToBase64 } from "../utils/image-utils";
import { logger } from "../utils/logger";
import { networkMonitor } from "./network-monitor";

const firestore: Firestore = _firestore;

type SyncStatus = "idle" | "syncing" | "success" | "error";
type SyncStatusListener = (status: SyncStatus, message?: string) => void;

class SyncService {
  private isSyncing = false;
  private statusListeners: Set<SyncStatusListener> = new Set();
  private networkUnsubscribe: (() => void) | null = null;

  /**
   * Start listening for network changes and auto-sync when online
   */
  start() {
    networkMonitor.start();
    this.networkUnsubscribe = networkMonitor.addListener(
      async (isConnected) => {
        if (isConnected) {
          logger.log("[Sync] Network available - starting sync...");
          await this.syncAll();
        }
      },
    );

    // Also do an initial check
    networkMonitor
      .checkConnection()
      .then((isConnected) => {
        if (isConnected) {
          return this.syncAll();
        }
      })
      .catch((error) => {
        logger.error("[Sync] Initial connection check failed:", error);
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

  /**
   * Sync all tables: push local changes to Firebase, pull cloud changes
   * Uses parallel execution and batch writes for speed
   */
  async syncAll(): Promise<void> {
    if (this.isSyncing) {
      logger.log("[Sync] Already syncing, skipping...");
      return;
    }

    if (!networkMonitor.isConnected) {
      logger.log("[Sync] No network, skipping...");
      return;
    }

    this.isSyncing = true;
    this.notifyStatus("syncing");

    try {
      // PULL first: Firebase is the source of truth
      // Full reconciliation — soft-delete local records not in cloud
      await Promise.all([
        this.pullLogEntries(),
        this.pullDiagnosisRecords(),
        this.pullHarvestRecords(),
        this.pullPlants(),
        this.pullAlerts(),
      ]);

      // PUSH second: upload any remaining local changes
      await Promise.all([
        this.pushLogEntries(),
        this.pushDiagnosisRecords(),
        this.pushHarvestRecords(),
        this.pushPlants(),
        this.pushAlerts(),
      ]);

      // Update sync timestamp
      const db = await getDatabase();
      const now = new Date().toISOString();
      const tables = [
        "log_entries",
        "diagnosis_records",
        "harvest_records",
        "plants",
        "alerts",
      ];
      for (const table of tables) {
        await db.runAsync(
          `INSERT OR REPLACE INTO sync_meta (table_name, last_synced_at) VALUES (?, ?)`,
          [table, now],
        );
      }

      this.notifyStatus("success", "Semua data berhasil disinkronkan");
      logger.log("[Sync] All data synced successfully");
    } catch (error) {
      logger.error("[Sync] Error syncing:", error);
      this.notifyStatus(
        "error",
        `Gagal sinkronisasi: ${(error as Error).message}`,
      );
    } finally {
      this.isSyncing = false;
    }
  }

  // ---- Helper: Batch write to Firestore (max 500 per batch) ----

  private async batchWrite(
    collectionName: string,
    items: { id: string; data: Record<string, any> }[],
  ): Promise<string[]> {
    const successIds: string[] = [];
    const BATCH_LIMIT = 499; // Firestore limit is 500 per batch

    for (let i = 0; i < items.length; i += BATCH_LIMIT) {
      const chunk = items.slice(i, i + BATCH_LIMIT);
      const batch = writeBatch(firestore);

      for (const item of chunk) {
        const ref = doc(firestore, collectionName, item.id);
        batch.set(ref, item.data);
      }

      try {
        await batch.commit();
        successIds.push(...chunk.map((c) => c.id));
      } catch (e) {
        logger.error(
          `[Sync] Batch write failed for ${collectionName} (chunk ${i}):`,
          e,
        );
      }
    }

    return successIds;
  }

  // ---- PUSH: Local -> Firebase (using batch writes) ----

  private async pushLogEntries() {
    const unsynced = await getUnsyncedLogEntries();
    if (unsynced.length === 0) return;

    const db = await getDatabase();
    const items: { id: string; data: Record<string, any> }[] = [];
    // Simpan mapping id → base64 photo yang sudah dikompres, BELUM tulis ke SQLite
    const compressedPhotos = new Map<string, string>();

    for (const entry of unsynced) {
      let photo = entry.photo ?? null;

      // Compress local photo to Base64 Data URI before pushing to Firestore
      if (photo && photo.startsWith("file://")) {
        try {
          const base64Photo = await compressImageToBase64(photo);
          if (base64Photo) {
            // Simpan base64 di memory saja — jangan update SQLite dulu
            compressedPhotos.set(entry.id, base64Photo);
            photo = base64Photo;
            logger.log(`[Sync] Compressed photo for log entry ${entry.id}`);
          } else {
            // Compression returned null — skip to retry next cycle
            logger.warn(
              `[Sync] Photo compression returned null for ${entry.id}, skipping`,
            );
            continue;
          }
        } catch (compressErr) {
          logger.error(
            `[Sync] Photo compression failed for log entry ${entry.id}, skipping push:`,
            compressErr,
          );
          // Skip this entry — it will be retried on the next sync cycle
          continue;
        }
      }

      items.push({
        id: entry.id,
        data: {
          ...entry,
          photo: photo,
          synced: 1,
          updated_at: entry.updated_at ?? new Date().toISOString(),
        },
      });
    }

    if (items.length === 0) return;

    const successIds = await this.batchWrite("log_entries", items);

    // HANYA setelah batch Firestore SUKSES, update SQLite
    for (const id of successIds) {
      if (compressedPhotos.has(id)) {
        // Persist base64 photo + mark synced dalam satu UPDATE
        await db.runAsync(
          `UPDATE log_entries SET photo = ?, synced = 1 WHERE id = ?`,
          [compressedPhotos.get(id)!, id],
        );
      } else {
        await markLogEntrySynced(id);
      }
    }

    logger.log(
      `[Sync] Pushed ${successIds.length}/${unsynced.length} log entries`,
    );
  }

  private async pushDiagnosisRecords() {
    const unsynced = await getUnsyncedDiagnosisRecords();
    if (unsynced.length === 0) return;

    const items = unsynced.map((record) => ({
      id: record.id,
      data: {
        ...record,
        synced: 1,
        updated_at: record.updated_at ?? new Date().toISOString(),
      },
    }));

    const successIds = await this.batchWrite("diagnosis_records", items);
    await Promise.all(successIds.map((id) => markDiagnosisRecordSynced(id)));
    logger.log(
      `[Sync] Pushed ${successIds.length}/${unsynced.length} diagnosis records`,
    );
  }

  private async pushHarvestRecords() {
    const unsynced = await getUnsyncedHarvestRecords();
    if (unsynced.length === 0) return;

    const items = unsynced.map((record) => ({
      id: record.id,
      data: {
        ...record,
        synced: 1,
        updated_at: record.updated_at ?? new Date().toISOString(),
      },
    }));

    const successIds = await this.batchWrite("harvest_records", items);
    await Promise.all(successIds.map((id) => markHarvestRecordSynced(id)));
    logger.log(
      `[Sync] Pushed ${successIds.length}/${unsynced.length} harvest records`,
    );
  }

  private async pushPlants() {
    const unsynced = await getUnsyncedPlants();
    if (unsynced.length === 0) return;

    const items = unsynced.map((plant) => ({
      id: plant.id,
      data: {
        ...plant,
        synced: 1,
        updated_at: plant.updated_at ?? new Date().toISOString(),
      },
    }));

    const successIds = await this.batchWrite("plants", items);
    await Promise.all(successIds.map((id) => markPlantSynced(id)));
    logger.log(`[Sync] Pushed ${successIds.length}/${unsynced.length} plants`);
  }

  private async pushAlerts() {
    const unsynced = await getUnsyncedAlerts();
    if (unsynced.length === 0) return;

    const items = unsynced.map((alert) => ({
      id: alert.id,
      data: {
        ...alert,
        synced: 1,
        updated_at: alert.updated_at ?? new Date().toISOString(),
      },
    }));

    const successIds = await this.batchWrite("alerts", items);
    await Promise.all(successIds.map((id) => markAlertSynced(id)));
    logger.log(`[Sync] Pushed ${successIds.length}/${unsynced.length} alerts`);
  }

  // ---- PULL: Firebase -> Local (Full Reconciliation) ----

  private async getLastSyncTime(tableName: string): Promise<string | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ last_synced_at: string | null }>(
      "SELECT last_synced_at FROM sync_meta WHERE table_name = ?",
      [tableName],
    );
    return row?.last_synced_at ?? null;
  }

  private async pullLogEntries() {
    try {
      // Full reconciliation: ambil SEMUA doc dari Firestore
      const q = query(collection(firestore, "log_entries"));
      const snapshot = await getDocs(q);

      const cloudIds = new Set<string>();
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data() as any;
        cloudIds.add(docSnap.id);
        await upsertLogEntryFromCloud({
          id: docSnap.id,
          device_id: data.device_id,
          date: data.date,
          block: data.block,
          activity: data.activity,
          notes: data.notes ?? "",
          photo: data.photo ?? null,
          created_at: data.created_at,
          updated_at: data.updated_at,
          synced: 1,
          deleted: data.deleted ?? 0,
        });
      }

      // Soft-delete lokal yang tidak ada di cloud
      const removed = await reconcileLogEntries(cloudIds);
      if (removed > 0) {
        logger.log(
          `[Sync] Reconciled log_entries: ${removed} local records soft-deleted`,
        );
      }
    } catch (e) {
      logger.error("[Sync] Failed to pull log entries:", e);
    }
  }

  private async pullDiagnosisRecords() {
    try {
      const q = query(collection(firestore, "diagnosis_records"));
      const snapshot = await getDocs(q);

      const cloudIds = new Set<string>();
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data() as any;
        cloudIds.add(docSnap.id);
        await upsertDiagnosisRecordFromCloud({
          id: docSnap.id,
          device_id: data.device_id,
          date: data.date,
          selected_symptoms: data.selected_symptoms,
          risk_level: data.risk_level,
          result_title: data.result_title,
          result_description: data.result_description,
          recommendations: data.recommendations,
          created_at: data.created_at,
          updated_at: data.updated_at,
          synced: 1,
          deleted: data.deleted ?? 0,
        });
      }

      const removed = await reconcileDiagnosisRecords(cloudIds);
      if (removed > 0) {
        logger.log(
          `[Sync] Reconciled diagnosis_records: ${removed} local records soft-deleted`,
        );
      }
    } catch (e) {
      logger.error("[Sync] Failed to pull diagnosis records:", e);
    }
  }

  private async pullHarvestRecords() {
    try {
      const q = query(collection(firestore, "harvest_records"));
      const snapshot = await getDocs(q);

      const cloudIds = new Set<string>();
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data() as any;
        cloudIds.add(docSnap.id);
        await upsertHarvestRecordFromCloud({
          id: docSnap.id,
          device_id: data.device_id,
          date: data.date,
          block: data.block,
          quantity: data.quantity,
          quality: data.quality,
          notes: data.notes ?? "",
          created_at: data.created_at,
          updated_at: data.updated_at,
          synced: 1,
          deleted: data.deleted ?? 0,
        });
      }

      const removed = await reconcileHarvestRecords(cloudIds);
      if (removed > 0) {
        logger.log(
          `[Sync] Reconciled harvest_records: ${removed} local records soft-deleted`,
        );
      }
    } catch (e) {
      logger.error("[Sync] Failed to pull harvest records:", e);
    }
  }

  private async pullPlants() {
    try {
      const q = query(collection(firestore, "plants"));
      const snapshot = await getDocs(q);
      logger.log(
        `[Sync] Pull plants: ${snapshot.docs.length} docs from Firestore`,
      );

      const cloudIds = new Set<string>();
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data() as any;
        cloudIds.add(docSnap.id);
        await upsertPlantFromCloud({
          id: docSnap.id,
          device_id: data.device_id,
          block: data.block,
          name: data.name,
          status: data.status,
          planted_date: data.planted_date ?? null,
          notes: data.notes ?? "",
          created_at: data.created_at,
          updated_at: data.updated_at,
          synced: 1,
          deleted: data.deleted ?? 0,
        });
      }

      const removed = await reconcilePlants(cloudIds);
      logger.log(
        `[Sync] Reconciled plants: ${removed} local records soft-deleted (cloudIds: ${cloudIds.size})`,
      );
    } catch (e) {
      logger.error("[Sync] Failed to pull plants:", e);
    }
  }

  private async pullAlerts() {
    try {
      const q = query(collection(firestore, "alerts"));
      const snapshot = await getDocs(q);

      const cloudIds = new Set<string>();
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data() as any;
        cloudIds.add(docSnap.id);
        await upsertAlertFromCloud({
          id: docSnap.id,
          device_id: data.device_id,
          message: data.message,
          severity: data.severity,
          block: data.block ?? null,
          is_read: data.is_read ?? 0,
          created_at: data.created_at,
          updated_at: data.updated_at,
          synced: 1,
          deleted: data.deleted ?? 0,
        });
      }

      const removed = await reconcileAlerts(cloudIds);
      if (removed > 0) {
        logger.log(
          `[Sync] Reconciled alerts: ${removed} local records soft-deleted`,
        );
      }
    } catch (e) {
      logger.error("[Sync] Failed to pull alerts:", e);
    }
  }
}

export const syncService = new SyncService();
