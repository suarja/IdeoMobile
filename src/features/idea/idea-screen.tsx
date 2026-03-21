import { useSmoothText } from '@convex-dev/agent/react';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from 'convex/react';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, FocusAwareStatusBar, Text, View } from '@/components/ui';
import { useModal } from '@/components/ui/modal';

import { useWhisperModels } from '@/lib/hooks/use-whisper-models';
import { translate } from '@/lib/i18n';
import { storage } from '@/lib/storage';

import { api } from '../../../convex/_generated/api';
import { useUserStats } from '../focus/api';
import { WhisperModelBottomSheet } from '../settings/components/whisper-model-bottom-sheet';
import { useActiveThread, useMessages } from './api';
import { AgentMarkdown } from './components/agent-markdown';
import { ClarificationBlock } from './components/clarification-block';
import { DailyRitualModal } from './components/daily-ritual-modal';
import { DailyStreakModal } from './components/daily-streak-modal';
import { InlineSynthesizing } from './components/inline-synthesizing';
import { MicBottomBar } from './components/mic-bottom-bar';
import { PointsBanner } from './components/points-banner';
import { SessionContinuationChips } from './components/session-continuation-chips';
import { SessionEndCard } from './components/session-end-card';
import { TranscriptBox } from './components/transcript-box';
import { WhisperOnboardingModal } from './components/whisper-onboarding-modal';
import { useStandupTrigger } from './hooks/use-standup-trigger';
import { useIdeaSession } from './use-idea-session';
import { useVoiceRecording } from './use-voice-recording';

const ONE_HOUR_MS = 60 * 60 * 1000;
const THREE_HOURS_MS = 3 * ONE_HOUR_MS;

// eslint-disable-next-line max-lines-per-function
export function IdeaScreen() {
  const {
    whisperContext,
    isInitializingModel,
    isDownloading,
    currentModelId,
    initializeWhisperModel,
    softResetWhisperContext,
    getDownloadProgress,
    modelFiles,
    deleteModel,
    isModelDownloaded,
    availableModels,
  } = useWhisperModels();

  // Refs so the useFocusEffect callback stays stable (empty deps).
  // Without this, changing deps (currentModelId, isInitializingModel) would re-create the
  // callback while the screen is focused, re-triggering the effect on every state change.
  const currentModelIdRef = useRef(currentModelId);
  const isInitializingModelRef = useRef(isInitializingModel);
  const initializeWhisperModelRef = useRef(initializeWhisperModel);
  useEffect(() => {
    currentModelIdRef.current = currentModelId;
  }, [currentModelId]);
  useEffect(() => {
    isInitializingModelRef.current = isInitializingModel;
  }, [isInitializingModel]);
  useEffect(() => {
    initializeWhisperModelRef.current = initializeWhisperModel;
  }, [initializeWhisperModel]);

  // Sync model from storage whenever this screen gains focus.
  // Needed because WhisperModelItem (settings) has its own useWhisperModels() instance
  // that writes to storage but doesn't share React state with this screen.
  useFocusEffect(
    useCallback(() => {
      const saved = storage.getString('whisper_selected_model');
      if (saved && saved !== currentModelIdRef.current && !isInitializingModelRef.current) {
        initializeWhisperModelRef.current(saved).catch(console.error);
      }
    }, []), // intentionally empty — state accessed via refs above
  );

  const session = useIdeaSession();
  const activeThread = useActiveThread();
  const userStats = useUserStats();
  const messages = useMessages(activeThread?.threadId ?? null);
  const recordAppOpen = useMutation(api.gamification.recordAppOpen);

  // Reactive PointsBanner: tracks totalPoints delta from any source (agent, challenges, etc.)
  const prevPointsRef = useRef<number | null>(null);
  useEffect(() => {
    if (!userStats)
      return;
    const current = userStats.totalPoints;
    if (prevPointsRef.current !== null && current > prevPointsRef.current) {
      setPendingPoints(current - prevPointsRef.current);
    }
    prevPointsRef.current = current;
  // eslint-disable-next-line react-compiler/react-compiler
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userStats?.totalPoints]);

  const [inputText, setInputText] = useState('');
  const [pendingPoints, setPendingPoints] = useState<number | null>(null);
  const [sessionEndDismissed, setSessionEndDismissed] = useState(false);
  const [sessionEndRequested, setSessionEndRequested] = useState(false);
  const [streakData, setStreakData] = useState<{ currentStreak: number; activeDays: string[] } | null>(null);
  const [showStreakModal, setShowStreakModal] = useState(false);

  // Whisper onboarding: show once if no model has ever been selected
  const hasSeenOnboarding = storage.getString('whisper_onboarding_seen') === '1';
  const hasSavedModel = !!storage.getString('whisper_selected_model');
  const [showOnboarding, setShowOnboarding] = useState(!hasSeenOnboarding && !hasSavedModel);
  const whisperModal = useModal();

  const { showStandupSplash, setShowStandupSplash } = useStandupTrigger(userStats);

  // Award app-open points on mount (banner handled reactively via prevPointsRef)
  useEffect(() => {
    recordAppOpen()
      .then((result) => {
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

  // stop() timed out → context was released inside useVoiceRecording.
  // Soft-reset clears the React state, then immediately re-init the same model so the
  // user can record again without navigating away. Ref prevents stale closure.
  const handleStopTimeout = useCallback(() => {
    softResetWhisperContext();
    const saved = currentModelIdRef.current;
    if (saved) {
      initializeWhisperModelRef.current(saved).catch(console.error);
    }
  }, [softResetWhisperContext]);

  const recording = useVoiceRecording({
    whisperContext,
    onRecordingComplete: session.enterPreview,
    onStopTimeout: handleStopTimeout,
  });
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

  const handleMicPress = async () => {
    if (!whisperContext && !isDownloading && !isInitializingModel) {
      whisperModal.present();
      return;
    }
    await recording.toggleListening();
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
          !whisperContext && !isDownloading && !isInitializingModel
            ? 'Choisir un modèle vocal →'
            : isDownloading
              ? `Downloading… ${Math.round(getDownloadProgress(currentModelId ?? '') * 100)}%`
              : isInitializingModel
                ? 'Initializing…'
                : recording.isStopping
                  ? 'Processing audio…'
                  : recording.isListening
                    ? 'Listening…'
                    : ''
        }
        isListening={recording.isListening}
        isActive={recording.isListening || session.isSynthesizing}
        isDisabled={isBusy || session.isSynthesizing || recording.isStopping}
        showSpinner={isBusy || session.isSynthesizing || recording.isStopping}
        onPress={handleMicPress}
        inputText={inputText}
        onInputChange={(text) => {
          setInputText(text);
          if (session.isPreview)
            recording.clearTranscript();
        }}
        onSend={handleSend}
      />

      <WhisperOnboardingModal
        visible={showOnboarding}
        onContinue={() => {
          storage.set('whisper_onboarding_seen', '1');
          setShowOnboarding(false);
          whisperModal.present();
        }}
      />

      <WhisperModelBottomSheet
        modalRef={whisperModal.ref}
        modelFiles={modelFiles}
        isDownloading={isDownloading}
        isInitializingModel={isInitializingModel}
        currentModelId={currentModelId}
        initializeWhisperModel={initializeWhisperModel}
        deleteModel={deleteModel}
        isModelDownloaded={isModelDownloaded}
        getDownloadProgress={getDownloadProgress}
        availableModels={availableModels}
      />

      <DailyStreakModal
        visible={showStreakModal}
        currentStreak={streakData?.currentStreak ?? 0}
        activeDays={streakData?.activeDays ?? []}
        onClose={() => setShowStreakModal(false)}
      />

      <DailyRitualModal
        visible={showStandupSplash}
        onClose={() => setShowStandupSplash(false)}
        onStartStandup={() => setShowStandupSplash(false)}
      />
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
    textShadowColor: 'rgba(255,255,255,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
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
    textShadowColor: 'rgba(255,255,255,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
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
    textShadowColor: 'rgba(255,255,255,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
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
