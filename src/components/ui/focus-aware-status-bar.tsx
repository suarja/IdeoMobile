import { useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { Platform } from 'react-native';

type Props = { hidden?: boolean; style?: 'dark' | 'light' | 'auto' | 'inverted' };

export function FocusAwareStatusBar({ hidden = false, style }: Props) {
  const isFocused = useIsFocused();

  if (Platform.OS === 'web')
    return null;

  const resolvedStyle = style ?? 'dark';

  return isFocused
    ? (
        <StatusBar
          style={resolvedStyle}
          hidden={hidden}
        />
      )
    : null;
}
