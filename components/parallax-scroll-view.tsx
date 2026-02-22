import React, { ReactNode } from 'react';
import { ScrollView, View, StyleSheet, ViewStyle } from 'react-native';

interface ParallaxScrollViewProps {
  headerBackgroundColor?: { light: string; dark: string } | string;
  headerImage?: ReactNode;
  children?: ReactNode;
  style?: ViewStyle;
}

export default function ParallaxScrollView({ headerBackgroundColor, headerImage, children, style }: ParallaxScrollViewProps) {
  const bg = typeof headerBackgroundColor === 'string' ? headerBackgroundColor : headerBackgroundColor?.light ?? '#eee';

  return (
    <ScrollView contentContainerStyle={[styles.container, style]}
      showsVerticalScrollIndicator={false}>
      <View style={[styles.header, { backgroundColor: bg }]}>{headerImage}</View>
      <View style={styles.content}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  header: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
});
