import { getDatabase, getDeviceId } from "./database";
import type { HarvestRecord } from "./types";
import { generateId } from "./utils";

export async function getAllHarvestRecords(): Promise<HarvestRecord[]> {
  const db = await getDatabase();
  const deviceId = await getDeviceId();
  return db.getAllAsync<HarvestRecord>(
    "SELECT * FROM harvest_records WHERE deleted = 0 AND device_id = ? ORDER BY date DESC, created_at DESC",
    [deviceId],
  );
}

export async function getHarvestRecordsByPeriod(
  startDate: string,
  endDate: string,
): Promise<HarvestRecord[]> {
  const db = await getDatabase();
  const deviceId = await getDeviceId();
  return db.getAllAsync<HarvestRecord>(
    "SELECT * FROM harvest_records WHERE deleted = 0 AND device_id = ? AND date >= ? AND date <= ? ORDER BY date DESC",
    [deviceId, startDate, endDate],
  );
}

export async function addHarvestRecord(
  record: Omit<
    HarvestRecord,
    "id" | "device_id" | "created_at" | "updated_at" | "synced" | "deleted"
  >,
): Promise<HarvestRecord> {
  const db = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();
  const deviceId = await getDeviceId();

  await db.runAsync(
    `INSERT INTO harvest_records (id, device_id, date, block, quantity, quality, notes, created_at, updated_at, synced, deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
    [
      id,
      deviceId,
      record.date,
      record.block,
      record.quantity,
      record.quality,
      record.notes,
      now,
      now,
    ],
  );

  return {
    id,
    device_id: deviceId,
    ...record,
    created_at: now,
    updated_at: now,
    synced: 0,
    deleted: 0,
  };
}

export async function updateHarvestRecord(
  id: string,
  updates: Partial<HarvestRecord>,
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.date !== undefined) {
    fields.push("date = ?");
    values.push(updates.date);
  }
  if (updates.block !== undefined) {
    fields.push("block = ?");
    values.push(updates.block);
  }
  if (updates.quantity !== undefined) {
    fields.push("quantity = ?");
    values.push(updates.quantity);
  }
  if (updates.quality !== undefined) {
    fields.push("quality = ?");
    values.push(updates.quality);
  }
  if (updates.notes !== undefined) {
    fields.push("notes = ?");
    values.push(updates.notes);
  }

  fields.push("updated_at = ?", "synced = 0");
  const deviceId = await getDeviceId();
  values.push(now, id, deviceId);

  await db.runAsync(
    `UPDATE harvest_records SET ${fields.join(", ")} WHERE id = ? AND device_id = ?`,
    values,
  );
}

export async function deleteHarvestRecord(id: string): Promise<void> {
  const db = await getDatabase();
  const deviceId = await getDeviceId();
  const now = new Date().toISOString();
  await db.runAsync(
    "UPDATE harvest_records SET deleted = 1, updated_at = ?, synced = 0 WHERE id = ? AND device_id = ?",
    [now, id, deviceId],
  );
}

export async function getHarvestSummary(): Promise<{
  totalThisMonth: number;
  gradeACounts: number[];
  monthlyVolumes: { month: string; total: number }[];
}> {
  const db = await getDatabase();
  const now = new Date();
  const currentMonth = now.toISOString().substring(0, 7); // YYYY-MM

  // Total harvest this month
  const monthResult = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(quantity), 0) as total FROM harvest_records
     WHERE deleted = 0 AND date LIKE ?`,
    [`${currentMonth}%`],
  );

  // Grade A per week (last 4 weeks)
  const gradeACounts: number[] = [];
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (i * 7 + 6));
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - i * 7);
    const weekResult = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM harvest_records
       WHERE deleted = 0 AND quality = 'Grade A' AND date >= ? AND date <= ?`,
      [
        weekStart.toISOString().split("T")[0],
        weekEnd.toISOString().split("T")[0],
      ],
    );
    gradeACounts.push(weekResult?.count ?? 0);
  }

  // Monthly volume for last 5 months
  const monthlyVolumes: { month: string; total: number }[] = [];
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  for (let i = 4; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const vol = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(quantity), 0) as total FROM harvest_records
       WHERE deleted = 0 AND date LIKE ?`,
      [`${prefix}%`],
    );
    monthlyVolumes.push({
      month: monthNames[d.getMonth()],
      total: vol?.total ?? 0,
    });
  }

  return {
    totalThisMonth: monthResult?.total ?? 0,
    gradeACounts,
    monthlyVolumes,
  };
}

export async function getUnsyncedHarvestRecords(): Promise<HarvestRecord[]> {
  const db = await getDatabase();
  return db.getAllAsync<HarvestRecord>(
    "SELECT * FROM harvest_records WHERE synced = 0 AND deleted = 0",
  );
}

export async function markHarvestRecordSynced(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("UPDATE harvest_records SET synced = 1 WHERE id = ?", [id]);
}

/**
 * Soft-delete local synced records whose IDs are NOT present in Firestore.
 */
export async function reconcileHarvestRecords(
  cloudIds: Set<string>,
): Promise<number> {
  const db = await getDatabase();
  const locals = await db.getAllAsync<{ id: string }>(
    "SELECT id FROM harvest_records WHERE deleted = 0 AND synced = 1",
  );
  const now = new Date().toISOString();
  let count = 0;
  for (const row of locals) {
    if (!cloudIds.has(row.id)) {
      await db.runAsync(
        "UPDATE harvest_records SET deleted = 1, updated_at = ?, synced = 1 WHERE id = ?",
        [now, row.id],
      );
      count++;
    }
  }
  return count;
}

export async function upsertHarvestRecordFromCloud(
  record: HarvestRecord,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO harvest_records (id, device_id, date, block, quantity, quality, notes, created_at, updated_at, synced, deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      record.id,
      record.device_id ?? "unknown",
      record.date,
      record.block,
      record.quantity,
      record.quality,
      record.notes,
      record.created_at ?? new Date().toISOString(),
      record.updated_at ?? new Date().toISOString(),
      record.deleted ?? 0,
    ],
  );
}
