import { getDatabase, getDeviceId } from "./database";
import type { DiagnosisRecord } from "./types";
import { generateId } from "./utils";

export async function getAllDiagnosisRecords(): Promise<DiagnosisRecord[]> {
  const db = await getDatabase();
  const deviceId = await getDeviceId();
  return db.getAllAsync<DiagnosisRecord>(
    "SELECT * FROM diagnosis_records WHERE deleted = 0 AND device_id = ? ORDER BY date DESC, created_at DESC",
    [deviceId],
  );
}

export async function addDiagnosisRecord(
  record: Omit<
    DiagnosisRecord,
    "id" | "device_id" | "created_at" | "updated_at" | "synced" | "deleted"
  >,
): Promise<DiagnosisRecord> {
  const db = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();
  const deviceId = await getDeviceId();

  await db.runAsync(
    `INSERT INTO diagnosis_records (id, device_id, date, selected_symptoms, risk_level, result_title, result_description, recommendations, created_at, updated_at, synced, deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
    [
      id,
      deviceId,
      record.date,
      record.selected_symptoms,
      record.risk_level,
      record.result_title,
      record.result_description,
      record.recommendations,
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

export async function deleteDiagnosisRecord(id: string): Promise<void> {
  const db = await getDatabase();
  const deviceId = await getDeviceId();
  const now = new Date().toISOString();
  await db.runAsync(
    "UPDATE diagnosis_records SET deleted = 1, updated_at = ?, synced = 0 WHERE id = ? AND device_id = ?",
    [now, id, deviceId],
  );
}

export async function getUnsyncedDiagnosisRecords(): Promise<
  DiagnosisRecord[]
> {
  const db = await getDatabase();
  return db.getAllAsync<DiagnosisRecord>(
    "SELECT * FROM diagnosis_records WHERE synced = 0 AND deleted = 0",
  );
}

export async function markDiagnosisRecordSynced(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("UPDATE diagnosis_records SET synced = 1 WHERE id = ?", [
    id,
  ]);
}

/**
 * Soft-delete local synced records whose IDs are NOT present in Firestore.
 */
export async function reconcileDiagnosisRecords(
  cloudIds: Set<string>,
): Promise<number> {
  const db = await getDatabase();
  const locals = await db.getAllAsync<{ id: string }>(
    "SELECT id FROM diagnosis_records WHERE deleted = 0 AND synced = 1",
  );
  const now = new Date().toISOString();
  let count = 0;
  for (const row of locals) {
    if (!cloudIds.has(row.id)) {
      await db.runAsync(
        "UPDATE diagnosis_records SET deleted = 1, updated_at = ?, synced = 1 WHERE id = ?",
        [now, row.id],
      );
      count++;
    }
  }
  return count;
}

export async function upsertDiagnosisRecordFromCloud(
  record: DiagnosisRecord,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO diagnosis_records (id, device_id, date, selected_symptoms, risk_level, result_title, result_description, recommendations, created_at, updated_at, synced, deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      record.id,
      record.device_id ?? "unknown",
      record.date,
      record.selected_symptoms,
      record.risk_level,
      record.result_title,
      record.result_description,
      record.recommendations,
      record.created_at ?? new Date().toISOString(),
      record.updated_at ?? new Date().toISOString(),
      record.deleted ?? 0,
    ],
  );
}
