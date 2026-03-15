import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';

import { colors, Text, View } from '@/components/ui';

type Props = {
  statusText: string;
  isListening: boolean;
  isActive: boolean; // controls status text highlight
  isDisabled: boolean; // FAB disabled state
  showSpinner: boolean; // FAB shows spinner instead of icon
  onPress: () => void;
};

export function MicBottomBar({
  statusText,
  isListening,
  isActive,
  isDisabled,
  showSpinner,
  onPress,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={[styles.statusText, isActive && styles.statusTextActive]} numberOfLines={1}>
        {statusText}
      </Text>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={[styles.fab, isListening && styles.fabActive]}
        disabled={isDisabled}
      >
        {showSpinner
          ? <ActivityIndicator size="small" color={colors.brand.bg} />
          : <Ionicons name={isListening ? 'stop' : 'mic'} size={24} color={colors.brand.bg} />}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingBottom: 16,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  statusText: {
    color: colors.brand.muted,
    flex: 1,
    fontSize: 14,
  },
  statusTextActive: {
    color: colors.primary[700],
  },
  fab: {
    alignItems: 'center',
    backgroundColor: colors.brand.dark,
    borderColor: colors.brand.border,
    borderRadius: 28,
    borderWidth: 1,
    elevation: 4,
    height: 56,
    justifyContent: 'center',
    shadowColor: colors.brand.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    width: 56,
  },
  fabActive: {
    backgroundColor: colors.primary[700],
    borderColor: 'rgba(229, 97, 0, 0.4)',
  },
});
