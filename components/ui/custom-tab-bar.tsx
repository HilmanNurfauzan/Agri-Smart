import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import * as Haptics from "expo-haptics";
import { BarChart3, BookOpen, Bot, Home, ScanLine } from "lucide-react-native";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_ICONS: Record<string, any> = {
  index: Home,
  logbook: BookOpen,
  scanner: ScanLine,
  chatbot: Bot,
  dashboard: BarChart3,
};

const TAB_LABELS: Record<string, string> = {
  index: "Beranda",
  logbook: "Logbook",
  scanner: "Scan",
  chatbot: "Asisten",
  dashboard: "Monitor",
};

export function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, 8),
          backgroundColor: colors.tabBarBackground,
          borderTopColor: colors.tabBarBorder,
        },
      ]}
    >
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const isScanner = route.name === "scanner";
        const IconComponent = TAB_ICONS[route.name];
        const label = TAB_LABELS[route.name] || options.title || route.name;

        // Skip tabs that are not in our defined list (e.g. explore)
        if (!TAB_ICONS[route.name]) return null;

        const activeColor = colors.tabIconSelected;
        const inactiveColor = colors.tabIconDefault;

        const onPress = () => {
          Haptics.selectionAsync();
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        if (isScanner) {
          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.8}
              style={styles.scannerTabWrapper}
            >
              <View
                style={[
                  styles.scannerButton,
                  {
                    backgroundColor: colors.scanButton,
                    shadowColor: colors.scanButtonShadow,
                  },
                ]}
              >
                {IconComponent && (
                  <IconComponent size={26} color="#FFFFFF" strokeWidth={2.2} />
                )}
              </View>
              <Text
                style={[
                  styles.scannerLabel,
                  { color: isFocused ? activeColor : inactiveColor },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.7}
            style={styles.tabButton}
          >
            {/* Active indicator dot */}
            <View
              style={[
                styles.activeIndicator,
                {
                  backgroundColor: isFocused ? activeColor : "transparent",
                  opacity: isFocused ? 1 : 0,
                },
              ]}
            />
            {IconComponent && (
              <IconComponent
                size={22}
                color={isFocused ? activeColor : inactiveColor}
                strokeWidth={isFocused ? 2.3 : 1.8}
              />
            )}
            <Text
              style={[
                styles.label,
                {
                  color: isFocused ? activeColor : inactiveColor,
                  fontWeight: isFocused ? "600" : "400",
                },
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* Hidden tabs that shouldn't appear */}
      {state.routes
        .filter((r: any) => !TAB_ICONS[r.name])
        .map((route: any) => {
          const { options } = descriptors[route.key];
          return null;
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
    gap: 3,
  },
  activeIndicator: {
    width: 20,
    height: 3,
    borderRadius: 2,
    marginBottom: 2,
  },
  label: {
    fontSize: 10.5,
    letterSpacing: 0.1,
    marginTop: 1,
  },
  scannerTabWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: -22,
  },
  scannerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#16A34A",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  scannerLabel: {
    fontSize: 10.5,
    letterSpacing: 0.1,
    marginTop: 4,
    fontWeight: "500",
  },
});
