import { useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { Platform } from 'react-native';
import { useUniwind } from 'uniwind';

type Props = { hidden?: boolean; style?: 'dark' | 'light' | 'auto' | 'inverted' };

export function FocusAwareStatusBar({ hidden = false, style }: Props) {
  const isFocused = useIsFocused();
  const { theme } = useUniwind();

  if (Platform.OS === 'web')
    return null;

  const resolvedStyle = style ?? (theme === 'light' ? 'dark' : 'light');

  return isFocused
    ? (
        <StatusBar
          style={resolvedStyle}
          hidden={hidden}
        />
      )
    : null;
}
