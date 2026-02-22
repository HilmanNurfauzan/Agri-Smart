/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from "react-native";

const primary = "#16A34A"; // green-600
const primaryDark = "#22C55E"; // green-500

export const Colors = {
  light: {
    text: "#11181C",
    background: "#fff",
    tint: primary,
    icon: "#687076",
    tabIconDefault: "#A1A1AA",
    tabIconSelected: primary,
    tabBarBackground: "#FFFFFF",
    tabBarBorder: "#E4E4E7",
    scanButton: primary,
    scanButtonShadow: "#16A34A40",
    card: "#F9FAFB",
  },
  dark: {
    text: "#ECEDEE",
    background: "#151718",
    tint: primaryDark,
    icon: "#9BA1A6",
    tabIconDefault: "#71717A",
    tabIconSelected: primaryDark,
    tabBarBackground: "#1C1C1E",
    tabBarBorder: "#2C2C2E",
    scanButton: primaryDark,
    scanButtonShadow: "#22C55E40",
    card: "#1C1C1E",
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
