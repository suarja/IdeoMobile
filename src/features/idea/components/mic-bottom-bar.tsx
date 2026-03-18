import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

import { colors, Text, View } from '@/components/ui';

import { translate } from '@/lib/i18n';

type Props = {
  statusText: string;
  isListening: boolean;
  isActive: boolean;
  isDisabled: boolean;
  showSpinner: boolean;
  onPress: () => void;
  /** Shared input text (typed or appended from voice) */
  inputText: string;
  onInputChange: (text: string) => void;
  onSend: () => void;
};

export function MicBottomBar({
  statusText,
  isListening,
  isActive,
  isDisabled,
  showSpinner,
  onPress,
  inputText,
  onInputChange,
  onSend,
}: Props) {
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);
  const canSend = inputText.trim().length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        {isListening
          ? (
              <Text style={[styles.statusText, isActive && styles.statusTextActive]} numberOfLines={1}>
                {statusText}
              </Text>
            )
          : (
              <TextInput
                ref={inputRef}
                style={[styles.textInput, isFocused && styles.textInputFocused]}
                value={inputText}
                onChangeText={onInputChange}
                placeholder={translate('idea.subtitle')}
                placeholderTextColor={colors.brand.muted}
                multiline={false}
                returnKeyType="send"
                selectTextOnFocus
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onSubmitEditing={canSend ? onSend : undefined}
              />
            )}

        {canSend && !isListening && (
          <TouchableOpacity onPress={onSend} style={styles.sendBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-up" size={18} color={colors.brand.bg} />
          </TouchableOpacity>
        )}
      </View>

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
  inputRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    marginRight: 12,
  },
  textInput: {
    color: colors.brand.dark,
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
  },
  textInputFocused: {
    borderBottomColor: colors.brand.dark,
    borderBottomWidth: 1,
    opacity: 1,
  },
  statusText: {
    color: colors.brand.muted,
    flex: 1,
    fontSize: 14,
  },
  statusTextActive: {
    color: colors.primary[700],
  },
  sendBtn: {
    alignItems: 'center',
    backgroundColor: colors.brand.dark,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    marginLeft: 8,
    width: 32,
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
