import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Construction,
  MapPin,
  QrCode,
  ScanLine,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: screenWidth } = Dimensions.get("window");

export default function QRScannerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [showDevModal, setShowDevModal] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset modal setiap kali screen mendapat focus
  useFocusEffect(
    useCallback(() => {
      setShowDevModal(true);
    }, []),
  );

  // Cleanup timer saat unmount agar tidak setState pada component yang sudah mati
  useEffect(() => {
    return () => {
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    };
  }, []);
  const [scannedBlock, setScannedBlock] = useState<string | null>(null);
  const [showLogbookForm, setShowLogbookForm] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState("");

  const activities = [
    "💧 Penyiraman",
    "🌱 Pemupukan",
    "🪴 Panen",
    "🧪 Pestisida",
    "✂️ Pemangkasan",
    "🔍 Inspeksi",
  ];

  const handleStartScan = () => {
    setIsScanning(true);
    // Simulasi QR scan setelah 2 detik
    // Di aplikasi nyata, ini akan memicu komponen Camera
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    scanTimerRef.current = setTimeout(() => {
      setScannedBlock("Blok A1");
      setIsScanning(false);
      setShowLogbookForm(true);
    }, 2000);
  };

  const handleSubmitActivity = () => {
    if (!selectedActivity) {
      Alert.alert("Peringatan", "Pilih jenis kegiatan terlebih dahulu");
      return;
    }

    // Simulasi save
    Alert.alert("Sukses", `Data berhasil disimpan untuk ${scannedBlock}!`);

    // Reset
    setScannedBlock(null);
    setShowLogbookForm(false);
    setSelectedActivity("");
  };

  const handleReset = () => {
    setScannedBlock(null);
    setShowLogbookForm(false);
    setSelectedActivity("");
    setIsScanning(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6366f1" />

      {/* Development Modal Overlay */}
      <Modal
        visible={showDevModal}
        transparent={true}
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconCircle}>
              <Construction color="#f97316" size={48} />
            </View>
            <Text style={styles.modalTitle}>Fitur Dalam Pengembangan</Text>
            <Text style={styles.modalSubtitle}>
              Fitur Scan QR sedang dalam tahap pengembangan dan belum dapat
              digunakan sepenuhnya. Kami sedang bekerja keras untuk
              menyelesaikannya!
            </Text>
            <View style={styles.modalBadge}>
              <Text style={styles.modalBadgeText}>🚧 Coming Soon</Text>
            </View>
            <TouchableOpacity
              style={styles.modalBackButton}
              onPress={() => {
                setShowDevModal(false);
                router.replace("/(tabs)" as any);
              }}
            >
              <ArrowLeft color="#fff" size={20} />
              <Text style={styles.modalBackButtonText}>Kembali ke Beranda</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <ScanLine size={24} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Scan QR Blok</Text>
            <Text style={styles.headerSubtitle}>
              Identifikasi lokasi dengan QR Code
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!showLogbookForm ? (
          <>
            {/* Info Box */}
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>📱 Cara Menggunakan:</Text>
              <View style={styles.stepsContainer}>
                <Text style={styles.stepText}>
                  1. Tekan tombol "Mulai Scan QR"
                </Text>
                <Text style={styles.stepText}>
                  2. Arahkan kamera ke QR Code
                </Text>
                <Text style={styles.stepText}>
                  3. Tunggu hingga QR terdeteksi
                </Text>
                <Text style={styles.stepText}>4. Isi data kegiatan</Text>
              </View>
            </View>

            {/* Scanner Area */}
            <View style={styles.scannerCard}>
              {!isScanning ? (
                <View style={styles.scannerPlaceholder}>
                  <View style={styles.iconCircle}>
                    <QrCode color="#4f46e5" size={60} />
                  </View>
                  <Text style={styles.readyTitle}>Siap untuk Scan</Text>
                  <Text style={styles.readySubtitle}>
                    Pastikan QR Code terlihat jelas dan pencahayaan cukup
                  </Text>

                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleStartScan}
                  >
                    <Camera
                      color="white"
                      size={24}
                      style={{ marginRight: 10 }}
                    />
                    <Text style={styles.primaryButtonText}>Mulai Scan QR</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.scanningContainer}>
                  <View style={styles.scanningAnimationBox}>
                    {/* Simulasi Scanning Animation */}
                    <View style={styles.scanLine} />
                    <ActivityIndicator
                      size="large"
                      color="#6366f1"
                      style={{ marginTop: 60 }}
                    />
                  </View>
                  <Text style={styles.scanningText}>Sedang memindai...</Text>
                </View>
              )}
            </View>

            {/* Example Section */}
            <View style={styles.exampleSection}>
              <Text style={styles.sectionTitle}>📍 Ilustrasi QR Code:</Text>

              <Image
                source={{
                  uri: "https://images.unsplash.com/photo-1595079676339-1534801fafde?auto=format&fit=crop&q=80&w=1000",
                }}
                style={styles.exampleImage}
              />

              <Text style={styles.exampleSubtitle}>Contoh Lokasi:</Text>
              <View style={styles.locationList}>
                <View style={styles.locationItem}>
                  <MapPin color="#16a34a" size={20} />
                  <Text style={styles.locationText}>
                    Tiang di setiap blok tanam
                  </Text>
                </View>
                <View style={styles.locationItem}>
                  <MapPin color="#16a34a" size={20} />
                  <Text style={styles.locationText}>
                    Pintu masuk greenhouse
                  </Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          <>
            {/* Scan Success */}
            <View style={styles.successBox}>
              <CheckCircle2 color="#16a34a" size={40} />
              <View style={styles.successTextContainer}>
                <Text style={styles.successTitle}>QR Terdeteksi!</Text>
                <Text style={styles.successSubtitle}>
                  Lokasi:{" "}
                  <Text style={{ fontWeight: "bold" }}>{scannedBlock}</Text>
                </Text>
              </View>
            </View>

            {/* Form */}
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>📝 Catat Kegiatan</Text>

              <Text style={styles.label}>Pilih Jenis Kegiatan:</Text>
              <View style={styles.gridContainer}>
                {activities.map((activity) => (
                  <TouchableOpacity
                    key={activity}
                    onPress={() => setSelectedActivity(activity)}
                    style={[
                      styles.gridButton,
                      selectedActivity === activity && styles.gridButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.gridButtonText,
                        selectedActivity === activity &&
                          styles.gridButtonTextActive,
                      ]}
                    >
                      {activity}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, { marginTop: 20 }]}
                onPress={handleSubmitActivity}
              >
                <Text style={styles.primaryButtonText}>Simpan Data</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.outlineButton}
                onPress={handleReset}
              >
                <Text style={styles.outlineButtonText}>Scan QR Lain</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconContainer: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 8,
    borderRadius: 99,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    color: "#e0e7ff",
    fontSize: 13,
  },
  content: {
    padding: 16,
  },
  infoBox: {
    backgroundColor: "#eff6ff", // blue-50
    borderColor: "#bfdbfe", // blue-200
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  infoTitle: {
    color: "#1e40af", // blue-800
    fontWeight: "bold",
    marginBottom: 8,
  },
  stepsContainer: {
    gap: 4,
  },
  stepText: {
    color: "#1d4ed8", // blue-700
    fontSize: 14,
    marginBottom: 2,
  },
  scannerCard: {
    backgroundColor: "#fff",
    borderColor: "#e5e7eb",
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  scannerPlaceholder: {
    alignItems: "center",
  },
  iconCircle: {
    backgroundColor: "#e0e7ff",
    borderRadius: 50,
    padding: 24,
    marginBottom: 16,
  },
  readyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  readySubtitle: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: 14,
    marginBottom: 24,
  },
  scanningContainer: {
    alignItems: "center",
    padding: 20,
  },
  scanningAnimationBox: {
    width: 200,
    height: 200,
    borderWidth: 4,
    borderColor: "#6366f1",
    borderRadius: 16,
    marginBottom: 24,
    overflow: "hidden",
    position: "relative",
    alignItems: "center",
  },
  scanLine: {
    width: "100%",
    height: 2,
    backgroundColor: "#6366f1",
    position: "absolute",
    top: "50%",
  },
  scanningText: {
    color: "#4b5563",
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: "#6366f1",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: "100%",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  exampleSection: {
    backgroundColor: "#f9fafb", // gray-50
    borderColor: "#e5e7eb",
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: {
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 12,
  },
  exampleImage: {
    width: "100%",
    height: 150,
    borderRadius: 12,
    marginBottom: 16,
    resizeMode: "cover",
  },
  exampleSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  locationList: {
    gap: 8,
  },
  locationItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  locationText: {
    marginLeft: 12,
    color: "#374151",
  },
  successBox: {
    backgroundColor: "#f0fdf4", // green-50
    borderColor: "#86efac", // green-300
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "center",
  },
  successTextContainer: {
    marginLeft: 16,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#14532d", // green-900
  },
  successSubtitle: {
    color: "#15803d", // green-700
    marginTop: 4,
  },
  formCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    padding: 24,
    elevation: 2,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 20,
  },
  label: {
    color: "#374151",
    marginBottom: 12,
    fontWeight: "500",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridButton: {
    width: "48%", // roughly half
    backgroundColor: "#f3f4f6",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  gridButtonActive: {
    backgroundColor: "#6366f1",
    borderColor: "#4f46e5",
  },
  gridButtonText: {
    color: "#374151",
    fontWeight: "500",
  },
  gridButtonTextActive: {
    color: "#fff",
    fontWeight: "bold",
  },
  outlineButton: {
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#d1d5db",
    alignItems: "center",
  },
  outlineButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },

  // Development Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    width: "100%",
    maxWidth: 360,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  modalIconCircle: {
    backgroundColor: "#fff7ed",
    borderRadius: 50,
    padding: 20,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: "#fed7aa",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 12,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  modalBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  modalBadgeText: {
    color: "#92400e",
    fontWeight: "600",
    fontSize: 14,
  },
  modalBackButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "#6366f1",
  },
  modalBackButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
