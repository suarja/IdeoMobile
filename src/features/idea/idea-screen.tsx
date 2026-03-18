import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, FocusAwareStatusBar, Text, View } from '@/components/ui';

import { useWhisperModels } from '@/lib/hooks/use-whisper-models';
import { translate } from '@/lib/i18n';

import { useActiveThread } from './api';
import { MicBottomBar } from './components/mic-bottom-bar';
import { QuestionConfirmCancel } from './components/question-confirm-cancel';
import { QuestionMultiSelect } from './components/question-multi-select';
import { QuestionSingleChoice } from './components/question-single-choice';
import { TranscriptBox } from './components/transcript-box';
import { useIdeaSession } from './use-idea-session';
import { useVoiceRecording } from './use-voice-recording';

function getStatusText(flags: {
  isDownloading: boolean;
  isInitializingModel: boolean;
  isSynthesizing: boolean;
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
  if (flags.isSynthesizing)
    return translate('synthesizing.loading_step');
  if (flags.isListening)
    return 'Listening…';
  return translate('idea.subtitle');
}

function SpinnerIcon() {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [rotation]);

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={[styles.spinner, { transform: [{ rotate }] }]} />
  );
}

// eslint-disable-next-line max-lines-per-function
export function IdeaScreen() {
  const { whisperContext, isInitializingModel, isDownloading, currentModelId, initializeWhisperModel, getDownloadProgress }
    = useWhisperModels();

  useEffect(() => {
    initializeWhisperModel('base').catch(console.error);
  }, [initializeWhisperModel]);

  const session = useIdeaSession();
  const activeThread = useActiveThread();

  const recording = useVoiceRecording({
    whisperContext,
    onRecordingComplete: session.enterPreview,
  });

  const insets = useSafeAreaInsets();
  const isBusy = isInitializingModel || isDownloading;
  const showTranscript = recording.isListening || recording.isStopping || session.isPreview;
  const showEmpty = !session.lastUserMessage && !session.lastAssistantMessage && !isBusy && !session.isSynthesizing;

  const statusText = getStatusText({
    isDownloading,
    isInitializingModel,
    isSynthesizing: session.isSynthesizing,
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

  // Text to display: prefer streaming text while synthesizing, fall back to completed assistant message
  const displayText = session.isSynthesizing
    ? session.streamingText
    : (session.lastAssistantMessage?.content ?? '');

  return (
    <View className="flex-1" style={{ backgroundColor: colors.brand.bg }}>
      <FocusAwareStatusBar />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        {session.isSynthesizing
          ? (
              <Text style={styles.synthesizingTitle}>{translate('synthesizing.title')}</Text>
            )
          : (
              <Text style={styles.headerTitle}>Ideo</Text>
            )}
        {session.isSynthesizing
          ? <SpinnerIcon />
          : <Ionicons name="share-outline" size={22} color={colors.brand.dark} style={{ opacity: 0.4 }} />}
      </View>

      {/* Scrollable content */}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!session.isSynthesizing && (
          <Text style={styles.ideaTitle}>
            {activeThread?.title ?? translate('idea.title_placeholder')}
          </Text>
        )}

        {showEmpty && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyHint}>{translate('idea.empty_hint')}</Text>
            <Text style={styles.emptyHint}>{translate('idea.empty_hint2')}</Text>
            <Ionicons name="chevron-down-outline" size={28} color={colors.brand.dark} style={styles.arrowHint} />
          </View>
        )}

        {session.lastUserMessage && !session.isSynthesizing && (
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

      {/* Agent response — streaming or completed */}
      {(displayText || session.isSynthesizing) && (
        <View style={styles.agentMessage}>
          {!session.isSynthesizing && <Text style={styles.cardLabel}>Advisor</Text>}
          <ScrollView style={styles.agentScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.agentText}>
              {displayText}
              {session.isSynthesizing && session.streamingText
                ? (
                    <Text style={styles.cursor}>▌</Text>
                  )
                : null}
            </Text>
          </ScrollView>
        </View>
      )}

      {/* Clarification block */}
      {session.clarification && !session.isSynthesizing && (
        <>
          {session.clarification.type === 'single_choice' && session.clarification.options && (
            <QuestionSingleChoice
              question={session.clarification.question}
              options={session.clarification.options}
              onSelect={session.handleClarificationSelect}
              isDisabled={session.isSending}
            />
          )}
          {session.clarification.type === 'multi_select' && session.clarification.options && (
            <QuestionMultiSelect
              question={session.clarification.question}
              options={session.clarification.options}
              onSelect={session.handleClarificationSelect}
              isDisabled={session.isSending}
            />
          )}
          {session.clarification.type === 'confirm_cancel' && (
            <QuestionConfirmCancel
              question={session.clarification.question}
              confirmLabel={session.clarification.confirmLabel ?? 'Confirm'}
              cancelLabel={session.clarification.cancelLabel ?? 'Cancel'}
              onConfirm={() => session.handleClarificationSelect(session.clarification!.confirmLabel ?? 'Confirm')}
              onCancel={() => session.handleClarificationSelect(session.clarification!.cancelLabel ?? 'Cancel')}
              isDisabled={session.isSending}
            />
          )}
        </>
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
        isActive={recording.isListening || session.isSynthesizing}
        isDisabled={isBusy || session.isSynthesizing || recording.isStopping || session.isPreview}
        showSpinner={isBusy || session.isSynthesizing || recording.isStopping}
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
  synthesizingTitle: {
    color: '#A08060',
    fontFamily: 'Georgia',
    fontSize: 17,
    fontStyle: 'italic',
  },
  spinner: {
    borderBottomColor: 'transparent',
    borderColor: '#C4773B',
    borderLeftColor: 'transparent',
    borderRadius: 16,
    borderWidth: 2.5,
    height: 32,
    width: 32,
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
  cursor: {
    color: '#C4773B',
    fontSize: 17,
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
