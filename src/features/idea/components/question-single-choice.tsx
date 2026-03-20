import { useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { Text, View } from '@/components/ui';

type Props = {
  question: string;
  options: string[];
  onSelect: (option: string) => void;
  isDisabled?: boolean;
};

export function QuestionSingleChoice({ question, options, onSelect, isDisabled }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const handlePress = (option: string) => {
    if (isDisabled || confirmed)
      return;
    setSelected(prev => prev === option ? null : option);
  };

  const handleConfirm = () => {
    if (confirmed || selected === null)
      return;
    setConfirmed(true);
    onSelect(selected);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>CLARIFICATION</Text>
      <Text style={styles.question}>{question}</Text>
      {options.map(option => (
        <TouchableOpacity
          key={option}
          style={[
            styles.card,
            selected === option && styles.cardSelected,
            (isDisabled || confirmed) && selected !== option && styles.cardDisabled,
          ]}
          onPress={() => handlePress(option)}
          activeOpacity={0.7}
          disabled={!!isDisabled || confirmed}
        >
          <Text style={[styles.optionText, selected === option && styles.optionTextSelected]}>
            {option}
          </Text>
          <View style={[styles.radio, selected === option && styles.radioSelected]} />
        </TouchableOpacity>
      ))}
      {selected !== null && !confirmed && (
        <TouchableOpacity
          style={[styles.confirmButton, isDisabled && styles.cardDisabled]}
          onPress={handleConfirm}
          activeOpacity={0.8}
          disabled={isDisabled}
        >
          <Text style={styles.confirmText}>Valider</Text>
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
  radio: {
    borderColor: '#C0B4A4',
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    marginLeft: 12,
    width: 20,
  },
  radioSelected: {
    backgroundColor: '#C4773B',
    borderColor: '#C4773B',
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
