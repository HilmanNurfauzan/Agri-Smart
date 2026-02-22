import { LinearGradient } from "expo-linear-gradient"; // Pengganti bg-gradient
import { useRouter } from "expo-router"; // Pengganti onNavigate
import React from "react";
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// Menggunakan lucide-react-native (bukan lucide-react biasa)
import {
  Activity,
  BarChart3,
  ClipboardList,
  MessageSquare,
  QrCode,
  Sprout,
} from "lucide-react-native";

const { width } = Dimensions.get("window");

export default function HomePage() {
  const router = useRouter();

  // Data Menu
  const menuItems = [
    {
      id: "diagnosis",
      route: "/diagnosis",
      title: "Cek Penyakit",
      subtitle: "Diagnosa gejala",
      icon: Activity,
      color: "#ef4444", // bg-red-500
    },
    {
      id: "logbook",
      route: "/(tabs)/logbook",
      title: "Logbook",
      subtitle: "Catat kegiatan",
      icon: ClipboardList,
      color: "#3b82f6", // bg-blue-500
    },
    {
      id: "chatbot",
      route: "/(tabs)/chatbot",
      title: "Asisten AI",
      subtitle: "Tanya jawab",
      icon: MessageSquare,
      color: "#f97316", // bg-orange-500
    },
    {
      id: "dashboard",
      route: "/(tabs)/dashboard",
      title: "Dashboard",
      subtitle: "Pantau kondisi",
      icon: BarChart3,
      color: "#16a34a", // bg-green-600
    },
    {
      id: "scanner",
      route: "/(tabs)/scanner",
      title: "Scan QR",
      subtitle: "Identifikasi lokasi",
      icon: QrCode,
      color: "#6366f1", // bg-indigo-500
    },
  ];

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={["#f0fdf4", "#ffffff"]} // from-green-50 to-white
        style={styles.background}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerIconContainer}>
              <Sprout size={24} color="#fff" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Agri-Smart</Text>
              <Text style={styles.headerSubtitle}>
                Kelola kebun Anda dengan mudah
              </Text>
            </View>
          </View>

          {/* Header Image */}
          <View style={styles.imageContainer}>
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1580050530399-479dc872b08b?q=80&w=1080&auto=format&fit=crop",
              }}
              style={styles.headerImage}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* Menu Grid */}
        <View style={styles.gridContainer}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                activeOpacity={0.7} // Efek saat ditekan
                onPress={() => router.push(item.route as any)} // Navigasi ke halaman tujuan
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: item.color },
                  ]}
                >
                  <Icon color="#fff" size={24} strokeWidth={2.5} />
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Quick Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>💡 Tips Hari Ini</Text>
          <Text style={styles.infoText}>
            Gunakan fitur <Text style={{ fontWeight: "bold" }}>Scan QR</Text>{" "}
            untuk mencatat kegiatan dengan cepat dan akurat sesuai lokasi blok
            tanam.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// Styling Manual (Pengganti Tailwind CSS)
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "100%",
  },
  scrollContent: {
    paddingBottom: 30,
  },
  header: {
    backgroundColor: "#16a34a",
    paddingTop: 50,
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  headerIconContainer: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 8,
    borderRadius: 99,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#dcfce7",
  },
  imageContainer: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    backgroundColor: "#fff",
  },
  headerImage: {
    width: "100%",
    height: 128, // h-32
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between", // Agar ada jarak di tengah
    padding: 16,
  },
  card: {
    width: "48%", // Agar jadi 2 kolom (grid-cols-2)
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2, // Shadow untuk Android
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937", // gray-800
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#6b7280", // gray-500
  },
  infoCard: {
    marginHorizontal: 16,
    backgroundColor: "#f0fdf4", // green-50
    borderWidth: 1,
    borderColor: "#bbf7d0", // green-200
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#166534", // green-800
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#15803d", // green-700
    lineHeight: 20,
  },
});
