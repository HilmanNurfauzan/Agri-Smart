import {
  AlertCircle,
  Check,
  Cloud,
  CloudOff,
  RefreshCw,
} from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useData } from "../../src/contexts/data-context";

export default function SyncStatusBar() {
  const { isOnline, syncStatus, syncMessage, triggerSync } = useData();

  const getStatusConfig = () => {
    if (!isOnline) {
      return {
        icon: CloudOff,
        text: "Mode Offline",
        bgColor: "#fef3c7",
        textColor: "#92400e",
        iconColor: "#d97706",
        borderColor: "#fde68a",
      };
    }
    switch (syncStatus) {
      case "syncing":
        return {
          icon: RefreshCw,
          text: "Menyinkronkan...",
          bgColor: "#dbeafe",
          textColor: "#1e40af",
          iconColor: "#3b82f6",
          borderColor: "#bfdbfe",
        };
      case "success":
        return {
          icon: Check,
          text: "Data tersinkron",
          bgColor: "#dcfce7",
          textColor: "#166534",
          iconColor: "#22c55e",
          borderColor: "#bbf7d0",
        };
      case "error":
        return {
          icon: AlertCircle,
          text: syncMessage || "Gagal sinkronisasi",
          bgColor: "#fef2f2",
          textColor: "#991b1b",
          iconColor: "#ef4444",
          borderColor: "#fecaca",
        };
      default:
        return {
          icon: Cloud,
          text: "Online",
          bgColor: "#dcfce7",
          textColor: "#166534",
          iconColor: "#22c55e",
          borderColor: "#bbf7d0",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: config.bgColor, borderColor: config.borderColor },
      ]}
    >
      <Icon size={14} color={config.iconColor} />
      <Text style={[styles.text, { color: config.textColor }]}>
        {config.text}
      </Text>
      {isOnline && syncStatus !== "syncing" && (
        <TouchableOpacity onPress={triggerSync} style={styles.syncButton}>
          <RefreshCw size={12} color={config.iconColor} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 12,
    fontWeight: "500",
  },
  syncButton: {
    padding: 2,
    marginLeft: 2,
  },
});
