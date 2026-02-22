import * as WebBrowser from "expo-web-browser";
import React from "react";
import { Linking, Text, TouchableOpacity } from "react-native";

interface ExternalLinkProps {
  href: string;
  children: React.ReactNode;
}

export function ExternalLink({ href, children }: ExternalLinkProps) {
  const onPress = async () => {
    // Try Expo WebBrowser first; fall back to Linking
    try {
      const result = await WebBrowser.openBrowserAsync(href);
      if (result.type === "cancel") {
        await Linking.openURL(href);
      }
    } catch {
      try {
        await Linking.openURL(href);
      } catch {
        // URL tidak bisa dibuka — abaikan dengan aman
      }
    }
  };

  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="link">
      <Text style={{ color: "#2563eb" }}>{children}</Text>
    </TouchableOpacity>
  );
}
