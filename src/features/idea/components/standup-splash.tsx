import { Ionicons } from '@expo/vector-icons';
import * as React from 'react';
import { useState } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';

import { colors, Text } from '@/components/ui';
import { useSaveDailyMood } from '../api';

type Props = {
  visible: boolean;
  onDismiss: () => void;
};

const MOODS = [
  { emoji: '😢', score: 1, label: 'Sad' },
  { emoji: '🙁', score: 2, label: 'Down' },
  { emoji: '😐', score: 3, label: 'Neutral' },
  { emoji: '🙂', score: 4, label: 'Good' },
  { emoji: '🤩', score: 5, label: 'Great' },
];

export function StandupSplash({ visible, onDismiss }: Props) {
  const saveDailyMood = useSaveDailyMood();
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (selectedScore === null)
      return;
    setIsSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await saveDailyMood({
        moodScore: selectedScore,
        date: today,
      });
      onDismiss();
    }
    catch (error) {
      console.error('Failed to save mood:', error);
    }
    finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Météo des émotions</Text>
          <Text style={styles.subtitle}>Comment te sens-tu aujourd'hui ?</Text>

          <View style={styles.moodRow}>
            {MOODS.map(mood => (
              <TouchableOpacity
                key={mood.score}
                onPress={() => setSelectedScore(mood.score)}
                style={[
                  styles.moodButton,
                  selectedScore === mood.score && styles.moodButtonSelected,
                ]}
              >
                <Text style={styles.emoji}>{mood.emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={handleSave}
            disabled={selectedScore === null || isSaving}
            style={[
              styles.saveButton,
              (selectedScore === null || isSaving) && styles.saveButtonDisabled,
            ]}
          >
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Saving...' : 'Continuer'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.brand.muted} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.brand.bg,
    borderRadius: 32,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    position: 'relative',
  },
  title: {
    fontFamily: 'Georgia',
    fontSize: 24,
    fontStyle: 'italic',
    color: '#A08060',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.brand.muted,
    marginBottom: 32,
    textAlign: 'center',
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 40,
  },
  moodButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.brand.card,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  moodButtonSelected: {
    borderColor: '#C4773B',
    transform: [{ scale: 1.1 }],
    backgroundColor: colors.brand.selected,
  },
  emoji: {
    fontSize: 24,
  },
  saveButton: {
    backgroundColor: colors.brand.dark,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: colors.brand.bg,
    fontSize: 16,
    fontWeight: '600',
  },
  closeBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
});
