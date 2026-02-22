import { getDatabase, getDeviceId } from "./database";
import type { AlertRecord, DashboardStats, Plant } from "./types";
import { generateId } from "./utils";

// ---- Dashboard Stats (computed from plants + harvests) ----

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = await getDatabase();

  const total = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM plants WHERE deleted = 0",
  );
  const healthy = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM plants WHERE deleted = 0 AND status = 'sehat'",
  );
  const attention = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM plants WHERE deleted = 0 AND status = 'perhatian'",
  );
  const sick = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM plants WHERE deleted = 0 AND status = 'sakit'",
  );

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const harvest = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(quantity), 0) as total FROM harvest_records WHERE deleted = 0 AND date LIKE ?`,
    [`${currentMonth}%`],
  );

  return {
    totalPlants: total?.count ?? 0,
    healthyPlants: healthy?.count ?? 0,
    attentionPlants: attention?.count ?? 0,
    sickPlants: sick?.count ?? 0,
    harvestThisMonth: harvest?.total ?? 0,
  };
}

export async function getHealthDistribution(): Promise<
  { name: string; value: number; color: string }[]
> {
  const db = await getDatabase();

  const healthy = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM plants WHERE deleted = 0 AND status = 'sehat'",
  );
  const attention = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM plants WHERE deleted = 0 AND status = 'perhatian'",
  );
  const sick = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM plants WHERE deleted = 0 AND status = 'sakit'",
  );

  return [
    { name: "Sehat", value: healthy?.count ?? 0, color: "#22c55e" },
    { name: "Perhatian", value: attention?.count ?? 0, color: "#f59e0b" },
    { name: "Sakit", value: sick?.count ?? 0, color: "#ef4444" },
  ];
}

export async function getBlockActivityData(): Promise<{
  labels: string[];
  data: number[];
}> {
  const db = await getDatabase();
  const blocks = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const data: number[] = [];

  // Count log entries per block in last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const startDate = sevenDaysAgo.toISOString().split("T")[0];

  for (const block of blocks) {
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM log_entries
       WHERE deleted = 0 AND block = ? AND date >= ?`,
      [`Blok ${block}`, startDate],
    );
    data.push(result?.count ?? 0);
  }

  return { labels: blocks, data };
}

// ---- Plants CRUD ----

export async function getAllPlants(): Promise<Plant[]> {
  const db = await getDatabase();
  return db.getAllAsync<Plant>(
    "SELECT * FROM plants WHERE deleted = 0 ORDER BY block, name",
  );
}

export async function addPlant(
  plant: Omit<
    Plant,
    "id" | "device_id" | "created_at" | "updated_at" | "synced" | "deleted"
  >,
): Promise<Plant> {
  const db = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();
  const deviceId = await getDeviceId();

  await db.runAsync(
    `INSERT INTO plants (id, device_id, block, name, status, planted_date, notes, created_at, updated_at, synced, deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
    [
      id,
      deviceId,
      plant.block,
      plant.name,
      plant.status,
      plant.planted_date ?? null,
      plant.notes,
      now,
      now,
    ],
  );

  return {
    id,
    device_id: deviceId,
    ...plant,
    created_at: now,
    updated_at: now,
    synced: 0,
    deleted: 0,
  };
}

export async function updatePlantStatus(
  id: string,
  status: Plant["status"],
): Promise<void> {
  const db = await getDatabase();
  const deviceId = await getDeviceId();
  const now = new Date().toISOString();
  await db.runAsync(
    "UPDATE plants SET status = ?, updated_at = ?, synced = 0 WHERE id = ? AND device_id = ?",
    [status, now, id, deviceId],
  );
}

/**
 * Add N new plants at once to a specific block (used by "Menanam" activity).
 */
export async function addBulkPlants(
  block: string,
  count: number,
  plantedDate: string,
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const deviceId = await getDeviceId();
  const batchSize = 50;

  const rows: { id: string; name: string }[] = [];
  const baseId = Date.now().toString(36);
  for (let i = 0; i < count; i++) {
    const id = `${baseId}-${Math.random().toString(36).substring(2, 9)}`;
    rows.push({ id, name: `Bibit Baru ${i + 1}` });
  }

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const placeholders = batch
      .map(() => `(?, ?, ?, ?, 'sehat', ?, '', ?, ?, 0, 0)`)
      .join(", ");
    const params = batch.flatMap((row) => [
      row.id,
      deviceId,
      block,
      row.name,
      plantedDate,
      now,
      now,
    ]);
    await db.runAsync(
      `INSERT INTO plants (id, device_id, block, name, status, planted_date, notes, created_at, updated_at, synced, deleted) VALUES ${placeholders}`,
      params,
    );
  }
}

/**
 * Update the status of N plants in a specific block (used by "Inspeksi" activity).
 * Picks the first N plants with a non-matching status, ordered by name.
 */
export async function updatePlantStatusByBlock(
  block: string,
  newStatus: Plant["status"],
  count: number,
): Promise<number> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  // Find the plant IDs to update (those NOT already in the target status)
  const plants = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM plants WHERE deleted = 0 AND block = ? AND status != ? ORDER BY name LIMIT ?`,
    [block, newStatus, count],
  );

  if (plants.length === 0) return 0;

  const placeholders = plants.map(() => "?").join(", ");
  const params: any[] = [newStatus, now, ...plants.map((p) => p.id)];
  await db.runAsync(
    `UPDATE plants SET status = ?, updated_at = ?, synced = 0 WHERE id IN (${placeholders})`,
    params,
  );

  return plants.length;
}

export async function getUnsyncedPlants(): Promise<Plant[]> {
  const db = await getDatabase();
  return db.getAllAsync<Plant>(
    "SELECT * FROM plants WHERE synced = 0 AND deleted = 0",
  );
}

export async function markPlantSynced(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("UPDATE plants SET synced = 1 WHERE id = ?", [id]);
}

/**
 * Soft-delete local synced plants whose IDs are NOT present in Firestore.
 */
export async function reconcilePlants(cloudIds: Set<string>): Promise<number> {
  const db = await getDatabase();
  const locals = await db.getAllAsync<{ id: string }>(
    "SELECT id FROM plants WHERE deleted = 0 AND synced = 1",
  );
  const now = new Date().toISOString();
  let count = 0;
  for (const row of locals) {
    if (!cloudIds.has(row.id)) {
      await db.runAsync(
        "UPDATE plants SET deleted = 1, updated_at = ?, synced = 1 WHERE id = ?",
        [now, row.id],
      );
      count++;
    }
  }
  return count;
}

export async function upsertPlantFromCloud(plant: Plant): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO plants (id, device_id, block, name, status, planted_date, notes, created_at, updated_at, synced, deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      plant.id,
      plant.device_id ?? "unknown",
      plant.block,
      plant.name,
      plant.status,
      plant.planted_date ?? null,
      plant.notes,
      plant.created_at ?? new Date().toISOString(),
      plant.updated_at ?? new Date().toISOString(),
      plant.deleted ?? 0,
    ],
  );
}

// ---- Alerts ----

export async function getAllAlerts(): Promise<AlertRecord[]> {
  const db = await getDatabase();
  return db.getAllAsync<AlertRecord>(
    "SELECT * FROM alerts WHERE deleted = 0 ORDER BY created_at DESC",
  );
}

export async function addAlert(
  alert: Omit<
    AlertRecord,
    | "id"
    | "device_id"
    | "created_at"
    | "updated_at"
    | "synced"
    | "deleted"
    | "is_read"
  >,
): Promise<AlertRecord> {
  const db = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();

  const deviceId = await getDeviceId();

  await db.runAsync(
    `INSERT INTO alerts (id, device_id, message, severity, block, is_read, created_at, updated_at, synced, deleted)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?, 0, 0)`,
    [
      id,
      deviceId,
      alert.message,
      alert.severity,
      alert.block ?? null,
      now,
      now,
    ],
  );

  return {
    id,
    device_id: deviceId,
    ...alert,
    is_read: 0,
    created_at: now,
    updated_at: now,
    synced: 0,
    deleted: 0,
  };
}

export async function markAlertRead(id: string): Promise<void> {
  const db = await getDatabase();
  const deviceId = await getDeviceId();
  await db.runAsync(
    "UPDATE alerts SET is_read = 1, synced = 0 WHERE id = ? AND device_id = ?",
    [id, deviceId],
  );
}

export async function getUnsyncedAlerts(): Promise<AlertRecord[]> {
  const db = await getDatabase();
  return db.getAllAsync<AlertRecord>(
    "SELECT * FROM alerts WHERE synced = 0 AND deleted = 0",
  );
}

export async function markAlertSynced(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("UPDATE alerts SET synced = 1 WHERE id = ?", [id]);
}

/**
 * Soft-delete local synced alerts whose IDs are NOT present in Firestore.
 */
export async function reconcileAlerts(cloudIds: Set<string>): Promise<number> {
  const db = await getDatabase();
  const locals = await db.getAllAsync<{ id: string }>(
    "SELECT id FROM alerts WHERE deleted = 0 AND synced = 1",
  );
  const now = new Date().toISOString();
  let count = 0;
  for (const row of locals) {
    if (!cloudIds.has(row.id)) {
      await db.runAsync(
        "UPDATE alerts SET deleted = 1, updated_at = ?, synced = 1 WHERE id = ?",
        [now, row.id],
      );
      count++;
    }
  }
  return count;
}

export async function upsertAlertFromCloud(alert: AlertRecord): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO alerts (id, device_id, message, severity, block, is_read, created_at, updated_at, synced, deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      alert.id,
      alert.device_id ?? "unknown",
      alert.message,
      alert.severity,
      alert.block ?? null,
      alert.is_read,
      alert.created_at ?? new Date().toISOString(),
      alert.updated_at ?? new Date().toISOString(),
      alert.deleted ?? 0,
    ],
  );
}

// Helper: format relative time for alerts
export function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Baru saja";
  if (diffMins < 60) return `${diffMins} menit yang lalu`;
  if (diffHours < 24) return `${diffHours} jam yang lalu`;
  if (diffDays < 7) return `${diffDays} hari yang lalu`;
  return `${Math.floor(diffDays / 7)} minggu yang lalu`;
}
