import React from 'react';
import { Platform, Text, ViewStyle } from 'react-native';
import { SymbolView } from 'expo-symbols';

interface IconSymbolProps {
  name: string;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

export function IconSymbol({ name, size = 24, color = '#000', style }: IconSymbolProps) {
  // On iOS, render SF Symbol via expo-symbols; on other platforms render a simple glyph.
  if (Platform.OS === 'ios') {
    return <SymbolView name={name as any} size={size} tintColor={color} style={style as any} />;
  }
  return <Text style={[{ fontSize: size, color }, style]}>{'⬤'}</Text>;
}
