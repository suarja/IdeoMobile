import { useSmoothText } from '@convex-dev/agent/react';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from 'convex/react';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, FocusAwareStatusBar, Text, View } from '@/components/ui';

import { useWhisperModels } from '@/lib/hooks/use-whisper-models';
import { translate } from '@/lib/i18n';
import { storage } from '@/lib/storage';

import { api } from '../../../convex/_generated/api';
import { useUserStats } from '../focus/api';
import { useActiveThread, useMessages } from './api';
import { AgentMarkdown } from './components/agent-markdown';
import { ClarificationBlock } from './components/clarification-block';
import { DailyStreakModal } from './components/daily-streak-modal';
import { InlineSynthesizing } from './components/inline-synthesizing';
import { MicBottomBar } from './components/mic-bottom-bar';
import { PointsBanner } from './components/points-banner';
import { SessionContinuationChips } from './components/session-continuation-chips';
import { SessionEndCard } from './components/session-end-card';
import { StandupSplash } from './components/standup-splash';
import { TranscriptBox } from './components/transcript-box';
import { useStandupTrigger } from './hooks/use-standup-trigger';
import { useIdeaSession } from './use-idea-session';
import { useVoiceRecording } from './use-voice-recording';

const ONE_HOUR_MS = 60 * 60 * 1000;
const THREE_HOURS_MS = 3 * ONE_HOUR_MS;

// eslint-disable-next-line max-lines-per-function
export function IdeaScreen() {
  const { whisperContext, isInitializingModel, isDownloading, currentModelId, initializeWhisperModel, getDownloadProgress }
    = useWhisperModels();

  useEffect(() => {
    initializeWhisperModel('base').catch(console.error);
  }, [initializeWhisperModel]);

  const session = useIdeaSession();
  const activeThread = useActiveThread();
  const userStats = useUserStats();
  const messages = useMessages(activeThread?.threadId ?? null);
  const recordAppOpen = useMutation(api.gamification.recordAppOpen);

  const [inputText, setInputText] = useState('');
  const [pendingPoints, setPendingPoints] = useState<number | null>(null);
  const [sessionEndDismissed, setSessionEndDismissed] = useState(false);
  const [sessionEndRequested, setSessionEndRequested] = useState(false);
  const [streakData, setStreakData] = useState<{ currentStreak: number; activeDays: string[] } | null>(null);
  const [showStreakModal, setShowStreakModal] = useState(false);

  const { showStandupSplash, setShowStandupSplash } = useStandupTrigger(userStats);

  // Award app-open points on mount
  useEffect(() => {
    recordAppOpen()
      .then((result) => {
        if (!result.skipped && result.pointsEarned) {
          setPendingPoints(result.pointsEarned);
        }
        if (result.currentStreak !== undefined && result.activeDays) {
          setStreakData({ currentStreak: result.currentStreak, activeDays: result.activeDays as string[] });
        }
        if (result.isNewStreakDay && result.currentStreak && result.activeDays) {
          const today = new Date().toISOString().split('T')[0];
          const lastShown = storage.getString('@ideo_last_streak_modal_date');
          if (lastShown !== today) {
            storage.set('@ideo_last_streak_modal_date', today);
            setShowStreakModal(true);
          }
        }
      })
      .catch(console.error);
  // eslint-disable-next-line react-compiler/react-compiler
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (session.sessionEndData) {
      setSessionEndDismissed(false);
    }
  }, [session.sessionEndData]);

  useEffect(() => {
    if (!userStats || userStats.hasDailyMood || !userStats.standupTime) {
      if (showStandupSplash)
        setShowStandupSplash(false);
    }
  }, [userStats?.standupTime, userStats?.hasDailyMood, userStats, showStandupSplash, setShowStandupSplash]);

  const recording = useVoiceRecording({ whisperContext, onRecordingComplete: session.enterPreview });
  const insets = useSafeAreaInsets();

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const isBusy = isInitializingModel || isDownloading;
  const showTranscript = recording.isListening || recording.isStopping || session.isPreview;
  const showEmpty = !session.lastUserMessage && !session.lastAssistantMessage && !isBusy && !session.isSynthesizing;
  const hasActiveSession = session.lastUserMessage !== null || session.lastAssistantMessage !== null;

  // Most reliable timestamp — custom messages table uses Date.now()
  const lastMessageAt: number | null = (() => {
    if (!messages || messages.length === 0)
      return null;
    const last = [...messages].reverse().find(m => m.role === 'assistant' || m.role === 'user');
    return (last as any)?.createdAt ?? null;
  })();

  const isRecentSession = hasActiveSession && lastMessageAt !== null && (Date.now() - lastMessageAt) < THREE_HOURS_MS;
  const showEndSessionBtn = isRecentSession && !session.isSynthesizing && !sessionEndRequested && (!session.sessionEndData || sessionEndDismissed);
  const showContinuationChips = !session.isSynthesizing && lastMessageAt !== null && Date.now() - lastMessageAt > ONE_HOUR_MS && hasActiveSession;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSend = async () => {
    const content = inputText.trim() || recording.transcript.trim();
    if (!content)
      return;
    await session.handleSend(content);
    setInputText('');
    recording.clearTranscript();
  };

  const handleCancel = () => {
    session.handleCancel();
    setInputText('');
    recording.clearTranscript();
  };

  const handleEndSession = () => {
    setSessionEndRequested(true);
    session.handleSend('[SYSTEM: User requested session end. Please call endSession() with a summary of this session.]')
      .catch(console.error);
  };

  // ---------------------------------------------------------------------------
  // Streaming text + scroll
  // ---------------------------------------------------------------------------

  const [smoothedStreamingText] = useSmoothText(session.streamingText, { startStreaming: session.isSynthesizing });

  const displayText = session.isSynthesizing
    ? smoothedStreamingText
    : (session.lastAssistantMessage?.content ?? '');

  const scrollViewRef = useRef<ScrollView>(null);
  const prevIsSynthesizingRef = useRef(false);

  useEffect(() => {
    if (session.isSynthesizing) {
      scrollViewRef.current?.scrollToEnd({ animated: false });
    }
  }, [smoothedStreamingText, session.isSynthesizing]);

  useEffect(() => {
    if (prevIsSynthesizingRef.current && !session.isSynthesizing) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
    prevIsSynthesizingRef.current = session.isSynthesizing;
  }, [session.isSynthesizing]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <KeyboardAvoidingView
      className="flex-1"
      style={{ backgroundColor: colors.brand.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <FocusAwareStatusBar />

      <PointsBanner
        points={pendingPoints ?? 0}
        visible={pendingPoints !== null}
        onDismiss={() => setPendingPoints(null)}
      />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Ideo</Text>
        {showEndSessionBtn && (
          <TouchableOpacity onPress={handleEndSession} style={styles.endBtn} activeOpacity={0.7}>
            <Ionicons name="flag-outline" size={18} color={colors.brand.dark} style={{ opacity: 0.5 }} />
            <Text style={styles.endBtnLabel}>Fin</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.ideaTitle}>
          {activeThread?.title ?? translate('idea.title_placeholder')}
        </Text>

        {session.isSynthesizing && <InlineSynthesizing />}

        {showEmpty && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyHint}>{translate('idea.empty_hint')}</Text>
            <Text style={styles.emptyHint}>{translate('idea.empty_hint2')}</Text>
            <Ionicons name="chevron-down-outline" size={28} color={colors.brand.dark} style={styles.arrowHint} />
          </View>
        )}

        {/* Scope — visible dès que le message est dans le thread, y compris pendant le streaming */}
        {session.lastUserMessage && (
          <View style={styles.userMessage}>
            <Text style={styles.userMessageLabel}>Scope</Text>
            <Text style={styles.userMessageText} numberOfLines={3} ellipsizeMode="tail">
              {session.lastUserMessage.content}
            </Text>
          </View>
        )}

        {(displayText || session.isSynthesizing) && (
          <View style={styles.agentMessage}>
            {!session.isSynthesizing && <Text style={styles.cardLabel}>Advisor</Text>}
            <AgentMarkdown
              text={displayText + (session.isSynthesizing && session.streamingText ? '▌' : '')}
              baseStyle={styles.agentText}
            />
          </View>
        )}

        {session.sessionEndData && !session.isSynthesizing && !sessionEndDismissed && (
          <SessionEndCard data={session.sessionEndData} onClose={() => setSessionEndDismissed(true)} />
        )}

        {session.clarification && !session.isSynthesizing && (
          <ClarificationBlock
            clarification={session.clarification}
            onSelect={session.handleClarificationSelect}
            isDisabled={session.isSending}
          />
        )}

        {showContinuationChips && (
          <SessionContinuationChips
            onContinue={() => {}}
            onNewTopic={(hint) => {
              session.handleSend(`[SYSTEM: Route to ${hint} agent. User wants to discuss a new topic.]`).catch(console.error);
            }}
          />
        )}

        {session.agentError && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{session.agentError}</Text>
          </View>
        )}
      </ScrollView>

      {showTranscript && (
        <TranscriptBox
          isListening={recording.isListening}
          isStopping={recording.isStopping}
          isPreview={session.isPreview}
          transcript={recording.transcript}
          transcriptScrollRef={recording.transcriptScrollRef}
          onSend={handleSend}
          onCancel={handleCancel}
          onTranscriptEdit={recording.setTranscript}
        />
      )}

      <MicBottomBar
        statusText={
          isDownloading
            ? `Downloading model… ${Math.round(getDownloadProgress(currentModelId ?? 'base') * 100)}%`
            : isInitializingModel
              ? 'Initializing model…'
              : recording.isListening
                ? 'Listening…'
                : ''
        }
        isListening={recording.isListening}
        isActive={recording.isListening || session.isSynthesizing}
        isDisabled={isBusy || session.isSynthesizing || recording.isStopping}
        showSpinner={isBusy || session.isSynthesizing || recording.isStopping}
        onPress={async () => { await recording.toggleListening(); }}
        inputText={inputText}
        onInputChange={(text) => {
          setInputText(text);
          if (session.isPreview)
            recording.clearTranscript();
        }}
        onSend={handleSend}
      />

      <DailyStreakModal
        visible={showStreakModal}
        currentStreak={streakData?.currentStreak ?? 0}
        activeDays={streakData?.activeDays ?? []}
        onClose={() => setShowStreakModal(false)}
      />

      <StandupSplash visible={showStandupSplash} onDismiss={() => setShowStandupSplash(false)} />
    </KeyboardAvoidingView>
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
  endBtn: {
    alignItems: 'center',
    gap: 2,
  },
  endBtnLabel: {
    color: colors.brand.muted,
    fontSize: 10,
    letterSpacing: 0.5,
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
    marginBottom: 8,
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
    marginTop: 16,
    paddingBottom: 12,
  },
  agentText: {
    color: colors.brand.dark,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 20,
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
