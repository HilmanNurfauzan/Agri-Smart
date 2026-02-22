import React from 'react';
import * as Haptics from 'expo-haptics';
import { Pressable } from 'react-native';

// A minimal wrapper to add haptics to tab bar buttons
export function HapticTab(props: any) {
  return (
    <Pressable
      {...props}
      onPress={(e) => {
        Haptics.selectionAsync();
        props?.onPress?.(e);
      }}
    />
  );
}
