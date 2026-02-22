// Shared types for all database entities

export interface LogEntry {
  id: string;
  device_id: string;
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
  device_id: string;
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
  device_id: string;
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
  device_id: string;
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
  device_id: string;
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
