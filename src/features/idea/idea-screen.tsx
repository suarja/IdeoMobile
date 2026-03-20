import { useSmoothText } from '@convex-dev/agent/react';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from 'convex/react';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, FocusAwareStatusBar, Text, View } from '@/components/ui';

import { useWhisperModels } from '@/lib/hooks/use-whisper-models';
import { translate } from '@/lib/i18n';

import { storage } from '@/lib/storage';
import { api } from '../../../convex/_generated/api';
import { useUserStats } from '../focus/api';
import { useActiveThread, useMessages } from './api';
import { DailyStreakModal } from './components/daily-streak-modal';
import { MicBottomBar } from './components/mic-bottom-bar';
import { PointsBanner } from './components/points-banner';
import { QuestionConfirmCancel } from './components/question-confirm-cancel';
import { QuestionMultiSelect } from './components/question-multi-select';
import { QuestionSingleChoice } from './components/question-single-choice';
import { SessionContinuationChips } from './components/session-continuation-chips';
import { SessionEndCard } from './components/session-end-card';
import { StandupSplash } from './components/standup-splash';
import { TranscriptBox } from './components/transcript-box';
import { useStandupTrigger } from './hooks/use-standup-trigger';
import { useIdeaSession } from './use-idea-session';
import { useVoiceRecording } from './use-voice-recording';

const ONE_HOUR_MS = 60 * 60 * 1000;
const THREE_HOURS_MS = 3 * ONE_HOUR_MS;

type Segment = { text: string; bold: boolean; italic: boolean };

/**
 * Parses ***bold italic***, **bold**, *italic* and _italic_ into segments.
 * Falls back to plain text for anything not matched.
 */
function parseMarkdownInline(raw: string): Segment[] {
  const segments: Segment[] = [];
  // Matches: ***…***, **…**, *…*, _…_
  const RE = /\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_/gs;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = RE.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: raw.slice(lastIndex, match.index), bold: false, italic: false });
    }
    if (match[1] !== undefined) {
      segments.push({ text: match[1], bold: true, italic: true });
    }
    else if (match[2] !== undefined) {
      segments.push({ text: match[2], bold: true, italic: false });
    }
    else if (match[3] !== undefined || match[4] !== undefined) {
      segments.push({ text: (match[3] ?? match[4])!, bold: false, italic: true });
    }
    lastIndex = RE.lastIndex;
  }
  if (lastIndex < raw.length) {
    segments.push({ text: raw.slice(lastIndex), bold: false, italic: false });
  }
  return segments.length > 0 ? segments : [{ text: raw, bold: false, italic: false }];
}

function AgentText({ text, baseStyle }: { text: string; baseStyle: object }) {
  const segments = parseMarkdownInline(text);
  if (segments.length === 1 && !segments[0].bold && !segments[0].italic) {
    return <Text style={baseStyle}>{text}</Text>;
  }
  return (
    <Text>
      {segments.map((seg, i) => (
        <Text
          key={i}
          style={[
            baseStyle,
            seg.bold && { fontWeight: '700' as const },
            seg.italic && { fontStyle: 'italic' as const },
          ]}
        >
          {seg.text}
        </Text>
      ))}
    </Text>
  );
}

function InlineSynthesizing() {
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
    <View style={styles.synthRow}>
      <Text style={styles.synthText}>Synthesizing your thoughts…</Text>
      <Animated.View style={[styles.synthSpinner, { transform: [{ rotate }] }]} />
    </View>
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
  const userStats = useUserStats();
  // Read from custom messages table (createdAt: Date.now() — 100% reliable timestamp)
  const messages = useMessages(activeThread?.threadId ?? null);
  const recordAppOpen = useMutation(api.gamification.recordAppOpen);

  // Shared input text — typed or appended from voice
  const [inputText, setInputText] = useState('');
  // Points banner
  const [pendingPoints, setPendingPoints] = useState<number | null>(null);
  // Dismiss session end card
  const [sessionEndDismissed, setSessionEndDismissed] = useState(false);
  // Latch: user explicitly pressed "Fin" — hide button until next session
  const [sessionEndRequested, setSessionEndRequested] = useState(false);

  // Streak modal data
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

        // Always save streak data so we can display it if user manually opens it or later
        if (result.currentStreak !== undefined && result.activeDays) {
          setStreakData({
            currentStreak: result.currentStreak,
            activeDays: result.activeDays as string[],
          });
        }

        // Show modal logic
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

  // Reset session end dismissed when a new session end is detected
  useEffect(() => {
    if (session.sessionEndData) {
      setSessionEndDismissed(false);
    }
  }, [session.sessionEndData]);

  // Hide standup splash if conditions are no longer met
  useEffect(() => {
    if (!userStats || userStats.hasDailyMood || !userStats.standupTime) {
      if (showStandupSplash)
        setShowStandupSplash(false);
    }
  }, [userStats?.standupTime, userStats?.hasDailyMood, userStats, showStandupSplash, setShowStandupSplash]);

  const recording = useVoiceRecording({
    whisperContext,
    onRecordingComplete: session.enterPreview,
  });

  const insets = useSafeAreaInsets();
  const isBusy = isInitializingModel || isDownloading;

  const showTranscript = recording.isListening || recording.isStopping || session.isPreview;
  const showEmpty = !session.lastUserMessage && !session.lastAssistantMessage && !isBusy && !session.isSynthesizing;

  const hasActiveSession = session.lastUserMessage !== null || session.lastAssistantMessage !== null;
  // Compute lastMessageAt from the custom messages table (createdAt: Date.now()).
  // This is the most reliable source — no dependency on _creationTime from agent thread messages.
  const lastMessageAt: number | null = (() => {
    if (!messages || messages.length === 0)
      return null;
    const last = [...messages].reverse().find(m => m.role === 'assistant' || m.role === 'user');
    return (last as any)?.createdAt ?? null;
  })();
  // "Active session" = messages exist AND last message is within the 3h session window
  const isRecentSession
    = hasActiveSession
      && lastMessageAt !== null
      && (Date.now() - lastMessageAt) < THREE_HOURS_MS;
  // Session end button: only show during an active recent session, and hide once user pressed it
  const showEndSessionBtn
    = isRecentSession
      && !session.isSynthesizing
      && !sessionEndRequested
      && (!session.sessionEndData || sessionEndDismissed);

  const showContinuationChips
    = !session.isSynthesizing
      && lastMessageAt !== null
      && Date.now() - lastMessageAt > ONE_HOUR_MS
      && hasActiveSession;

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

  const [smoothedStreamingText] = useSmoothText(session.streamingText, {
    startStreaming: session.isSynthesizing,
  });

  // Text to display: prefer streaming text while synthesizing, fall back to completed assistant message
  const displayText = session.isSynthesizing
    ? smoothedStreamingText
    : (session.lastAssistantMessage?.content ?? '');

  const scrollViewRef = useRef<ScrollView>(null);
  const prevIsSynthesizingRef = useRef(false);

  // Scroll during streaming to track visible text
  useEffect(() => {
    if (session.isSynthesizing) {
      scrollViewRef.current?.scrollToEnd({ animated: false });
    }
  }, [smoothedStreamingText, session.isSynthesizing]);

  // Scroll to bottom when streaming ends (transition true → false)
  useEffect(() => {
    if (prevIsSynthesizingRef.current && !session.isSynthesizing) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    prevIsSynthesizingRef.current = session.isSynthesizing;
  }, [session.isSynthesizing]);

  return (
    <KeyboardAvoidingView
      className="flex-1"
      style={{ backgroundColor: colors.brand.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <FocusAwareStatusBar />

      {/* Points banner — absolute overlay */}
      <PointsBanner
        points={pendingPoints ?? 0}
        visible={pendingPoints !== null}
        onDismiss={() => setPendingPoints(null)}
      />

      {/* Header — always "Ideo" + conditional End Session button */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Ideo</Text>
        {showEndSessionBtn && (
          <TouchableOpacity onPress={handleEndSession} style={styles.endBtn} activeOpacity={0.7}>
            <Ionicons name="flag-outline" size={18} color={colors.brand.dark} style={{ opacity: 0.5 }} />
            <Text style={styles.endBtnLabel}>Fin</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Scrollable unified content block */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Idea title */}
        <Text style={styles.ideaTitle}>
          {activeThread?.title ?? translate('idea.title_placeholder')}
        </Text>

        {/* Inline synthesizing indicator */}
        {session.isSynthesizing && <InlineSynthesizing />}

        {showEmpty && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyHint}>{translate('idea.empty_hint')}</Text>
            <Text style={styles.emptyHint}>{translate('idea.empty_hint2')}</Text>
            <Ionicons name="chevron-down-outline" size={28} color={colors.brand.dark} style={styles.arrowHint} />
          </View>
        )}

        {/* Last user message */}
        {session.lastUserMessage && !session.isSynthesizing && (
          <View style={styles.userMessage}>
            <Text style={styles.userMessageLabel}>You said</Text>
            <Text style={styles.userMessageText} numberOfLines={3} ellipsizeMode="tail">
              {session.lastUserMessage.content}
            </Text>
          </View>
        )}

        {/* Agent response */}
        {(displayText || session.isSynthesizing) && (
          <View style={styles.agentMessage}>
            {!session.isSynthesizing && <Text style={styles.cardLabel}>Advisor</Text>}
            <AgentText
              text={displayText + (session.isSynthesizing && session.streamingText ? '▌' : '')}
              baseStyle={styles.agentText}
            />
          </View>
        )}

        {/* Session end card */}
        {session.sessionEndData && !session.isSynthesizing && !sessionEndDismissed && (
          <SessionEndCard
            data={session.sessionEndData}
            onClose={() => setSessionEndDismissed(true)}
          />
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

        {/* Continuation chips — shown after 1h inactivity */}
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
        onPress={async () => {
          await recording.toggleListening();
        }}
        inputText={inputText}
        onInputChange={(text) => {
          setInputText(text);
          // Clear preview if user edits the text directly
          if (session.isPreview) {
            recording.clearTranscript();
          }
        }}
        onSend={handleSend}
      />

      {/* Daily Streak Modal */}
      <DailyStreakModal
        visible={showStreakModal}
        currentStreak={streakData?.currentStreak ?? 0}
        activeDays={streakData?.activeDays ?? []}
        onClose={() => setShowStreakModal(false)}
      />

      {/* Standup Splash (Daily Ritual) */}
      <StandupSplash
        visible={showStandupSplash}
        onDismiss={() => setShowStandupSplash(false)}
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
  synthRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  synthText: {
    color: '#A08060',
    fontSize: 12,
  },
  synthSpinner: {
    borderBottomColor: 'transparent',
    borderColor: '#C4773B',
    borderLeftColor: 'transparent',
    borderRadius: 8,
    borderWidth: 1.5,
    height: 16,
    width: 16,
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
  cursor: {
    color: '#C4773B',
    fontSize: 13,
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
