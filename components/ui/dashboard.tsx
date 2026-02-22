import { Stack } from "expo-router";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  TrendingUp,
} from "lucide-react-native";
import React, { useEffect } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import { BarChart, PieChart } from "react-native-chart-kit";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useData } from "../../src/contexts/data-context";
import { formatRelativeTime } from "../../src/database/dashboard-repository";
import SyncStatusBar from "./sync-status-bar";

// Lebar layar untuk chart responsif
const screenWidth = Dimensions.get("window").width;

export default function DashboardPage() {
  const insets = useSafeAreaInsets();
  const {
    dashboardStats,
    healthDistribution,
    blockActivityData,
    alerts,
    refreshDashboard,
  } = useData();

  // Refresh dashboard data on mount
  useEffect(() => {
    refreshDashboard();
  }, []);

  // Build stats from dynamic data
  const stats = dashboardStats
    ? [
        {
          title: "Total Tanaman",
          value: String(dashboardStats.totalPlants),
          change: `${dashboardStats.healthyPlants + dashboardStats.attentionPlants + dashboardStats.sickPlants} total`,
          icon: Activity,
          color: "#3b82f6",
          bgIcon: "#dbeafe",
        },
        {
          title: "Tanaman Sehat",
          value: String(dashboardStats.healthyPlants),
          change:
            dashboardStats.totalPlants > 0
              ? `${((dashboardStats.healthyPlants / dashboardStats.totalPlants) * 100).toFixed(1)}% dari total`
              : "0% dari total",
          icon: CheckCircle,
          color: "#22c55e",
          bgIcon: "#dcfce7",
        },
        {
          title: "Perlu Perhatian",
          value: String(dashboardStats.attentionPlants),
          change:
            dashboardStats.totalPlants > 0
              ? `${((dashboardStats.attentionPlants / dashboardStats.totalPlants) * 100).toFixed(1)}% dari total`
              : "0% dari total",
          icon: AlertTriangle,
          color: "#f97316",
          bgIcon: "#ffedd5",
        },
        {
          title: "Panen Bulan Ini",
          value: `${dashboardStats.harvestThisMonth} kg`,
          change: "bulan ini",
          icon: TrendingUp,
          color: "#a855f7",
          bgIcon: "#f3e8ff",
        },
      ]
    : [];

  // Build health data for pie chart
  const healthData = healthDistribution.map((item) => ({
    name: item.name,
    value: item.value,
    color: item.color,
    legendFontColor: "#7F7F7F",
    legendFontSize: 12,
  }));

  // Build block activity data for bar chart
  const blockActivityChartData = {
    labels:
      blockActivityData.labels.length > 0
        ? blockActivityData.labels
        : ["A1", "A2", "B1", "B2", "C1", "C2"],
    datasets: [
      {
        data:
          blockActivityData.data.length > 0 &&
          blockActivityData.data.some((d) => d > 0)
            ? blockActivityData.data
            : [0, 0, 0, 0, 0, 0],
      },
    ],
  };

  // Alert severity colors
  const getAlertColors = (severity: string) => {
    switch (severity) {
      case "danger":
        return {
          bg: "#fef2f2",
          border: "#fecaca",
          text: "#991b1b",
          time: "#dc2626",
          icon: "#ef4444",
        };
      case "warning":
        return {
          bg: "#fff7ed",
          border: "#fed7aa",
          text: "#9a3412",
          time: "#ea580c",
          icon: "#f97316",
        };
      case "success":
        return {
          bg: "#f0fdf4",
          border: "#bbf7d0",
          text: "#166534",
          time: "#15803d",
          icon: "#22c55e",
        };
      default:
        return {
          bg: "#f0f9ff",
          border: "#bae6fd",
          text: "#075985",
          time: "#0284c7",
          icon: "#0ea5e9",
        };
    }
  };

  // Config Chart Umum
  const chartConfig = {
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`, // Blue default
    strokeWidth: 2,
    barPercentage: 0.7,
    decimalPlaces: 0,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`, // Gray labels
  };

  return (
    <View style={styles.container}>
      {/* Config Header */}
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Custom Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerIconContainer}>
            <BarChart3 size={24} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Dashboard Monitor</Text>
            <Text style={styles.headerSubtitle}>
              Pantau kondisi kebun real-time
            </Text>
          </View>
        </View>
        <SyncStatusBar />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Grid */}
        <View style={styles.gridContainer}>
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <View key={index} style={styles.statCard}>
                <View
                  style={[styles.iconBox, { backgroundColor: stat.bgIcon }]}
                >
                  <Icon color={stat.color} size={24} />
                </View>
                <Text style={styles.statTitle}>{stat.title}</Text>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statChange}>{stat.change}</Text>
              </View>
            );
          })}
        </View>

        {/* Health Status Chart (Pie) */}
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>🌱 Status Kesehatan Tanaman</Text>
          <PieChart
            data={healthData.map((item) => ({
              name: item.name,
              population: item.value,
              color: item.color,
              legendFontColor: item.legendFontColor,
              legendFontSize: item.legendFontSize,
            }))}
            width={screenWidth - 48}
            height={220}
            chartConfig={chartConfig}
            accessor={"population"}
            backgroundColor={"transparent"}
            paddingLeft={"15"}
            absolute // Menampilkan angka absolut di chart
          />
        </View>

        {/* Activity Chart (Bar) */}
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>📊 Aktivitas per Blok (7 Hari)</Text>
          <BarChart
            data={blockActivityChartData}
            width={screenWidth - 64} // Sedikit lebih kecil agar label pas
            height={220}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={chartConfig}
            verticalLabelRotation={0}
            showValuesOnTopOfBars
            fromZero
          />
        </View>

        {/* Recent Alerts */}
        <View style={styles.alertSection}>
          <Text style={styles.cardTitle}>🔔 Peringatan Terbaru</Text>
          <View style={styles.alertList}>
            {alerts.length === 0 ? (
              <Text
                style={{
                  color: "#9ca3af",
                  textAlign: "center",
                  paddingVertical: 16,
                }}
              >
                Tidak ada peringatan
              </Text>
            ) : (
              alerts.map((alert) => {
                const colors = getAlertColors(alert.severity);
                const AlertIcon =
                  alert.severity === "success" ? CheckCircle : AlertTriangle;
                return (
                  <View
                    key={alert.id}
                    style={[
                      styles.alertItem,
                      {
                        backgroundColor: colors.bg,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <AlertIcon
                      size={20}
                      color={colors.icon}
                      style={{ marginTop: 2 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.alertText, { color: colors.text }]}>
                        {alert.message}
                      </Text>
                      <Text style={[styles.alertTime, { color: colors.time }]}>
                        {formatRelativeTime(
                          alert.created_at ?? new Date().toISOString(),
                        )}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },

  header: {
    backgroundColor: "#16a34a",
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    elevation: 6,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconContainer: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 8,
    borderRadius: 99,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  headerSubtitle: { fontSize: 13, color: "#dcfce7" },

  scrollContent: { padding: 16, paddingBottom: 40 },

  // Grid Stats
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  statCard: {
    width: "48%", // 2 kolom
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statTitle: { fontSize: 12, color: "#6b7280", marginBottom: 4 },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  statChange: { fontSize: 11, color: "#9ca3af" },

  // Charts
  chartCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    elevation: 2,
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
    alignSelf: "flex-start", // Judul rata kiri
  },

  // Alerts
  alertSection: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    elevation: 2,
  },
  alertList: { gap: 12 },
  alertItem: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  alertText: { fontSize: 14, fontWeight: "600" },
  alertTime: { fontSize: 11, marginTop: 4 },
});
