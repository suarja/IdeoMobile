import type { RefObject } from 'react';

import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

import { colors, Text, View } from '@/components/ui';

type Props = {
  isListening: boolean;
  isStopping: boolean;
  isPreview: boolean;
  transcript: string;
  transcriptScrollRef: RefObject<ScrollView | null>;
  onSend: () => void;
  onCancel: () => void;
  onTranscriptEdit?: (text: string) => void;
};

export function TranscriptBox({
  isStopping,
  isPreview,
  transcript,
  transcriptScrollRef,
  onSend,
  onCancel,
  onTranscriptEdit,
}: Props) {
  return (
    <View style={[styles.container, isPreview && styles.containerPreview]}>
      {isStopping
        ? (
            <View style={styles.stoppingRow}>
              <ActivityIndicator size="small" color={colors.brand.muted} />
              <Text style={styles.stoppingText}>Processing…</Text>
            </View>
          )
        : isPreview
          ? (
              // Editable in preview mode
              <TextInput
                style={[styles.transcriptText, styles.editableInput]}
                value={transcript || ''}
                onChangeText={onTranscriptEdit}
                multiline
                scrollEnabled
                placeholder="…"
                placeholderTextColor={colors.brand.muted}
                autoCorrect
              />
            )
          : (
              // Read-only while listening
              <ScrollView
                ref={transcriptScrollRef}
                style={styles.scrollListening}
                showsVerticalScrollIndicator={false}
                scrollEnabled={false}
              >
                <Text style={styles.transcriptText}>{transcript || '…'}</Text>
              </ScrollView>
            )}

      {isPreview && (
        <View style={styles.actions}>
          <TouchableOpacity onPress={onCancel} style={styles.cancelButton} activeOpacity={0.7}>
            <Ionicons name="close" size={15} color={colors.brand.muted} />
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onSend} style={styles.sendButton} activeOpacity={0.7}>
            <Text style={styles.sendText}>Send</Text>
            <Ionicons name="arrow-up" size={15} color={colors.brand.bg} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.brand.card,
    borderColor: colors.brand.border,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 8,
    marginBottom: 8,
    marginHorizontal: 16,
    padding: 14,
    shadowColor: colors.brand.dark,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  containerPreview: {
    shadowOpacity: 0.15,
  },
  stoppingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  stoppingText: {
    color: colors.brand.muted,
    fontSize: 14,
  },
  scrollListening: {
    maxHeight: 44,
  },
  transcriptText: {
    color: colors.brand.dark,
    fontSize: 15,
    lineHeight: 22,
  },
  editableInput: {
    maxHeight: 96,
    paddingVertical: 0,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  cancelButton: {
    alignItems: 'center',
    borderColor: colors.brand.border,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  cancelText: {
    color: colors.brand.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: colors.brand.dark,
    borderRadius: 20,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  sendText: {
    color: colors.brand.bg,
    fontSize: 13,
    fontWeight: '500',
  },
});
