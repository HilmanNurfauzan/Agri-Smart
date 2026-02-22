import { getDatabase, getDeviceId } from "./database";
import type { LogEntry } from "./types";
import { generateId } from "./utils";

export async function getAllLogEntries(): Promise<LogEntry[]> {
  const db = await getDatabase();
  const deviceId = await getDeviceId();
  return db.getAllAsync<LogEntry>(
    "SELECT * FROM log_entries WHERE deleted = 0 AND device_id = ? ORDER BY date DESC, created_at DESC",
    [deviceId],
  );
}

export async function getLogEntriesByDate(date: string): Promise<LogEntry[]> {
  const db = await getDatabase();
  const deviceId = await getDeviceId();
  return db.getAllAsync<LogEntry>(
    "SELECT * FROM log_entries WHERE deleted = 0 AND device_id = ? AND date = ? ORDER BY created_at DESC",
    [deviceId, date],
  );
}

export async function addLogEntry(
  entry: Omit<
    LogEntry,
    "id" | "created_at" | "updated_at" | "synced" | "deleted" | "device_id"
  >,
): Promise<LogEntry> {
  const db = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();
  const deviceId = await getDeviceId();

  await db.runAsync(
    `INSERT INTO log_entries (id, device_id, date, block, activity, notes, photo, created_at, updated_at, synced, deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
    [
      id,
      deviceId,
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
    device_id: deviceId,
    ...entry,
    created_at: now,
    updated_at: now,
    synced: 0,
    deleted: 0,
  };
}

export async function updateLogEntry(
  id: string,
  updates: Partial<LogEntry>,
): Promise<void> {
  const db = await getDatabase();
  const deviceId = await getDeviceId();
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
  if (updates.activity !== undefined) {
    fields.push("activity = ?");
    values.push(updates.activity);
  }
  if (updates.notes !== undefined) {
    fields.push("notes = ?");
    values.push(updates.notes);
  }
  if (updates.photo !== undefined) {
    fields.push("photo = ?");
    values.push(updates.photo);
  }

  fields.push("updated_at = ?", "synced = 0");
  values.push(now, id, deviceId);

  await db.runAsync(
    `UPDATE log_entries SET ${fields.join(", ")} WHERE id = ? AND device_id = ?`,
    values,
  );
}

export async function deleteLogEntry(id: string): Promise<void> {
  const db = await getDatabase();
  const deviceId = await getDeviceId();
  const now = new Date().toISOString();
  await db.runAsync(
    "UPDATE log_entries SET deleted = 1, updated_at = ?, synced = 0 WHERE id = ? AND device_id = ?",
    [now, id, deviceId],
  );
}

export async function getUnsyncedLogEntries(): Promise<LogEntry[]> {
  const db = await getDatabase();
  return db.getAllAsync<LogEntry>(
    "SELECT * FROM log_entries WHERE synced = 0 AND deleted = 0",
  );
}

export async function markLogEntrySynced(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("UPDATE log_entries SET synced = 1 WHERE id = ?", [id]);
}

/**
 * Soft-delete local synced records whose IDs are NOT present in Firestore.
 * Only targets records with synced=1 (already pushed). Unsynced local records are kept.
 */
export async function reconcileLogEntries(
  cloudIds: Set<string>,
): Promise<number> {
  const db = await getDatabase();
  const locals = await db.getAllAsync<{ id: string }>(
    "SELECT id FROM log_entries WHERE deleted = 0 AND synced = 1",
  );
  const now = new Date().toISOString();
  let count = 0;
  for (const row of locals) {
    if (!cloudIds.has(row.id)) {
      await db.runAsync(
        "UPDATE log_entries SET deleted = 1, updated_at = ?, synced = 1 WHERE id = ?",
        [now, row.id],
      );
      count++;
    }
  }
  return count;
}

export async function upsertLogEntryFromCloud(entry: LogEntry): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO log_entries (id, device_id, date, block, activity, notes, photo, created_at, updated_at, synced, deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      entry.id,
      entry.device_id ?? "unknown",
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
