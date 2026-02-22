import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import {
  BookOpen,
  Calendar,
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Trash2,
  X,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useData } from "../../src/contexts/data-context";
import { logger } from "../../src/utils/logger";
import SyncStatusBar from "./sync-status-bar";

// ─── Inline Dropdown Picker ─────────────────────────────────────────────────
interface DropdownPickerProps {
  label: string;
  options: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
  placeholder?: string;
}

function DropdownPicker({
  label,
  options,
  selectedValue,
  onSelect,
  placeholder = "Pilih...",
}: DropdownPickerProps) {
  const [open, setOpen] = useState(false);
  return (
    <View style={dpStyles.wrapper}>
      <Text style={dpStyles.label}>{label}</Text>
      <TouchableOpacity
        style={[
          dpStyles.trigger,
          selectedValue ? dpStyles.triggerActive : null,
        ]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[dpStyles.triggerText, !selectedValue && dpStyles.placeholder]}
        >
          {selectedValue || placeholder}
        </Text>
        <ChevronDown size={18} color={selectedValue ? "#3b82f6" : "#9ca3af"} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity
          style={dpStyles.overlay}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View style={dpStyles.sheet}>
            <Text style={dpStyles.sheetTitle}>{label}</Text>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  dpStyles.option,
                  selectedValue === opt && dpStyles.optionActive,
                ]}
                onPress={() => {
                  onSelect(opt);
                  setOpen(false);
                }}
              >
                <Text
                  style={[
                    dpStyles.optionText,
                    selectedValue === opt && dpStyles.optionTextActive,
                  ]}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const dpStyles = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    padding: 13,
    backgroundColor: "#fff",
  },
  triggerActive: { borderColor: "#93c5fd", backgroundColor: "#eff6ff" },
  triggerText: { fontSize: 14, color: "#1f2937", fontWeight: "500" },
  placeholder: { color: "#9ca3af", fontWeight: "400" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 12,
  },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 4,
  },
  optionActive: { backgroundColor: "#eff6ff" },
  optionText: { fontSize: 15, color: "#374151" },
  optionTextActive: { color: "#2563eb", fontWeight: "700" },
});

// ─── Main Component ─────────────────────────────────────────────────────────

export default function LogbookPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    logEntries,
    addLogEntry: addLogEntryToDb,
    addHarvestRecord,
    addBulkPlants,
    updatePlantStatusByBlock,
    refreshDashboard,
  } = useData();

  // Form state
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [selectedBlock, setSelectedBlock] = useState("");
  const [selectedActivity, setSelectedActivity] = useState("");
  const [notes, setNotes] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic fields — Panen
  const [grade, setGrade] = useState("");
  const [jumlahBuah, setJumlahBuah] = useState("");
  const [beratTotal, setBeratTotal] = useState("");

  // Dynamic fields — Menanam
  const [jumlahBibit, setJumlahBibit] = useState("");

  // Dynamic fields — Inspeksi
  const [kondisiTanaman, setKondisiTanaman] = useState("");
  const [jumlahTerdampak, setJumlahTerdampak] = useState("");

  // Dynamic fields — Pemupukan / Pestisida
  const [jenisPupukObat, setJenisPupukObat] = useState("");
  const [dosis, setDosis] = useState("");

  const blocks = [
    "Blok A1",
    "Blok A2",
    "Blok B1",
    "Blok B2",
    "Blok C1",
    "Blok C2",
  ];
  const activities = [
    "Penyiraman",
    "Pemupukan",
    "Panen",
    "Menanam",
    "Pestisida",
    "Pemangkasan",
    "Inspeksi",
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

  const getDaysInMonth = (year: number, month: number) =>
    new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) =>
    new Date(year, month, 1).getDay();

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(pickerYear, pickerMonth);
    const firstDay = getFirstDayOfMonth(pickerYear, pickerMonth);
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const handleSelectDate = (day: number) => {
    const month = String(pickerMonth + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    setSelectedDate(`${pickerYear}-${month}-${dayStr}`);
    setShowDatePicker(false);
  };

  const prevMonth = () => {
    if (pickerMonth === 0) {
      setPickerMonth(11);
      setPickerYear(pickerYear - 1);
    } else {
      setPickerMonth(pickerMonth - 1);
    }
  };

  const nextMonth = () => {
    if (pickerMonth === 11) {
      setPickerMonth(0);
      setPickerYear(pickerYear + 1);
    } else {
      setPickerMonth(pickerMonth + 1);
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    const parts = dateStr.split("-");
    const day = parseInt(parts[2]);
    const month = MONTH_FULL[parseInt(parts[1]) - 1];
    return `${day} ${month} ${parts[0]}`;
  };

  // Reset all dynamic fields when activity changes
  const handleSelectActivity = (activity: string) => {
    setSelectedActivity(activity);
    // Reset dynamic fields
    setGrade("");
    setJumlahBuah("");
    setBeratTotal("");
    setJumlahBibit("");
    setKondisiTanaman("");
    setJumlahTerdampak("");
    setJenisPupukObat("");
    setDosis("");
  };

  // --- Camera ---
  const handlePhotoUpload = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Izin Ditolak",
          "Maaf, kami butuh izin kamera untuk fitur ini.",
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.length > 0) {
        setPhotoPreview(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert(
        "Kamera Tidak Tersedia",
        "Tidak dapat membuka kamera. Pastikan perangkat memiliki kamera dan izin sudah diberikan.",
      );
      logger.error("[Logbook] Camera error:", error);
    }
  };

  // ─── Build enriched notes ─────────────────────────────────────────────────
  const buildEnrichedNotes = (): string => {
    const userNotes = notes.trim();
    let prefix = "";

    if (selectedActivity === "Panen") {
      prefix = `Panen ${jumlahBuah || "0"} biji (${beratTotal || "0"} kg) - ${grade || "N/A"}.`;
    } else if (selectedActivity === "Menanam") {
      prefix = `Menanam ${jumlahBibit || "0"} bibit/biji.`;
    } else if (selectedActivity === "Inspeksi") {
      prefix = `Inspeksi: ${kondisiTanaman || "N/A"}, ${jumlahTerdampak || "0"} tanaman terdampak.`;
    } else if (
      selectedActivity === "Pemupukan" ||
      selectedActivity === "Pestisida"
    ) {
      prefix = `Jenis: ${jenisPupukObat || "-"}, Dosis: ${dosis || "-"}.`;
    }

    if (prefix && userNotes) return `${prefix} ${userNotes}`;
    if (prefix) return prefix;
    return userNotes;
  };

  // ─── Validate dynamic fields ──────────────────────────────────────────────
  const validateDynamicFields = (): string | null => {
    if (selectedActivity === "Panen") {
      if (!grade) return "Silakan pilih Grade/Kualitas untuk kegiatan Panen.";
      if (!beratTotal || isNaN(Number(beratTotal)))
        return "Berat Total harus diisi dengan angka.";
    } else if (selectedActivity === "Menanam") {
      if (!jumlahBibit || isNaN(Number(jumlahBibit)) || Number(jumlahBibit) < 1)
        return "Jumlah Bibit harus diisi (minimal 1).";
      if (Number(jumlahBibit) > 5000)
        return "Jumlah bibit maksimal dalam satu kali input adalah 5000.";
    } else if (selectedActivity === "Inspeksi") {
      if (!kondisiTanaman)
        return "Silakan pilih Kondisi Tanaman untuk Inspeksi.";
      if (
        !jumlahTerdampak ||
        isNaN(Number(jumlahTerdampak)) ||
        Number(jumlahTerdampak) < 1
      )
        return "Jumlah Tanaman Terdampak harus diisi (minimal 1).";
    } else if (
      selectedActivity === "Pemupukan" ||
      selectedActivity === "Pestisida"
    ) {
      if (!jenisPupukObat.trim()) return "Jenis Pupuk/Obat harus diisi.";
      if (!dosis.trim()) return "Dosis harus diisi.";
    }
    return null;
  };

  // ─── Submit with data splitting ───────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedBlock || !selectedActivity) {
      Alert.alert("Data Belum Lengkap", "Mohon pilih Blok dan Jenis Kegiatan.");
      return;
    }

    const fieldError = validateDynamicFields();
    if (fieldError) {
      Alert.alert("Data Belum Lengkap", fieldError);
      return;
    }

    setIsSubmitting(true);
    try {
      const enrichedNotes = buildEnrichedNotes();

      // 1. Always save to log_entries (primary operation)
      await addLogEntryToDb({
        date: selectedDate,
        block: selectedBlock,
        activity: selectedActivity,
        notes: enrichedNotes,
        photo: photoPreview,
      });

      // 2. Data splitting — kumpulkan operasi tambahan lalu eksekusi bersamaan
      const additionalOps: Promise<any>[] = [];

      if (selectedActivity === "Panen") {
        additionalOps.push(
          addHarvestRecord({
            date: selectedDate,
            block: selectedBlock,
            quantity: parseFloat(beratTotal) || 0,
            quality: grade,
            notes: enrichedNotes,
          }),
        );
      } else if (selectedActivity === "Menanam") {
        const count = parseInt(jumlahBibit, 10) || 0;
        if (count > 0) {
          additionalOps.push(addBulkPlants(selectedBlock, count, selectedDate));
        }
      } else if (selectedActivity === "Inspeksi") {
        const statusMap: Record<string, "sehat" | "perhatian" | "sakit"> = {
          Sehat: "sehat",
          "Perlu Perhatian": "perhatian",
          Sakit: "sakit",
        };
        const mappedStatus = statusMap[kondisiTanaman];
        const count = parseInt(jumlahTerdampak, 10) || 0;
        if (mappedStatus && count > 0) {
          additionalOps.push(
            updatePlantStatusByBlock(selectedBlock, mappedStatus, count),
          );
        }
      }

      // Eksekusi operasi tambahan dengan allSettled agar partial failure tidak crash
      if (additionalOps.length > 0) {
        const results = await Promise.allSettled(additionalOps);
        const failures = results.filter((r) => r.status === "rejected");
        if (failures.length > 0) {
          logger.error(
            "[Logbook] Partial submit failures:",
            failures.map((f) => (f as PromiseRejectedResult).reason),
          );
        }
      }

      // Refresh dashboard so stats update immediately
      await refreshDashboard();

      // Reset form
      setSelectedBlock("");
      handleSelectActivity("");
      setNotes("");
      setPhotoPreview(null);
      Alert.alert("Berhasil", "Data kegiatan berhasil disimpan!");
    } catch (error) {
      Alert.alert("Gagal", "Terjadi kesalahan saat menyimpan data.");
      logger.error("[Logbook] handleSubmit error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Conditional Fields Renderer ──────────────────────────────────────────
  const renderDynamicFields = () => {
    if (selectedActivity === "Panen") {
      return (
        <View style={styles.dynamicSection}>
          <View style={styles.dynamicHeader}>
            <Text style={styles.dynamicHeaderText}>Detail Panen</Text>
          </View>
          <DropdownPicker
            label="Kualitas / Grade"
            options={["Grade A", "Grade B", "Grade C"]}
            selectedValue={grade}
            onSelect={setGrade}
            placeholder="Pilih grade..."
          />
          <View style={styles.inputGroup}>
            <Text style={styles.dynLabel}>Jumlah Buah (biji)</Text>
            <TextInput
              style={styles.dynInput}
              placeholder="Contoh: 50"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={jumlahBuah}
              onChangeText={setJumlahBuah}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.dynLabel}>Berat Total (kg)</Text>
            <TextInput
              style={styles.dynInput}
              placeholder="Contoh: 10.5"
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
              value={beratTotal}
              onChangeText={setBeratTotal}
            />
          </View>
        </View>
      );
    }

    if (selectedActivity === "Menanam") {
      return (
        <View style={styles.dynamicSection}>
          <View style={styles.dynamicHeader}>
            <Text style={styles.dynamicHeaderText}>Detail Menanam</Text>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.dynLabel}>
              Jumlah Bibit / Biji yang Ditanam
            </Text>
            <TextInput
              style={styles.dynInput}
              placeholder="Contoh: 25"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              maxLength={4}
              value={jumlahBibit}
              onChangeText={setJumlahBibit}
            />
          </View>
        </View>
      );
    }

    if (selectedActivity === "Inspeksi") {
      return (
        <View style={styles.dynamicSection}>
          <View style={styles.dynamicHeader}>
            <Text style={styles.dynamicHeaderText}>Detail Inspeksi</Text>
          </View>
          <DropdownPicker
            label="Kondisi Tanaman"
            options={["Sehat", "Perlu Perhatian", "Sakit"]}
            selectedValue={kondisiTanaman}
            onSelect={setKondisiTanaman}
            placeholder="Pilih kondisi..."
          />
          <View style={styles.inputGroup}>
            <Text style={styles.dynLabel}>Jumlah Tanaman Terdampak</Text>
            <TextInput
              style={styles.dynInput}
              placeholder="Contoh: 10"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={jumlahTerdampak}
              onChangeText={setJumlahTerdampak}
            />
          </View>
        </View>
      );
    }

    if (selectedActivity === "Pemupukan" || selectedActivity === "Pestisida") {
      const isPupuk = selectedActivity === "Pemupukan";
      return (
        <View style={styles.dynamicSection}>
          <View style={styles.dynamicHeader}>
            <Text style={styles.dynamicHeaderText}>
              {isPupuk ? "Detail Pemupukan" : "Detail Pestisida"}
            </Text>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.dynLabel}>
              {isPupuk ? "Jenis Pupuk" : "Jenis Obat/Pestisida"}
            </Text>
            <TextInput
              style={styles.dynInput}
              placeholder={
                isPupuk ? "Contoh: NPK, Urea" : "Contoh: Decis 25 EC"
              }
              placeholderTextColor="#9ca3af"
              value={jenisPupukObat}
              onChangeText={setJenisPupukObat}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.dynLabel}>Dosis</Text>
            <TextInput
              style={styles.dynInput}
              placeholder="Contoh: 300 gram / 2 liter"
              placeholderTextColor="#9ca3af"
              value={dosis}
              onChangeText={setDosis}
            />
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <BookOpen size={24} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Logbook Digital</Text>
            <Text style={styles.headerSubtitleText}>
              Catat kegiatan kebun Anda
            </Text>
          </View>
        </View>
        <SyncStatusBar />
      </View>

      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="slide">
        <View style={styles.dateModalOverlay}>
          <View style={styles.dateModalContent}>
            <View style={styles.dateModalHeader}>
              <Text style={styles.dateModalTitle}>Pilih Tanggal</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.monthNavigation}>
              <TouchableOpacity onPress={prevMonth} style={styles.monthNavBtn}>
                <ChevronLeft size={22} color="#3b82f6" />
              </TouchableOpacity>
              <Text style={styles.monthYearText}>
                {MONTH_FULL[pickerMonth]} {pickerYear}
              </Text>
              <TouchableOpacity onPress={nextMonth} style={styles.monthNavBtn}>
                <ChevronRight size={22} color="#3b82f6" />
              </TouchableOpacity>
            </View>
            <View style={styles.weekDaysRow}>
              {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d) => (
                <Text key={d} style={styles.weekDayText}>
                  {d}
                </Text>
              ))}
            </View>
            <View style={styles.daysGrid}>
              {generateCalendarDays().map((day, idx) => {
                const dateStr = day
                  ? `${pickerYear}-${String(pickerMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                  : "";
                const todayStr = new Date().toISOString().split("T")[0];
                const isSelected = day ? selectedDate === dateStr : false;
                const isToday = day ? todayStr === dateStr : false;
                const isFuture = day ? dateStr > todayStr : false;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.dayCell,
                      isSelected ? styles.dayCellSelected : undefined,
                      isToday && !isSelected ? styles.dayCellToday : undefined,
                    ]}
                    onPress={() => day && !isFuture && handleSelectDate(day)}
                    disabled={!day || isFuture}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isSelected ? styles.dayTextSelected : undefined,
                        isToday && !isSelected
                          ? styles.dayTextToday
                          : undefined,
                        isFuture ? styles.dayTextPast : undefined,
                      ]}
                    >
                      {day || ""}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Navigate to History */}
          <TouchableOpacity
            style={styles.historyNavButton}
            onPress={() => router.push("/riwayat-logbook")}
            activeOpacity={0.8}
          >
            <View style={styles.historyNavLeft}>
              <View style={styles.historyNavIcon}>
                <ClipboardList size={20} color="#3b82f6" />
              </View>
              <View>
                <Text style={styles.historyNavTitle}>
                  Lihat Riwayat Lengkap
                </Text>
                <Text style={styles.historyNavSub}>
                  {logEntries.length} kegiatan tercatat
                </Text>
              </View>
            </View>
            <Text style={styles.historyNavArrow}>➔</Text>
          </TouchableOpacity>

          {/* Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>📝 Input Kegiatan Baru</Text>

            {/* Date Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tanggal</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => {
                  const parts = selectedDate.split("-");
                  setPickerYear(parseInt(parts[0]));
                  setPickerMonth(parseInt(parts[1]) - 1);
                  setShowDatePicker(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.dateText}>
                  {formatDisplayDate(selectedDate)}
                </Text>
                <Calendar size={20} color="#3b82f6" />
              </TouchableOpacity>
            </View>

            {/* Block Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Pilih Blok Tanam</Text>
              <View style={styles.gridContainer}>
                {blocks.map((block) => (
                  <TouchableOpacity
                    key={block}
                    onPress={() => setSelectedBlock(block)}
                    style={[
                      styles.gridButton,
                      selectedBlock === block
                        ? styles.buttonActive
                        : styles.buttonInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        selectedBlock === block
                          ? styles.textActive
                          : styles.textInactive,
                      ]}
                    >
                      {block}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Activity Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Jenis Kegiatan</Text>
              <View style={styles.gridContainer}>
                {activities.map((activity) => (
                  <TouchableOpacity
                    key={activity}
                    onPress={() => handleSelectActivity(activity)}
                    style={[
                      styles.gridButtonLarge,
                      selectedActivity === activity
                        ? styles.buttonActive
                        : styles.buttonInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        selectedActivity === activity
                          ? styles.textActive
                          : styles.textInactive,
                      ]}
                    >
                      {activity}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ── Conditional Dynamic Fields ── */}
            {renderDynamicFields()}

            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Catatan (Opsional)</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Tambahkan catatan jika perlu..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                value={notes}
                onChangeText={setNotes}
                textAlignVertical="top"
              />
            </View>

            {/* Photo Upload */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Foto Bukti (Opsional)</Text>
              {photoPreview ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: photoPreview }}
                    style={styles.imagePreview}
                  />
                  <TouchableOpacity
                    onPress={() => setPhotoPreview(null)}
                    style={styles.removePhotoButton}
                  >
                    <Trash2 size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handlePhotoUpload}
                  style={styles.uploadBox}
                >
                  <Camera size={32} color="#9ca3af" />
                  <Text style={styles.uploadText}>Ketuk untuk ambil foto</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Submit */}
            <TouchableOpacity
              onPress={handleSubmit}
              style={[
                styles.submitButton,
                isSubmitting && styles.submitButtonDisabled,
              ]}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Simpan Data</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  scrollContent: { paddingBottom: 40 },

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
    zIndex: 10,
  },
  headerContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIconContainer: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 8,
    borderRadius: 99,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  headerSubtitleText: { fontSize: 13, color: "#dbeafe" },

  // Navigate to History button
  historyNavButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#bfdbfe",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  historyNavLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  historyNavIcon: {
    backgroundColor: "#eff6ff",
    padding: 10,
    borderRadius: 12,
  },
  historyNavTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e40af",
  },
  historyNavSub: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  historyNavArrow: {
    fontSize: 20,
    color: "#3b82f6",
    fontWeight: "bold",
  },

  formCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 20,
  },

  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },

  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#eff6ff",
  },
  dateText: { fontSize: 16, color: "#1f2937", fontWeight: "500" },

  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridButton: {
    width: "31%",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  gridButtonLarge: {
    width: "48%",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  buttonInactive: { backgroundColor: "#f3f4f6", borderColor: "#e5e7eb" },
  buttonActive: { backgroundColor: "#3b82f6", borderColor: "#2563eb" },
  buttonText: { fontSize: 14, fontWeight: "600" },
  textInactive: { color: "#4b5563" },
  textActive: { color: "#ffffff", fontWeight: "bold" },

  // Dynamic fields section
  dynamicSection: {
    backgroundColor: "#f0fdf4",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  dynamicHeader: {
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#dcfce7",
  },
  dynamicHeaderText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#166534",
  },
  dynLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  dynInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    padding: 13,
    backgroundColor: "#fff",
    fontSize: 14,
    color: "#1f2937",
  },

  textArea: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    padding: 14,
    height: 100,
    backgroundColor: "#fff",
    fontSize: 14,
    color: "#1f2937",
  },

  uploadBox: {
    height: 120,
    borderWidth: 2,
    borderColor: "#d1d5db",
    borderStyle: "dashed",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
  },
  uploadText: { color: "#6b7280", marginTop: 8 },
  imagePreviewContainer: {
    position: "relative",
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
  },
  imagePreview: { width: "100%", height: "100%", resizeMode: "cover" },
  removePhotoButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 8,
    borderRadius: 20,
  },

  submitButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#93c5fd",
  },
  submitButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },

  // Date Picker Modal
  dateModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  dateModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  dateModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  dateModalTitle: { fontSize: 20, fontWeight: "bold", color: "#1f2937" },
  monthNavigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  monthNavBtn: {
    padding: 8,
    borderRadius: 99,
    backgroundColor: "#eff6ff",
  },
  monthYearText: { fontSize: 16, fontWeight: "600", color: "#374151" },
  weekDaysRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
  },
  weekDayText: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: "600",
    width: 40,
    textAlign: "center",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 99,
  },
  dayCellSelected: { backgroundColor: "#3b82f6" },
  dayCellToday: {
    backgroundColor: "#eff6ff",
    borderWidth: 1.5,
    borderColor: "#3b82f6",
  },
  dayText: { fontSize: 14, color: "#374151" },
  dayTextSelected: { color: "#fff", fontWeight: "bold" },
  dayTextToday: { color: "#3b82f6", fontWeight: "600" },
  dayTextPast: { color: "#d1d5db" },
});
