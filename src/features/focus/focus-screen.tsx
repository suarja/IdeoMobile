import type { DailyChallenge, ProjectGoal, ProjectScores } from './api';

import type { SegmentTab } from './components/segment-control';
import { useEffect, useRef, useState } from 'react';

import { ActivityIndicator, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, FocusAwareStatusBar, ScrollView, Text, View } from '@/components/ui';
import { useModal } from '@/components/ui/modal';
import { haptics } from '@/lib/services/haptics';
import { DailyStreakModal } from '../idea/components/daily-streak-modal';
import {
  localDateString,
  useActiveThreadId,
  useCompleteGoal,
  useDailyChallenges,
  useProjectGoals,
  useProjectScores,
  useUserStats,
  useValidateAndCompleteDailyChallenge,
} from './api';
import { DimensionBarChart } from './components/dimension-bar-chart';
import { DimensionsTable } from './components/dimensions-table';
import { LevelHeader } from './components/level-header';
import { LevelUpModal } from './components/level-up-modal';
import { SegmentControl } from './components/segment-control';
import { SparkBurst } from './components/spark-burst';
import { useLevelUpDetection } from './hooks/use-level-up-detection';

function DimensionBadge({ dimension }: { dimension: string }) {
  const label = dimension.charAt(0).toUpperCase() + dimension.slice(1);
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: `${colors.brand.border}60`,
        backgroundColor: colors.brand.selected,
        shadowColor: colors.brand.dark,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
      }}
    >
      <Text style={{ fontSize: 10, color: colors.brand.dark, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

const CHALLENGE_COOLDOWN_MS = 30 * 60 * 1000;

function getCooldownProgress(lastValidationAttemptAt?: number): number {
  if (!lastValidationAttemptAt)
    return 0;
  const elapsed = Date.now() - lastValidationAttemptAt;
  return Math.max(0, 1 - elapsed / CHALLENGE_COOLDOWN_MS);
}

function getMinutesRemaining(lastValidationAttemptAt?: number): number {
  if (!lastValidationAttemptAt)
    return 0;
  const remaining = lastValidationAttemptAt + CHALLENGE_COOLDOWN_MS - Date.now();
  return Math.max(0, Math.ceil(remaining / 60000));
}

function CooldownBar({ progress, minutesRemaining }: { progress: number; minutesRemaining: number }) {
  return (
    <View style={styles.cooldownContainer}>
      <View style={styles.cooldownTrack}>
        <View style={[styles.cooldownFill, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={styles.cooldownText}>
        Dans
        {' '}
        {minutesRemaining}
        {' '}
        min tu pourras réessayer
      </Text>
    </View>
  );
}

function CooldownModal({
  visible,
  rejectionMessage,
  minutesRemaining,
  onDismiss,
}: {
  visible: boolean;
  rejectionMessage: string;
  minutesRemaining: number;
  onDismiss: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Pas encore !</Text>
          <Text style={styles.modalBody}>{rejectionMessage}</Text>
          <Text style={styles.modalTimer}>
            Dans
            {' '}
            {minutesRemaining}
            {' '}
            minute
            {minutesRemaining > 1 ? 's' : ''}
            {' '}
            tu pourras réessayer.
          </Text>
          <TouchableOpacity onPress={onDismiss}>
            <Text style={styles.modalDismiss}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function ChallengeRow({
  item,
  threadId,
  onComplete,
}: {
  item: DailyChallenge;
  threadId: string;
  onComplete: (result: { approved: boolean; message: string; cooldownUntil?: number }) => void;
}) {
  const [validating, setValidating] = useState(false);
  const [sparkTrigger, setSparkTrigger] = useState(false);
  const [showCooldownModal, setShowCooldownModal] = useState(false);
  const [, setTick] = useState(0);
  const validate = useValidateAndCompleteDailyChallenge();

  const isInCooldown = !item.completed
    && !!item.lastValidationAttemptAt
    && Date.now() - item.lastValidationAttemptAt < CHALLENGE_COOLDOWN_MS;

  const cooldownProgress = getCooldownProgress(item.lastValidationAttemptAt);
  const minutesRemaining = getMinutesRemaining(item.lastValidationAttemptAt);

  useEffect(() => {
    if (!isInCooldown)
      return;
    const interval = setInterval(() => setTick(t => t + 1), 10_000);
    return () => clearInterval(interval);
  }, [isInCooldown]);

  const handlePress = async () => {
    if (item.completed || validating)
      return;
    if (isInCooldown) {
      setShowCooldownModal(true);
      return;
    }
    haptics.light();
    setSparkTrigger(true);
    setTimeout(() => setSparkTrigger(false), 900);
    setValidating(true);
    try {
      const result = await validate({ challengeId: item._id, threadId });
      onComplete(result ?? { approved: false, message: 'Validation failed.' });
    }
    finally {
      setValidating(false);
    }
  };

  return (
    <>
      <View className="p-3 px-4" style={styles.challengeCard}>
        <View className="flex-row items-center">
          <View style={styles.checkboxWrapper}>
            <TouchableOpacity
              onPress={handlePress}
              disabled={validating || item.completed}
              style={[styles.checkbox, { backgroundColor: item.completed ? colors.brand.dark : 'transparent' }]}
            >
              {validating
                ? <ActivityIndicator size="small" color={colors.brand.dark} style={styles.spinner} />
                : item.completed
                  ? <Text style={{ fontSize: 12, color: colors.brand.bg }}>✓</Text>
                  : null}
            </TouchableOpacity>
            <SparkBurst trigger={sparkTrigger} color={colors.primary[500]} count={8} size={5} radius={24} />
          </View>
          <View className="flex-1">
            <Text
              style={[
                styles.challengeLabel,
                { color: item.completed ? colors.brand.muted : colors.brand.dark, textDecorationLine: item.completed ? 'line-through' : 'none' },
              ]}
            >
              {item.label}
            </Text>
            {item.dimension && !item.completed && (
              <View className="mt-1 flex-row items-center">
                <DimensionBadge dimension={item.dimension} />
              </View>
            )}
          </View>
          <View className="ml-3 px-2.5 py-1" style={styles.pointsBadge}>
            <Text style={styles.pointsText}>
              +
              {item.points}
            </Text>
          </View>
        </View>
        {isInCooldown && <CooldownBar progress={cooldownProgress} minutesRemaining={minutesRemaining} />}
      </View>
      <CooldownModal
        visible={showCooldownModal}
        rejectionMessage={item.lastRejectionMessage ?? 'Continue à travailler sur ce défi.'}
        minutesRemaining={minutesRemaining}
        onDismiss={() => setShowCooldownModal(false)}
      />
    </>
  );
}

function DailyChallengesSection() {
  const challenges = useDailyChallenges(localDateString());
  const threadId = useActiveThreadId();
  const [rejectionMessage, setRejectionMessage] = useState<string | null>(null);
  const hasTriggeredHaptic = useRef(false);

  useEffect(() => {
    if (!hasTriggeredHaptic.current && challenges && challenges.length > 0) {
      hasTriggeredHaptic.current = true;
      haptics.light();
    }
  }, [challenges]);

  return (
    <View className="mb-6">
      <Text className="mb-3" style={{ fontSize: 16, fontWeight: '600', color: colors.brand.dark, letterSpacing: 1.2, textTransform: 'uppercase', textShadowColor: 'rgba(255,255,255,0.65)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 0 }}>
        Daily Challenges
      </Text>
      {(!challenges || challenges.length === 0)
        ? (
            <Text className="text-sm" style={{ color: colors.brand.muted }}>
              No challenges today — check back later.
            </Text>
          )
        : [...challenges].sort((a, b) => Number(a.completed) - Number(b.completed)).map(item => (
            <ChallengeRow
              key={item._id}
              item={item}
              threadId={threadId ?? ''}
              onComplete={(result) => {
                if (!result.approved && !result.cooldownUntil)
                  setRejectionMessage(result.message);
              }}
            />
          ))}
      <Modal visible={!!rejectionMessage} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.45)',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 32,
          }}
        >
          <View
            style={{
              backgroundColor: colors.white,
              borderRadius: 12,
              padding: 24,
              width: '100%',
            }}
          >
            <Text style={{ fontSize: 16, color: colors.brand.dark, marginBottom: 16, lineHeight: 22 }}>
              {rejectionMessage}
            </Text>
            <TouchableOpacity onPress={() => setRejectionMessage(null)}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.brand.dark, textAlign: 'right' }}>
                Got it
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function GoalRow({ item, onComplete }: { item: ProjectGoal; onComplete: () => void }) {
  const isAgent = item.createdBy.startsWith('agent') || item.createdBy === 'system';
  return (
    <View
      className="mb-3 flex-row items-center p-3 px-4"
      style={{
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.brand.border,
        backgroundColor: colors.white,
        shadowColor: colors.brand.dark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <TouchableOpacity
        onPress={onComplete}
        style={{
          marginRight: 12,
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 1.5,
          borderColor: colors.brand.dark,
          backgroundColor: item.completed ? colors.brand.dark : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {item.completed && (
          <Text style={{ fontSize: 12, color: colors.brand.bg }}>✓</Text>
        )}
      </TouchableOpacity>
      <View className="flex-1">
        <Text
          style={{
            fontSize: 14,
            fontWeight: '600',
            color: item.completed ? colors.brand.muted : colors.brand.dark,
            textDecorationLine: item.completed ? 'line-through' : 'none',
          }}
        >
          {item.title}
        </Text>
        {item.dimension && !item.completed && (
          <View className="mt-1 flex-row items-center">
            <DimensionBadge dimension={item.dimension} />
          </View>
        )}
      </View>
      <Text style={{ fontSize: 16, marginRight: 8 }}>{isAgent ? '🤖' : '👤'}</Text>
      <View
        className="px-2.5 py-1"
        style={{
          backgroundColor: colors.brand.dark,
          borderRadius: 6,
          shadowColor: colors.brand.dark,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.15,
          shadowRadius: 2,
          elevation: 2,
        }}
      >
        <Text style={{ fontSize: 11, fontWeight: '800', color: colors.brand.bg }}>
          +
          {item.points}
        </Text>
      </View>
    </View>
  );
}

function ProjectGoalsSection() {
  const threadId = useActiveThreadId();
  const goals = useProjectGoals(threadId ?? null);
  const completeGoal = useCompleteGoal();

  if (!threadId || goals === undefined || goals.length === 0) {
    return null;
  }

  return (
    <View className="mb-6">
      <Text className="mb-3" style={{ fontSize: 16, fontWeight: '600', color: colors.brand.dark, letterSpacing: 1.2, textTransform: 'uppercase', textShadowColor: 'rgba(255,255,255,0.65)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 0 }}>
        Goals
      </Text>
      {goals.map(item => (
        <GoalRow
          key={item._id}
          item={item}
          onComplete={() => {
            if (!item.completed) {
              completeGoal({ goalId: item._id });
            }
          }}
        />
      ))}
    </View>
  );
}

export function FocusScreen() {
  const threadId = useActiveThreadId();
  const scores = useProjectScores(threadId ?? null) as ProjectScores | undefined | null;
  const stats = useUserStats();
  const { showModal, levelUpData, dismiss } = useLevelUpDetection(stats);
  const levelUpModal = useModal();
  const { present: presentLevelUp, dismiss: dismissLevelUp } = levelUpModal;
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [activeTab, setActiveTab] = useState<SegmentTab>('defis');

  useEffect(() => {
    if (showModal)
      presentLevelUp();
    else
      dismissLevelUp();
  }, [showModal, presentLevelUp, dismissLevelUp]);

  return (
    <View className="flex-1" style={{ backgroundColor: colors.brand.bg }}>
      <FocusAwareStatusBar />
      <ScrollView>
        <View className="px-4 pt-16 pb-8">
          <Text className="mb-6 text-2xl font-bold" style={{ color: colors.brand.dark }}>
            Focus
          </Text>
          <LevelHeader stats={stats} onStreakPress={() => setShowStreakModal(true)} />
          {/* ScoreGlobalBanner désactivé temporairement — le score pondéré
              sera réintégré quand la logique de pondération sera finalisée */}
          {/* <ScoreGlobalBanner scores={scores} /> */}
          <View style={{ marginTop: 16 }}>
            <SegmentControl activeTab={activeTab} onChange={setActiveTab} />
          </View>
          {activeTab === 'defis' && (
            <>
              <DailyChallengesSection />
              <ProjectGoalsSection />
            </>
          )}
          {activeTab === 'avancement' && (
            <>
              {/* Barres de progression : score [0–100] et poids relatif de chaque dimension */}
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brand.muted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8, textShadowColor: 'rgba(255,255,255,0.65)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 0 }}>
                Progression par dimension
              </Text>
              <DimensionBarChart scores={scores} />

              {/* Tableau détaillé : score coloré par seuil, poids ×N, dernière activité relative */}
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brand.muted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8, marginTop: 8, textShadowColor: 'rgba(255,255,255,0.65)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 0 }}>
                Détail
              </Text>
              <DimensionsTable scores={scores} />
            </>
          )}
        </View>
      </ScrollView>
      {levelUpData && (
        <LevelUpModal
          modalRef={levelUpModal.ref}
          newLevel={levelUpData.newLevel}
          newLevelName={levelUpData.newLevelName}
          newLevelIcon={levelUpData.newLevelIcon}
          onDismiss={dismiss}
        />
      )}
      <DailyStreakModal
        visible={showStreakModal}
        currentStreak={stats?.currentStreak ?? 0}
        activeDays={stats?.activeDays ?? []}
        onClose={() => setShowStreakModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  challengeCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.brand.border,
    backgroundColor: colors.white,
    shadowColor: colors.brand.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  },
  checkboxWrapper: {
    overflow: 'visible',
    marginRight: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.brand.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    transform: [{ scale: 0.7 }],
  },
  challengeLabel: {
    fontSize: 14,
    fontWeight: '500',
    textShadowColor: 'rgba(180,160,120,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  },
  pointsBadge: {
    backgroundColor: colors.brand.dark,
    borderRadius: 6,
    shadowColor: colors.brand.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  pointsText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brand.bg,
  },
  cooldownContainer: {
    marginTop: 8,
    gap: 4,
  },
  cooldownTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.neutral[200],
    overflow: 'hidden',
  },
  cooldownFill: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary[400],
  },
  cooldownText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: colors.neutral[500],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 24,
    width: '100%',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.brand.dark,
    marginBottom: 4,
  },
  modalBody: {
    fontSize: 14,
    color: colors.brand.dark,
    lineHeight: 20,
  },
  modalTimer: {
    fontSize: 13,
    color: colors.brand.muted,
    fontStyle: 'italic',
  },
  modalDismiss: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand.dark,
    textAlign: 'right',
    marginTop: 8,
  },
});
