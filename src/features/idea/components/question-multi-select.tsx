import { useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { Text, View } from '@/components/ui';

type Props = {
  question: string;
  options: string[];
  onSelect: (selections: string) => void;
  isDisabled?: boolean;
};

export function QuestionMultiSelect({ question, options, onSelect, isDisabled }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmed, setConfirmed] = useState(false);

  const toggleOption = (option: string) => {
    if (isDisabled || confirmed)
      return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(option)) {
        next.delete(option);
      }
      else {
        next.add(option);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    if (confirmed || selected.size === 0)
      return;
    setConfirmed(true);
    onSelect(Array.from(selected).join(', '));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>CLARIFICATION</Text>
      <Text style={styles.question}>{question}</Text>
      {options.map((option) => {
        const isSelected = selected.has(option);
        return (
          <TouchableOpacity
            key={option}
            style={[
              styles.card,
              isSelected && styles.cardSelected,
              (isDisabled || confirmed) && !isSelected && styles.cardDisabled,
            ]}
            onPress={() => toggleOption(option)}
            activeOpacity={0.7}
            disabled={isDisabled || confirmed}
          >
            <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
              {option}
            </Text>
            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
              {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </TouchableOpacity>
        );
      })}
      {selected.size > 0 && !confirmed && (
        <TouchableOpacity
          style={[styles.confirmButton, isDisabled && styles.cardDisabled]}
          onPress={handleConfirm}
          activeOpacity={0.8}
          disabled={isDisabled}
        >
          <Text style={styles.confirmText}>Confirm</Text>
        </TouchableOpacity>
      )}
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
  card: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E0D8CC',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardSelected: {
    borderColor: '#C4773B',
  },
  cardDisabled: {
    opacity: 0.4,
  },
  optionText: {
    color: '#2C1810',
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
  },
  optionTextSelected: {
    color: '#C4773B',
  },
  checkbox: {
    alignItems: 'center',
    borderColor: '#C0B4A4',
    borderRadius: 6,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    marginLeft: 12,
    width: 20,
  },
  checkboxSelected: {
    backgroundColor: '#C4773B',
    borderColor: '#C4773B',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  confirmButton: {
    alignItems: 'center',
    backgroundColor: '#433831',
    borderRadius: 14,
    marginTop: 4,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
