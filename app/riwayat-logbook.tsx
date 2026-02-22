import { useData } from "@/src/contexts/data-context";
import type { LogEntry } from "@/src/database/types";
import { Stack, useRouter } from "expo-router";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ClipboardList,
  ImageIcon,
  MapPin,
  StickyNote,
  X,
} from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BLOCKS = [
  { label: "Semua Blok", value: "" },
  { label: "Blok A1", value: "Blok A1" },
  { label: "Blok A2", value: "Blok A2" },
  { label: "Blok B1", value: "Blok B1" },
  { label: "Blok B2", value: "Blok B2" },
  { label: "Blok C1", value: "Blok C1" },
  { label: "Blok C2", value: "Blok C2" },
];

const ACTIVITIES = [
  { label: "Semua Kegiatan", value: "" },
  { label: "Penyiraman", value: "Penyiraman" },
  { label: "Pemupukan", value: "Pemupukan" },
  { label: "Panen", value: "Panen" },
  { label: "Menanam", value: "Menanam" },
  { label: "Pestisida", value: "Pestisida" },
  { label: "Pemangkasan", value: "Pemangkasan" },
  { label: "Inspeksi", value: "Inspeksi" },
];

const MONTH_FULL = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function formatDisplayDate(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length < 3) return dateStr;
  const day = parseInt(parts[2]);
  const month = MONTH_FULL[parseInt(parts[1]) - 1];
  return `${day} ${month} ${parts[0]}`;
}

function formatDateTime(isoStr?: string): string {
  if (!isoStr) return "-";
  try {
    const d = new Date(isoStr);
    const day = d.getDate();
    const month = MONTH_FULL[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    return `${day} ${month} ${year}, ${hours}:${mins}`;
  } catch {
    return isoStr;
  }
}

// --- Dropdown Picker Component ---
function DropdownPicker({
  label,
  options,
  selectedValue,
  onSelect,
}: {
  label: string;
  options: { label: string; value: string }[];
  selectedValue: string;
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel =
    options.find((o) => o.value === selectedValue)?.label ?? label;

  return (
    <View style={dpStyles.container}>
      <Text style={dpStyles.label}>{label}</Text>
      <TouchableOpacity
        style={dpStyles.trigger}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[dpStyles.triggerText, !selectedValue && dpStyles.placeholder]}
        >
          {selectedLabel}
        </Text>
        <ChevronDown size={18} color="#6b7280" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity
          style={dpStyles.overlay}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View style={dpStyles.sheet}>
            <View style={dpStyles.sheetHeader}>
              <Text style={dpStyles.sheetTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <X size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView bounces={false} style={{ maxHeight: 320 }}>
              {options.map((opt) => {
                const isActive = opt.value === selectedValue;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[dpStyles.option, isActive && dpStyles.optionActive]}
                    onPress={() => {
                      onSelect(opt.value);
                      setOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        dpStyles.optionText,
                        isActive && dpStyles.optionTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {isActive && <View style={dpStyles.checkDot} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const dpStyles = StyleSheet.create({
  container: { flex: 1 },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  triggerText: { fontSize: 14, fontWeight: "600", color: "#1f2937", flex: 1 },
  placeholder: { color: "#9ca3af", fontWeight: "400" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  sheet: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "100%",
    maxWidth: 340,
    paddingTop: 20,
    paddingBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sheetTitle: { fontSize: 16, fontWeight: "700", color: "#1f2937" },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f3f4f6",
  },
  optionActive: { backgroundColor: "#eff6ff" },
  optionText: { fontSize: 15, color: "#374151" },
  optionTextActive: { color: "#2563eb", fontWeight: "700" },
  checkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3b82f6",
  },
});

// --- Detail Modal Component ---
function DetailModal({
  entry,
  visible,
  onClose,
}: {
  entry: LogEntry | null;
  visible: boolean;
  onClose: () => void;
}) {
  if (!entry) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={detailStyles.overlay}>
        <View style={detailStyles.container}>
          {/* Close Button */}
          <TouchableOpacity style={detailStyles.closeBtn} onPress={onClose}>
            <X size={22} color="#6b7280" />
          </TouchableOpacity>

          {/* Header */}
          <View style={detailStyles.header}>
            <Text style={detailStyles.activity}>{entry.activity}</Text>
            <View style={detailStyles.badge}>
              <MapPin size={12} color="#3b82f6" />
              <Text style={detailStyles.badgeText}>{entry.block}</Text>
            </View>
          </View>

          <View style={detailStyles.divider} />

          {/* Info Rows */}
          <View style={detailStyles.infoRow}>
            <Calendar size={16} color="#6b7280" />
            <View style={detailStyles.infoContent}>
              <Text style={detailStyles.infoLabel}>Tanggal Kegiatan</Text>
              <Text style={detailStyles.infoValue}>
                {formatDisplayDate(entry.date)}
              </Text>
            </View>
          </View>

          <View style={detailStyles.infoRow}>
            <ClipboardList size={16} color="#6b7280" />
            <View style={detailStyles.infoContent}>
              <Text style={detailStyles.infoLabel}>Dicatat Pada</Text>
              <Text style={detailStyles.infoValue}>
                {formatDateTime(entry.created_at)}
              </Text>
            </View>
          </View>

          {/* Notes */}
          <View style={detailStyles.infoRow}>
            <StickyNote size={16} color="#6b7280" />
            <View style={detailStyles.infoContent}>
              <Text style={detailStyles.infoLabel}>Catatan</Text>
              <Text style={detailStyles.infoValue}>
                {entry.notes?.trim() ? entry.notes : "Tidak ada catatan"}
              </Text>
            </View>
          </View>

          {/* Photo */}
          {entry.photo ? (
            <View style={detailStyles.photoSection}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <ImageIcon size={16} color="#6b7280" />
                <Text style={detailStyles.infoLabel}>Foto Bukti</Text>
              </View>
              <Image
                source={{ uri: entry.photo }}
                style={detailStyles.photo}
                resizeMode="cover"
              />
            </View>
          ) : null}

          {/* Close Action */}
          <TouchableOpacity style={detailStyles.closeAction} onPress={onClose}>
            <Text style={detailStyles.closeActionText}>Tutup</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const detailStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 16,
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: "#f3f4f6",
    padding: 8,
    borderRadius: 99,
  },
  header: {
    marginBottom: 4,
    paddingRight: 36,
  },
  activity: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1f2937",
    marginBottom: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3b82f6",
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  infoContent: { flex: 1 },
  infoLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
  },
  photoSection: {
    marginBottom: 16,
  },
  photo: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
  },
  closeAction: {
    backgroundColor: "#f3f4f6",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 4,
  },
  closeActionText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6b7280",
  },
});

// --- Main Page ---
export default function RiwayatLogbook() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logEntries } = useData();

  const [selectedBlock, setSelectedBlock] = useState("");
  const [selectedActivity, setSelectedActivity] = useState("");
  const [detailEntry, setDetailEntry] = useState<LogEntry | null>(null);

  const hasFilter = selectedBlock !== "" || selectedActivity !== "";

  const filteredLogs = useMemo(() => {
    if (!hasFilter) return [];
    return logEntries.filter((log) => {
      const matchBlock = selectedBlock === "" || log.block === selectedBlock;
      const matchActivity =
        selectedActivity === "" || log.activity === selectedActivity;
      return matchBlock && matchActivity;
    });
  }, [logEntries, selectedBlock, selectedActivity, hasFilter]);

  const resetFilters = () => {
    setSelectedBlock("");
    setSelectedActivity("");
  };

  const renderLogItem = useCallback(
    ({ item: log }: { item: LogEntry }) => (
      <TouchableOpacity
        style={s.logCard}
        activeOpacity={0.7}
        onPress={() => setDetailEntry(log)}
      >
        <View style={s.logCardTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.logActivity}>{log.activity}</Text>
            <Text style={s.logBlock}>{log.block}</Text>
          </View>
          <Text style={s.logDate}>{formatDisplayDate(log.date)}</Text>
        </View>
        {log.notes?.trim() ? (
          <View style={s.logNoteBox}>
            <Text style={s.logNoteText} numberOfLines={2}>
              {log.notes}
            </Text>
          </View>
        ) : null}
        {log.photo ? (
          <View style={s.logPhotoRow}>
            <Image source={{ uri: log.photo }} style={s.logThumb} />
            <Text style={s.logPhotoLabel}>Lihat foto →</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    ),
    [],
  );

  return (
    <View style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <View style={s.headerTop}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={s.backButton}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Riwayat Kegiatan</Text>
            <Text style={s.headerSub}>Filter dan telusuri logbook Anda</Text>
          </View>
        </View>
      </View>

      {/* Filter Card (fixed, not scrollable) */}
      <View style={s.filterCard}>
        <Text style={s.filterTitle}>🔎 Filter Riwayat</Text>
        <View style={s.filterRow}>
          <DropdownPicker
            label="Blok Tanam"
            options={BLOCKS}
            selectedValue={selectedBlock}
            onSelect={setSelectedBlock}
          />
          <View style={{ width: 12 }} />
          <DropdownPicker
            label="Jenis Kegiatan"
            options={ACTIVITIES}
            selectedValue={selectedActivity}
            onSelect={setSelectedActivity}
          />
        </View>
        {hasFilter && (
          <TouchableOpacity style={s.resetBtn} onPress={resetFilters}>
            <X size={14} color="#dc2626" />
            <Text style={s.resetText}>Reset Filter</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Results */}
      {!hasFilter ? (
        /* Empty state before filter */
        <View style={s.emptyCard}>
          <Text style={s.emptyIcon}>🔍</Text>
          <Text style={s.emptyTitle}>Belum Ada Filter Aktif</Text>
          <Text style={s.emptyText}>
            Silakan pilih Blok dan/atau Jenis Kegiatan{"\n"}untuk melihat
            riwayat.
          </Text>
        </View>
      ) : filteredLogs.length === 0 ? (
        /* No results */
        <View style={s.emptyCard}>
          <Text style={s.emptyIcon}>📭</Text>
          <Text style={s.emptyTitle}>Tidak Ditemukan</Text>
          <Text style={s.emptyText}>
            Tidak ada kegiatan yang cocok dengan filter yang dipilih.
          </Text>
        </View>
      ) : (
        /* Results list — FlatList for virtualized rendering */
        <FlatList
          data={filteredLogs}
          renderItem={renderLogItem}
          keyExtractor={(item) => item.id}
          initialNumToRender={8}
          maxToRenderPerBatch={5}
          windowSize={5}
          removeClippedSubviews={true}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListHeaderComponent={
            <Text style={s.resultCount}>
              {filteredLogs.length} kegiatan ditemukan
            </Text>
          }
        />
      )}

      {/* Detail Modal */}
      <DetailModal
        entry={detailEntry}
        visible={detailEntry !== null}
        onClose={() => setDetailEntry(null)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  scrollContent: { paddingBottom: 40 },

  // Header
  header: {
    backgroundColor: "#3b82f6",
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 10,
    borderRadius: 99,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  headerSub: { fontSize: 13, color: "#dbeafe", marginTop: 2 },

  // Filter Card
  filterCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: "row",
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 99,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  resetText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#dc2626",
  },

  // Empty / Results
  emptyCard: {
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 20,
    paddingVertical: 48,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 20,
  },

  resultCount: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },

  // Log Card
  logCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  logCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  logActivity: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
  },
  logBlock: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  logDate: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: "500",
  },
  logNoteBox: {
    marginTop: 10,
    backgroundColor: "#f9fafb",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  logNoteText: {
    fontSize: 13,
    color: "#4b5563",
    lineHeight: 18,
  },
  logPhotoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 8,
  },
  logThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
  },
  logPhotoLabel: {
    fontSize: 12,
    color: "#3b82f6",
    fontWeight: "600",
  },
});
