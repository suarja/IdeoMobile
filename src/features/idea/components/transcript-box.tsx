import type { RefObject } from 'react';

import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

import { colors, Text, View } from '@/components/ui';

type Props = {
  isListening: boolean;
  isStopping: boolean;
  isPreview: boolean;
  transcript: string;
  transcriptScrollRef: RefObject<ScrollView | null>;
  onSend: () => void;
  onCancel: () => void;
};

export function TranscriptBox({
  isListening,
  isStopping,
  isPreview,
  transcript,
  transcriptScrollRef,
  onSend,
  onCancel,
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
        : (
            // scrollEnabled off during listening: shows last phrase only (maxHeight: 44)
            // scrollEnabled on in preview: user can review full text
            <ScrollView
              ref={transcriptScrollRef}
              style={isListening ? styles.scrollListening : styles.scrollPreview}
              showsVerticalScrollIndicator={false}
              scrollEnabled={isPreview}
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
  scrollPreview: {
    maxHeight: 96,
  },
  transcriptText: {
    color: colors.brand.dark,
    fontSize: 15,
    lineHeight: 22,
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
