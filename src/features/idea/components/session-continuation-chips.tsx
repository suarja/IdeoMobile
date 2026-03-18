import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { colors, Text, View } from '@/components/ui';
import { Modal, useModal } from '@/components/ui/modal';

type AgentHint = 'general' | 'validation' | 'design' | 'development' | 'distribution';

type Props = {
  onContinue: () => void;
  onNewTopic: (hint: AgentHint) => void;
};

const TOPIC_OPTIONS: Array<{ label: string; emoji: string; hint: AgentHint }> = [
  { label: 'Question technique', emoji: '⚙️', hint: 'development' },
  { label: 'Conseil stratégique', emoji: '🧭', hint: 'general' },
  { label: 'Validation / Marché', emoji: '📊', hint: 'validation' },
  { label: 'Design / UX', emoji: '🎨', hint: 'design' },
  { label: 'Distribution', emoji: '📣', hint: 'distribution' },
];

export function SessionContinuationChips({ onContinue, onNewTopic }: Props) {
  const { ref, present, dismiss } = useModal();

  const handleTopicSelect = (hint: AgentHint) => {
    dismiss();
    onNewTopic(hint);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Reprendre ?</Text>
      <View style={styles.chips}>
        <TouchableOpacity
          onPress={onContinue}
          style={[styles.chip, styles.primaryChip]}
          activeOpacity={0.7}
        >
          <Text style={styles.primaryChipText}>Continuer</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={present}
          style={styles.chip}
          activeOpacity={0.7}
        >
          <Text style={styles.chipText}>Autre sujet</Text>
          <Ionicons name="chevron-down" size={12} color={colors.brand.muted} style={styles.chevron} />
        </TouchableOpacity>
      </View>

      <Modal ref={ref} snapPoints={['45%']} title="Choisir un sujet">
        <View style={styles.sheetContent}>
          {TOPIC_OPTIONS.map(({ label, emoji, hint }) => (
            <TouchableOpacity
              key={hint}
              onPress={() => handleTopicSelect(hint)}
              style={styles.sheetRow}
              activeOpacity={0.7}
            >
              <Text style={styles.sheetEmoji}>{emoji}</Text>
              <Text style={styles.sheetLabel}>{label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.brand.muted} />
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginTop: 16,
  },
  label: {
    color: colors.brand.muted,
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  chips: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    alignItems: 'center',
    borderColor: colors.brand.border,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  primaryChip: {
    backgroundColor: colors.brand.dark,
    borderColor: colors.brand.dark,
  },
  chipText: {
    color: colors.brand.dark,
    fontSize: 13,
  },
  primaryChipText: {
    color: colors.brand.bg,
    fontSize: 13,
    fontWeight: '600',
  },
  chevron: {
    marginLeft: 4,
  },
  sheetContent: {
    paddingBottom: 24,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  sheetRow: {
    alignItems: 'center',
    borderBottomColor: colors.brand.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
  },
  sheetEmoji: {
    fontSize: 18,
    width: 28,
  },
  sheetLabel: {
    color: colors.brand.dark,
    flex: 1,
    fontSize: 15,
  },
});
