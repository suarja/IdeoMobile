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
  const [isStopping, setIsStopping] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const realtimeRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const transcriptScrollRef = useRef<ScrollView>(null);

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

  // Auto-scroll transcript to bottom during live recording
  useEffect(() => {
    if (transcript && isListening) {
      transcriptScrollRef.current?.scrollToEnd({ animated: true });
    }
  }, [transcript, isListening]);

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
    const content = transcript.trim();
    setTranscript('');
    try {
      await sendMessage({ threadId, content });
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
      setIsStopping(true);
      const stopPromise = realtimeRef.current?.stop() ?? Promise.resolve();
      realtimeRef.current = null;
      await stopPromise;
      setIsStopping(false);
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

  // Persist user message from API after send (fixes reload bug)
  const lastUserMessage = messages
    ? [...messages].reverse().find(m => m.role === 'user')
    : null;
  const lastAssistantMessage = messages
    ? [...messages].reverse().find(m => m.role === 'assistant')
    : null;

  const showEmpty = !lastUserMessage && !lastAssistantMessage && !isBusy;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.brand.bg }}>
      <FocusAwareStatusBar />

      {/* Fixed header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Ideo</Text>
        <Ionicons name="share-outline" size={22} color={colors.brand.dark} style={{ opacity: 0.4 }} />
      </View>

      {/* Scrollable content — user + agent messages */}
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

        {/* User message — no card, compact, max 3 lines */}
        {lastUserMessage && (
          <View style={styles.userMessage}>
            <Text style={styles.userMessageLabel}>You said</Text>
            <Text style={styles.userMessageText} numberOfLines={3} ellipsizeMode="tail">
              {lastUserMessage.content}
            </Text>
          </View>
        )}

        {agentError && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{agentError}</Text>
          </View>
        )}
      </ScrollView>

      {/* Agent response — pinned above transcript, full text, scrollable if long */}
      {lastAssistantMessage && (
        <View style={styles.agentMessage}>
          <Text style={styles.cardLabel}>Advisor</Text>
          <ScrollView
            style={styles.agentScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.agentText}>{lastAssistantMessage.content}</Text>
          </ScrollView>
        </View>
      )}

      {/* Transcript box — listening, stopping (loading), or preview */}
      {(isListening || isStopping || isPreview) && (
        <View style={[styles.transcriptFloat, isPreview && styles.transcriptFloatPreview]}>
          {isStopping
            ? (
                <View style={styles.stoppingRow}>
                  <ActivityIndicator size="small" color={colors.brand.muted} />
                  <Text style={styles.stoppingText}>Processing…</Text>
                </View>
              )
            : (
                <ScrollView
                  ref={transcriptScrollRef}
                  style={isListening ? styles.transcriptScrollListening : styles.transcriptScrollPreview}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={isPreview}
                >
                  <Text style={styles.transcriptText}>{transcript || '…'}</Text>
                </ScrollView>
              )}

          {isPreview && (
            <View style={styles.previewActions}>
              <TouchableOpacity onPress={handleCancel} style={styles.cancelButton} activeOpacity={0.7}>
                <Ionicons name="close" size={15} color={colors.brand.muted} />
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSend} style={styles.sendButton} activeOpacity={0.7}>
                <Text style={styles.sendText}>Send</Text>
                <Ionicons name="arrow-up" size={15} color={colors.brand.bg} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

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
          disabled={isBusy || isSending || isStopping || isPreview}
        >
          {isBusy || isSending || isStopping
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
  // User message — no card, plain text, truncated
  userMessage: {
    marginTop: 16,
    marginBottom: 4,
  },
  userMessageLabel: {
    color: '#A08060',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  userMessageText: {
    color: colors.brand.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  cardLabel: {
    color: '#A08060',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },

  // Agent response — pinned near bottom, bold, scrollable if long
  agentMessage: {
    marginHorizontal: 24,
    maxHeight: 220,
    paddingBottom: 12,
    paddingTop: 16,
  },
  agentScroll: {
    flexGrow: 0,
  },
  agentText: {
    color: colors.brand.dark,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 28,
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
  // Transcript box — normal flow, sits below agent, above bottom bar
  transcriptFloat: {
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
  transcriptFloatPreview: {
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
  transcriptScrollListening: {
    maxHeight: 44, // ~2 lines — shows only last phrase
  },
  transcriptScrollPreview: {
    maxHeight: 96,
  },
  transcriptText: {
    color: colors.brand.dark,
    fontSize: 15,
    lineHeight: 22,
  },
  previewActions: {
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
