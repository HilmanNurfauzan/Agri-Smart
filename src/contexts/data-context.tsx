import * as SplashScreen from "expo-splash-screen";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getDatabase } from "../database/database";
import { networkMonitor } from "../services/network-monitor";
import { syncService } from "../services/sync-service";

// Types
import type {
  AlertRecord,
  DashboardStats,
  DiagnosisRecord,
  HarvestRecord,
  LogEntry,
} from "../database/types";

// Repositories
import * as DashboardRepo from "../database/dashboard-repository";
import * as DiagnosisRepo from "../database/diagnosis-repository";
import * as HarvestRepo from "../database/harvest-repository";
import * as LogbookRepo from "../database/logbook-repository";
import { logger } from "../utils/logger";

type SyncStatus = "idle" | "syncing" | "success" | "error";

interface DataContextType {
  // Database ready state
  isReady: boolean;

  // Network / Sync state
  isOnline: boolean;
  syncStatus: SyncStatus;
  syncMessage: string;
  triggerSync: () => Promise<void>;

  // Logbook
  logEntries: LogEntry[];
  refreshLogEntries: () => Promise<void>;
  addLogEntry: (
    entry: Omit<
      LogEntry,
      "id" | "device_id" | "created_at" | "updated_at" | "synced" | "deleted"
    >,
  ) => Promise<LogEntry>;
  deleteLogEntry: (id: string) => Promise<void>;

  // Diagnosis
  diagnosisRecords: DiagnosisRecord[];
  refreshDiagnosisRecords: () => Promise<void>;
  addDiagnosisRecord: (
    record: Omit<
      DiagnosisRecord,
      "id" | "device_id" | "created_at" | "updated_at" | "synced" | "deleted"
    >,
  ) => Promise<DiagnosisRecord>;

  // Harvest
  harvestRecords: HarvestRecord[];
  refreshHarvestRecords: () => Promise<void>;
  addHarvestRecord: (
    record: Omit<
      HarvestRecord,
      "id" | "device_id" | "created_at" | "updated_at" | "synced" | "deleted"
    >,
  ) => Promise<HarvestRecord>;
  getHarvestSummary: () => Promise<{
    totalThisMonth: number;
    gradeACounts: number[];
    monthlyVolumes: { month: string; total: number }[];
  }>;

  // Dashboard
  dashboardStats: DashboardStats | null;
  healthDistribution: { name: string; value: number; color: string }[];
  blockActivityData: { labels: string[]; data: number[] };
  alerts: AlertRecord[];
  refreshDashboard: () => Promise<void>;

  // Plants (bulk operations)
  addBulkPlants: (
    block: string,
    count: number,
    plantedDate: string,
  ) => Promise<void>;
  updatePlantStatusByBlock: (
    block: string,
    newStatus: "sehat" | "perhatian" | "sakit",
    count: number,
  ) => Promise<number>;
}

const DataContext = createContext<DataContextType | null>(null);

export function useData(): DataContextType {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncMessage, setSyncMessage] = useState("");

  // Data states
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [diagnosisRecords, setDiagnosisRecords] = useState<DiagnosisRecord[]>(
    [],
  );
  const [harvestRecords, setHarvestRecords] = useState<HarvestRecord[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(
    null,
  );
  const [healthDistribution, setHealthDistribution] = useState<
    { name: string; value: number; color: string }[]
  >([]);
  const [blockActivityData, setBlockActivityData] = useState<{
    labels: string[];
    data: number[];
  }>({ labels: [], data: [] });
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const initializeRef = useRef<(() => Promise<void>) | null>(null);

  // Hide splash screen once app is ready or if init fails
  useEffect(() => {
    if (isReady || initError) {
      SplashScreen.hideAsync();
    }
  }, [isReady, initError]);

  // Initialize database and services
  useEffect(() => {
    let networkUnsub: (() => void) | null = null;
    let syncUnsub: (() => void) | null = null;

    async function initialize() {
      try {
        setInitError(null);

        // Initialize database (creates tables + seeds data)
        await getDatabase();
        setIsReady(true);

        // Load initial data
        await refreshAllData();

        // Start network monitoring
        networkUnsub = networkMonitor.addListener((connected) => {
          setIsOnline(connected);
        });
        const connected = await networkMonitor.checkConnection();
        setIsOnline(connected);

        // Start sync service (listens for network changes)
        syncUnsub = syncService.addStatusListener((status, message) => {
          setSyncStatus(status);
          if (message) setSyncMessage(message);
          // Refresh data after sync completes
          if (status === "success") {
            refreshAllData();
          }
        });
        syncService.start();
      } catch (error) {
        logger.error("[DataProvider] Initialization error:", error);
        setInitError(
          "Gagal memuat database. Silakan restart aplikasi atau coba lagi.",
        );
      }
    }

    initializeRef.current = initialize;
    initialize();

    return () => {
      networkUnsub?.();
      syncUnsub?.();
      syncService.stop();
    };
  }, []);

  // Refresh data when app comes to foreground
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === "active"
      ) {
        if (isReady) {
          refreshAllData();
        }
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [isReady]);

  // ---- Data refresh functions ----

  const refreshAllData = useCallback(async () => {
    await Promise.all([
      refreshLogEntries(),
      refreshDiagnosisRecords(),
      refreshHarvestRecords(),
      refreshDashboard(),
    ]);
  }, []);

  const refreshLogEntries = useCallback(async () => {
    try {
      const entries = await LogbookRepo.getAllLogEntries();
      setLogEntries(entries);
    } catch (e) {
      logger.error("[DataProvider] Failed to refresh log entries:", e);
    }
  }, []);

  const refreshDiagnosisRecords = useCallback(async () => {
    try {
      const records = await DiagnosisRepo.getAllDiagnosisRecords();
      setDiagnosisRecords(records);
    } catch (e) {
      logger.error("[DataProvider] Failed to refresh diagnosis records:", e);
    }
  }, []);

  const refreshHarvestRecords = useCallback(async () => {
    try {
      const records = await HarvestRepo.getAllHarvestRecords();
      setHarvestRecords(records);
    } catch (e) {
      logger.error("[DataProvider] Failed to refresh harvest records:", e);
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    try {
      const [stats, health, blockData, alertData] = await Promise.all([
        DashboardRepo.getDashboardStats(),
        DashboardRepo.getHealthDistribution(),
        DashboardRepo.getBlockActivityData(),
        DashboardRepo.getAllAlerts(),
      ]);
      setDashboardStats(stats);
      setHealthDistribution(health);
      setBlockActivityData(blockData);
      setAlerts(alertData);
    } catch (e) {
      logger.error("[DataProvider] Failed to refresh dashboard:", e);
    }
  }, []);

  // ---- CRUD operations (write-through: write to SQLite, then trigger sync) ----

  const addLogEntry = useCallback(
    async (
      entry: Omit<
        LogEntry,
        "id" | "device_id" | "created_at" | "updated_at" | "synced" | "deleted"
      >,
    ) => {
      try {
        const newEntry = await LogbookRepo.addLogEntry(entry);
        await refreshLogEntries();
        if (networkMonitor.isConnected) {
          syncService.syncAll().catch(() => {});
        }
        return newEntry;
      } catch (error) {
        logger.error("[DataProvider] addLogEntry failed:", error);
        throw error;
      }
    },
    [refreshLogEntries],
  );

  const deleteLogEntry = useCallback(
    async (id: string) => {
      try {
        await LogbookRepo.deleteLogEntry(id);
        await refreshLogEntries();
        if (networkMonitor.isConnected) {
          syncService.syncAll().catch(() => {});
        }
      } catch (error) {
        logger.error("[DataProvider] deleteLogEntry failed:", error);
        throw error;
      }
    },
    [refreshLogEntries],
  );

  const addDiagnosisRecord = useCallback(
    async (
      record: Omit<
        DiagnosisRecord,
        "id" | "device_id" | "created_at" | "updated_at" | "synced" | "deleted"
      >,
    ) => {
      try {
        const newRecord = await DiagnosisRepo.addDiagnosisRecord(record);
        await refreshDiagnosisRecords();
        if (networkMonitor.isConnected) {
          syncService.syncAll().catch(() => {});
        }
        return newRecord;
      } catch (error) {
        logger.error("[DataProvider] addDiagnosisRecord failed:", error);
        throw error;
      }
    },
    [refreshDiagnosisRecords],
  );

  const addHarvestRecord = useCallback(
    async (
      record: Omit<
        HarvestRecord,
        "id" | "device_id" | "created_at" | "updated_at" | "synced" | "deleted"
      >,
    ) => {
      try {
        const newRecord = await HarvestRepo.addHarvestRecord(record);
        await Promise.all([refreshHarvestRecords(), refreshDashboard()]);
        if (networkMonitor.isConnected) {
          syncService.syncAll().catch(() => {});
        }
        return newRecord;
      } catch (error) {
        logger.error("[DataProvider] addHarvestRecord failed:", error);
        throw error;
      }
    },
    [refreshHarvestRecords, refreshDashboard],
  );

  const getHarvestSummary = useCallback(async () => {
    try {
      return await HarvestRepo.getHarvestSummary();
    } catch (error) {
      logger.error("[DataProvider] getHarvestSummary failed:", error);
      throw error;
    }
  }, []);

  const triggerSync = useCallback(async () => {
    try {
      await syncService.syncAll();
    } catch (error) {
      logger.error("[DataProvider] triggerSync failed:", error);
      throw error;
    }
  }, []);

  // ---- Plants bulk operations ----

  const addBulkPlants = useCallback(
    async (block: string, count: number, plantedDate: string) => {
      try {
        await DashboardRepo.addBulkPlants(block, count, plantedDate);
        await refreshDashboard();
        if (networkMonitor.isConnected) {
          syncService.syncAll().catch(() => {});
        }
      } catch (error) {
        logger.error("[DataProvider] addBulkPlants failed:", error);
        throw error;
      }
    },
    [refreshDashboard],
  );

  const updatePlantStatusByBlock = useCallback(
    async (
      block: string,
      newStatus: "sehat" | "perhatian" | "sakit",
      count: number,
    ): Promise<number> => {
      try {
        const updated = await DashboardRepo.updatePlantStatusByBlock(
          block,
          newStatus,
          count,
        );
        await refreshDashboard();
        if (networkMonitor.isConnected) {
          syncService.syncAll().catch(() => {});
        }
        return updated;
      } catch (error) {
        logger.error("[DataProvider] updatePlantStatusByBlock failed:", error);
        throw error;
      }
    },
    [refreshDashboard],
  );

  const value: DataContextType = {
    isReady,
    isOnline,
    syncStatus,
    syncMessage,
    triggerSync,
    logEntries,
    refreshLogEntries,
    addLogEntry,
    deleteLogEntry,
    diagnosisRecords,
    refreshDiagnosisRecords,
    addDiagnosisRecord,
    harvestRecords,
    refreshHarvestRecords,
    addHarvestRecord,
    getHarvestSummary,
    dashboardStats,
    healthDistribution,
    blockActivityData,
    alerts,
    refreshDashboard,
    addBulkPlants,
    updatePlantStatusByBlock,
  };

  if (!isReady) {
    return (
      <View style={initStyles.container}>
        {initError ? (
          <>
            <Text style={initStyles.emoji}>⚠️</Text>
            <Text style={initStyles.title}>Terjadi Kesalahan</Text>
            <Text style={initStyles.message}>{initError}</Text>
            <TouchableOpacity
              style={initStyles.button}
              onPress={() => initializeRef.current?.()}
            >
              <Text style={initStyles.buttonText}>Coba Lagi</Text>
            </TouchableOpacity>
          </>
        ) : (
          <ActivityIndicator size="large" color="#16a34a" />
        )}
      </View>
    );
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

const initStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#f8fafc",
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    backgroundColor: "#16a34a",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
