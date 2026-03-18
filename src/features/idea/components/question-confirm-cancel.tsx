import { useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { Text, View } from '@/components/ui';

type Props = {
  question: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDisabled?: boolean;
};

export function QuestionConfirmCancel({
  question,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  isDisabled,
}: Props) {
  const [tapped, setTapped] = useState(false);

  const handleConfirm = () => {
    if (tapped || isDisabled)
      return;
    setTapped(true);
    onConfirm();
  };

  const handleCancel = () => {
    if (tapped || isDisabled)
      return;
    setTapped(true);
    onCancel();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>CLARIFICATION</Text>
      <Text style={styles.question}>{question}</Text>
      <TouchableOpacity
        style={[styles.confirmButton, (tapped || isDisabled) && styles.buttonDisabled]}
        onPress={handleConfirm}
        activeOpacity={0.8}
        disabled={tapped || isDisabled}
      >
        <Text style={styles.confirmText}>{confirmLabel}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.cancelButton, (tapped || isDisabled) && styles.buttonDisabled]}
        onPress={handleCancel}
        activeOpacity={0.7}
        disabled={tapped || isDisabled}
      >
        <Text style={styles.cancelText}>{cancelLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    paddingHorizontal: 24,
  },
  label: {
    color: '#B8966E',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  question: {
    color: '#2C1810',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: 12,
  },
  confirmButton: {
    alignItems: 'center',
    backgroundColor: '#433831',
    borderRadius: 14,
    marginBottom: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelButton: {
    alignItems: 'center',
    borderColor: '#C0B4A4',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  cancelText: {
    color: '#433831',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
});
