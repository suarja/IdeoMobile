import type { TranscribeRealtimeOptions } from 'whisper.rn/index.js';
import { Ionicons } from '@expo/vector-icons';
import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import { BlurView } from 'expo-blur';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

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

  // const handleStopAndSend = async (finalTranscript: string) => {
  //   if (!threadId || !finalTranscript.trim())
  //     return;

  //   setIsSending(true);
  //   setAgentError(null);
  //   try {
  //     await sendMessage({ threadId, content: finalTranscript.trim() });
  //   }
  //   catch (err) {
  //     console.error('Agent error:', err);
  //     setAgentError('Failed to get a response. Please try again.');
  //   }
  //   finally {
  //     setIsSending(false);
  //   }
  // };

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
      // Update UI immediately — before awaiting Whisper's stop (which can take 1-2s)
      setIsListening(false);
      // Fire stop in background, don't block UI on it
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

  return (
    <View className="flex-1" style={{ backgroundColor: colors.brand.bg }}>
      <FocusAwareStatusBar />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View className="flex-1 items-center" style={styles.hero}>
          <TouchableOpacity
            onPress={toggleListening}
            activeOpacity={0.8}
            style={[styles.micWrapper, isListening && styles.micWrapperActive]}
            disabled={isBusy || isSending || isPreview}
          >
            <BlurView tint="light" intensity={80} style={styles.micButton}>
              {isBusy || isSending
                ? (
                    <ActivityIndicator size="large" color={colors.brand.dark} />
                  )
                : (
                    <Ionicons
                      name={isListening ? 'stop' : 'mic'}
                      size={48}
                      color={isListening ? colors.primary[700] : colors.brand.dark}
                    />
                  )}
            </BlurView>
          </TouchableOpacity>

          <Text
            className="mt-8 text-center text-2xl font-semibold"
            style={{ color: colors.brand.dark }}
          >
            {translate('idea.cta')}
          </Text>

          <Text
            className="mt-2 px-8 text-center text-base"
            style={{ color: isListening || isSending ? colors.primary[700] : colors.brand.muted }}
          >
            {statusText}
          </Text>
        </View>

        {transcript
          ? (
              <View
                className="mx-6 mt-4 rounded-2xl p-4"
                style={{ backgroundColor: colors.brand.selected, borderWidth: 1, borderColor: colors.brand.border, maxHeight: 160 }}
              >
                <Text
                  className="mb-2 text-xs font-semibold tracking-widest uppercase"
                  style={{ color: '#A08060' }}
                >
                  You said
                </Text>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                >
                  <Text className="text-base/6" style={{ color: colors.brand.dark }}>
                    {transcript}
                  </Text>
                </ScrollView>
                {isPreview
                  ? (
                      <View className="mt-3 flex-row justify-end" style={{ gap: 8 }}>
                        <TouchableOpacity
                          onPress={handleCancel}
                          style={styles.cancelButton}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="close" size={16} color="#A08060" />
                          <Text className="text-sm font-medium" style={{ color: '#A08060' }}>
                            Cancel
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={handleSend}
                          style={styles.sendButton}
                          activeOpacity={0.7}
                        >
                          <Text className="text-sm font-medium" style={{ color: colors.brand.bg }}>
                            Send
                          </Text>
                          <Ionicons name="arrow-up" size={16} color={colors.brand.bg} />
                        </TouchableOpacity>
                      </View>
                    )
                  : null}
              </View>
            )
          : null}

        {lastAssistantMessage
          ? (
              <View
                className="mx-6 mt-3 rounded-2xl p-4"
                style={{ backgroundColor: colors.brand.dark, borderWidth: 1, borderColor: '#2E2420' }}
              >
                <Text
                  className="mb-2 text-xs font-semibold tracking-widest uppercase"
                  style={{ color: '#A08060' }}
                >
                  Advisor
                </Text>
                <Text className="text-base/6" style={{ color: colors.brand.bg }}>
                  {lastAssistantMessage.content}
                </Text>
              </View>
            )
          : null}

        {agentError
          ? (
              <View className="mx-6 mt-3 rounded-2xl p-4" style={{ backgroundColor: '#FDE8E8' }}>
                <Text className="text-sm" style={{ color: '#9B2335' }}>
                  {agentError}
                </Text>
              </View>
            )
          : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 48,
    paddingTop: 80,
  },
  hero: {
    paddingHorizontal: 24,
  },
  micButton: {
    alignItems: 'center',
    borderRadius: 60,
    height: 120,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 120,
  },
  micWrapper: {
    borderColor: 'rgba(67, 56, 49, 0.15)',
    borderRadius: 60,
    borderWidth: 1,
    elevation: 4,
    shadowColor: colors.brand.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  micWrapperActive: {
    borderColor: 'rgba(229, 97, 0, 0.4)',
    shadowColor: colors.primary[700],
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
  sendButton: {
    alignItems: 'center',
    backgroundColor: colors.brand.dark,
    borderRadius: 20,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
});
