import type { TranscribeRealtimeOptions } from 'whisper.rn/index.js';
import { Ionicons } from '@expo/vector-icons';
import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, FocusAwareStatusBar, Text, View } from '@/components/ui';
import { useWhisperModels } from '@/lib/hooks/use-whisper-models';
import { translate } from '@/lib/i18n';
import { POC_USER_ID, useGetOrCreateThread, useMessages, useSendMessage } from './api';

// eslint-disable-next-line max-lines-per-function
export function IdeaScreen() {
  const {
    whisperContext,
    isInitializingModel,
    isDownloading,
    currentModelId,
    initializeWhisperModel,
    getDownloadProgress,
  } = useWhisperModels();

  const [isListening, setIsListening] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const realtimeRef = useRef<{ stop: () => Promise<void> } | null>(null);

  const getOrCreateThread = useGetOrCreateThread();
  const sendMessage = useSendMessage();
  const messages = useMessages(threadId);

  useEffect(() => {
    initializeWhisperModel('base').catch(console.error);
  }, [initializeWhisperModel]);

  useEffect(() => {
    getOrCreateThread({ userId: POC_USER_ID })
      .then(id => setThreadId(id))
      .catch(console.error);
  }, [getOrCreateThread]);

  const insets = useSafeAreaInsets();
  const isBusy = isInitializingModel || isDownloading;

  const statusText = (() => {
    if (isDownloading) {
      const pct = Math.round((getDownloadProgress(currentModelId ?? 'base')) * 100);
      return `Downloading model… ${pct}%`;
    }
    if (isInitializingModel)
      return 'Initializing model…';
    if (isSending)
      return 'Thinking…';
    if (isListening)
      return 'Listening…';
    if (isPreview)
      return 'Review your message';
    return translate('idea.subtitle');
  })();

  const ensurePermission = async (): Promise<boolean> => {
    const status = await getRecordingPermissionsAsync();
    if (status.granted)
      return true;
    if (!status.canAskAgain)
      return false;
    const result = await requestRecordingPermissionsAsync();
    return result.granted;
  };

  const handleSend = async () => {
    if (!threadId || !transcript.trim())
      return;
    setIsPreview(false);
    setIsSending(true);
    setAgentError(null);
    try {
      await sendMessage({ threadId, content: transcript.trim() });
    }
    catch (err) {
      console.error('Agent error:', err);
      setAgentError('Failed to get a response. Please try again.');
    }
    finally {
      setIsSending(false);
    }
  };

  const handleCancel = () => {
    setTranscript('');
    setIsPreview(false);
    setAgentError(null);
  };

  const toggleListening = async () => {
    if (isListening) {
      const finalTranscript = transcript;
      setIsListening(false);
      const stopPromise = realtimeRef.current?.stop() ?? Promise.resolve();
      realtimeRef.current = null;
      await stopPromise;
      if (finalTranscript.trim()) {
        setIsPreview(true);
      }
      return;
    }

    if (!whisperContext)
      return;

    const hasPermission = await ensurePermission();
    if (!hasPermission)
      return;

    setTranscript('');
    setAgentError(null);
    setIsListening(true);

    const options: TranscribeRealtimeOptions = {
      realtimeAudioSec: 300,
      realtimeAudioSliceSec: 25,
      realtimeAudioMinSec: 1,
      audioSessionOnStartIos: {
        category: 'PlayAndRecord' as any,
        options: ['DefaultToSpeaker'] as any,
        mode: 'Default' as any,
      },
      audioSessionOnStopIos: 'restore',
    };

    try {
      const { stop, subscribe } = await whisperContext.transcribeRealtime(options);
      realtimeRef.current = { stop };
      subscribe((event: any) => {
        if (event.data?.result) {
          setTranscript(event.data.result.trim());
        }
      });
    }
    catch (err) {
      console.error('Realtime transcription failed:', err);
      setIsListening(false);
    }
  };

  const lastAssistantMessage = messages
    ? [...messages].reverse().find(m => m.role === 'assistant')
    : null;

  const showEmpty = !transcript && !lastAssistantMessage && !isBusy;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.brand.bg }}>
      <FocusAwareStatusBar />

      {/* Fixed header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Ideo</Text>
        <Ionicons name="share-outline" size={22} color={colors.brand.dark} style={{ opacity: 0.4 }} />
      </View>

      {/* Scrollable content */}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.ideaTitle}>{translate('idea.title_placeholder')}</Text>

        {showEmpty && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyHint}>{translate('idea.empty_hint')}</Text>
            <Text style={styles.emptyHint}>{translate('idea.empty_hint2')}</Text>
            <Ionicons
              name="chevron-down-outline"
              size={28}
              color={colors.brand.dark}
              style={styles.arrowHint}
            />
          </View>
        )}

        {transcript
          ? (
              <View style={styles.transcriptCard}>
                <Text style={styles.cardLabel}>Vous avez dit</Text>
                <Text
                  style={styles.transcriptText}
                  numberOfLines={isListening ? 3 : undefined}
                >
                  {transcript}
                </Text>
                {isPreview && (
                  <View style={styles.previewActions}>
                    <TouchableOpacity onPress={handleCancel} style={styles.cancelButton} activeOpacity={0.7}>
                      <Ionicons name="close" size={16} color="#A08060" />
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSend} style={styles.sendButton} activeOpacity={0.7}>
                      <Text style={styles.sendText}>Send</Text>
                      <Ionicons name="arrow-up" size={16} color={colors.brand.bg} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )
          : null}

        {lastAssistantMessage
          ? (
              <View style={styles.agentCard}>
                <Text style={styles.cardLabel}>Advisor</Text>
                <Text style={styles.agentText}>{lastAssistantMessage.content}</Text>
              </View>
            )
          : null}

        {agentError
          ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{agentError}</Text>
              </View>
            )
          : null}
      </ScrollView>

      {/* Fixed bottom bar: status text + FAB mic */}
      <View style={styles.bottomBar}>
        <Text
          style={[styles.statusText, (isListening || isSending) && styles.statusTextActive]}
          numberOfLines={1}
        >
          {statusText}
        </Text>
        <TouchableOpacity
          onPress={toggleListening}
          activeOpacity={0.8}
          style={[styles.fab, isListening && styles.fabActive]}
          disabled={isBusy || isSending || isPreview}
        >
          {isBusy || isSending
            ? (
                <ActivityIndicator size="small" color={colors.brand.bg} />
              )
            : (
                <Ionicons
                  name={isListening ? 'stop' : 'mic'}
                  size={24}
                  color={colors.brand.bg}
                />
              )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    paddingHorizontal: 24,
    // paddingTop is set dynamically via insets
  },
  headerTitle: {
    color: colors.brand.dark,
    fontSize: 24,
    fontWeight: '700',
  },
  content: {
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  ideaTitle: {
    color: '#A08060',
    fontFamily: 'Georgia',
    fontSize: 30,
    fontStyle: 'italic',
    letterSpacing: -0.5,
    lineHeight: 40,
    marginBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyHint: {
    color: '#A08060',
    fontSize: 15,
    textAlign: 'center',
  },
  arrowHint: {
    marginTop: 120,
    opacity: 0.4,
  },
  transcriptCard: {
    backgroundColor: colors.brand.selected,
    borderColor: colors.brand.border,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
  },
  cardLabel: {
    color: '#A08060',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  transcriptText: {
    color: colors.brand.dark,
    fontSize: 16,
    lineHeight: 24,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 12,
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
    color: '#A08060',
    fontSize: 14,
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
    fontSize: 14,
    fontWeight: '500',
  },
  agentCard: {
    backgroundColor: colors.brand.dark,
    borderColor: '#2E2420',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    padding: 16,
  },
  agentText: {
    color: colors.brand.bg,
    fontSize: 16,
    lineHeight: 24,
  },
  errorCard: {
    backgroundColor: '#FDE8E8',
    borderRadius: 16,
    marginTop: 12,
    padding: 16,
  },
  errorText: {
    color: '#9B2335',
    fontSize: 14,
  },
  bottomBar: {
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
