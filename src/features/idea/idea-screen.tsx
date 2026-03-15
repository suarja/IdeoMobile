import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, FocusAwareStatusBar, Text, View } from '@/components/ui';

import { useWhisperModels, WHISPER_MODELS } from '@/lib/hooks/use-whisper-models';
import { translate } from '@/lib/i18n';
import { storage } from '@/lib/storage';

import { MicBottomBar } from './components/mic-bottom-bar';
import { TranscriptBox } from './components/transcript-box';
import { useIdeaSession } from './use-idea-session';
import { useVoiceRecording } from './use-voice-recording';

function getStatusText(flags: {
  isDownloading: boolean;
  isInitializingModel: boolean;
  isSending: boolean;
  isListening: boolean;
  getDownloadProgress: (id: string) => number;
  currentModelId: string | null;
}): string {
  if (flags.isDownloading) {
    const pct = Math.round(flags.getDownloadProgress(flags.currentModelId ?? 'base') * 100);
    return `Downloading model… ${pct}%`;
  }
  if (flags.isInitializingModel)
    return 'Initializing model…';
  if (flags.isSending)
    return 'Thinking…';
  if (flags.isListening)
    return 'Listening…';
  return translate('idea.subtitle');
}

// eslint-disable-next-line max-lines-per-function
export function IdeaScreen() {
  const { whisperContext, isInitializingModel, isDownloading, currentModelId, initializeWhisperModel, getDownloadProgress }
    = useWhisperModels();

  useEffect(() => {
    const saved = storage.getString('whisper_selected_model');
    const modelId = (saved && WHISPER_MODELS.some(m => m.id === saved)) ? saved : 'base';
    initializeWhisperModel(modelId).catch((err) => {
      console.error('Model init failed, falling back to base:', err);
      if (modelId !== 'base') {
        storage.delete('whisper_selected_model');
        initializeWhisperModel('base').catch(console.error);
      }
    });
  }, [initializeWhisperModel]);

  const session = useIdeaSession();

  const recording = useVoiceRecording({
    whisperContext,
    onRecordingComplete: session.enterPreview,
  });

  const insets = useSafeAreaInsets();
  const isBusy = isInitializingModel || isDownloading;
  const showTranscript = recording.isListening || recording.isStopping || session.isPreview;
  const showEmpty = !session.lastUserMessage && !session.lastAssistantMessage && !isBusy;

  const statusText = getStatusText({
    isDownloading,
    isInitializingModel,
    isSending: session.isSending,
    isListening: recording.isListening,
    getDownloadProgress,
    currentModelId,
  });

  const handleSend = async () => {
    await session.handleSend(recording.transcript);
    recording.clearTranscript();
  };

  const handleCancel = () => {
    session.handleCancel();
    recording.clearTranscript();
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.brand.bg }}>
      <FocusAwareStatusBar />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Ideo</Text>
        <Ionicons name="share-outline" size={22} color={colors.brand.dark} style={{ opacity: 0.4 }} />
      </View>

      {/* Scrollable content — title, user message, error */}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.ideaTitle}>{translate('idea.title_placeholder')}</Text>

        {showEmpty && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyHint}>{translate('idea.empty_hint')}</Text>
            <Text style={styles.emptyHint}>{translate('idea.empty_hint2')}</Text>
            <Ionicons name="chevron-down-outline" size={28} color={colors.brand.dark} style={styles.arrowHint} />
          </View>
        )}

        {session.lastUserMessage && (
          <View style={styles.userMessage}>
            <Text style={styles.userMessageLabel}>You said</Text>
            <Text style={styles.userMessageText} numberOfLines={3} ellipsizeMode="tail">
              {session.lastUserMessage.content}
            </Text>
          </View>
        )}

        {session.agentError && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{session.agentError}</Text>
          </View>
        )}
      </ScrollView>

      {/* Agent response — pinned above transcript, bold, scrollable if long */}
      {session.lastAssistantMessage && (
        <View style={styles.agentMessage}>
          <Text style={styles.cardLabel}>Advisor</Text>
          <ScrollView style={styles.agentScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.agentText}>{session.lastAssistantMessage.content}</Text>
          </ScrollView>
        </View>
      )}

      {/* Transcript box — listening / stopping / preview */}
      {showTranscript && (
        <TranscriptBox
          isListening={recording.isListening}
          isStopping={recording.isStopping}
          isPreview={session.isPreview}
          transcript={recording.transcript}
          transcriptScrollRef={recording.transcriptScrollRef}
          onSend={handleSend}
          onCancel={handleCancel}
        />
      )}

      <MicBottomBar
        statusText={statusText}
        isListening={recording.isListening}
        isActive={recording.isListening || session.isSending}
        isDisabled={isBusy || session.isSending || recording.isStopping || session.isPreview}
        showSpinner={isBusy || session.isSending || recording.isStopping}
        onPress={recording.toggleListening}
      />
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
  userMessage: {
    marginBottom: 4,
    marginTop: 16,
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
});
