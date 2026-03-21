import { Ionicons } from '@expo/vector-icons';
import { ChartBar, Compass, Megaphone, PaintBrush, Wrench } from 'phosphor-react-native';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { colors, Text, View } from '@/components/ui';
import { Modal, useModal } from '@/components/ui/modal';

type AgentHint = 'general' | 'validation' | 'design' | 'development' | 'distribution';

type Props = {
  onContinue: () => void;
  onNewTopic: (hint: AgentHint) => void;
};

type TopicOption = {
  label: string;
  hint: AgentHint;
  Icon: React.ComponentType<{ size: number; weight: 'regular'; color: string }>;
};

const TOPIC_OPTIONS: TopicOption[] = [
  { label: 'Question technique', Icon: Wrench, hint: 'development' },
  { label: 'Conseil stratégique', Icon: Compass, hint: 'general' },
  { label: 'Validation / Marché', Icon: ChartBar, hint: 'validation' },
  { label: 'Design / UX', Icon: PaintBrush, hint: 'design' },
  { label: 'Distribution', Icon: Megaphone, hint: 'distribution' },
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

      <Modal ref={ref} snapPoints={['45%']} backgroundStyle={{ backgroundColor: colors.brand.bg }}>
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Choisir un sujet</Text>
          {TOPIC_OPTIONS.map(({ label, Icon, hint }, index) => (
            <View key={hint}>
              <TouchableOpacity
                onPress={() => handleTopicSelect(hint)}
                style={styles.sheetRow}
                activeOpacity={0.7}
              >
                <Icon size={18} weight="regular" color={colors.brand.muted} />
                <Text style={styles.sheetLabel}>{label}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.brand.muted} />
              </TouchableOpacity>
              {index < TOPIC_OPTIONS.length - 1 && (
                <View style={styles.separator} />
              )}
            </View>
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
    borderRadius: 8,
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
    textShadowColor: 'rgba(255,255,255,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  },
  primaryChipText: {
    color: colors.brand.bg,
    fontSize: 13,
    fontWeight: '600',
    textShadowColor: 'rgba(255,255,255,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  },
  chevron: {
    marginLeft: 4,
  },
  sheetContent: {
    paddingBottom: 24,
    paddingHorizontal: 24,
    paddingTop: 0,
  },
  sheetTitle: {
    color: colors.brand.dark,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  sheetRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 12,
  },
  separator: {
    backgroundColor: colors.brand.border,
    height: 1,
  },
  sheetLabel: {
    color: colors.brand.dark,
    flex: 1,
    fontSize: 15,
  },
});
