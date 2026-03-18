import type { DailyChallenge, ProjectGoal } from './api';

import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { ActivityIndicator, Modal, TouchableOpacity } from 'react-native';

import { colors, FocusAwareStatusBar, ScrollView, Text, View } from '@/components/ui';
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
import { LevelHeader } from './components/level-header';
import { LevelUpModal } from './components/level-up-modal';
import { RadarChart } from './components/radar-chart';
import { SparkBurst } from './components/spark-burst';
import { useLevelUpDetection } from './hooks/use-level-up-detection';

const DIMENSION_COLORS: Record<string, string> = {
  validation: colors.success[500],
  design: colors.primary[600],
  development: colors.charcoal[700],
  distribution: colors.warning[500],
};

function DimensionBadge({ dimension }: { dimension: string }) {
  const bg = DIMENSION_COLORS[dimension] ?? colors.brand.muted;
  const label = dimension.charAt(0).toUpperCase() + dimension.slice(1);
  return (
    <View
      style={{
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        backgroundColor: bg,
      }}
    >
      <Text style={{ fontSize: 10, color: colors.white, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

// eslint-disable-next-line max-lines-per-function -- expanded stylistic layout increases line count
function ChallengeRow({
  item,
  threadId,
  onComplete,
}: {
  item: DailyChallenge;
  threadId: string;
  onComplete: (result: { approved: boolean; message: string }) => void;
}) {
  const [validating, setValidating] = useState(false);
  // Delay spinner so sparks play first (600ms)
  const [showSpinner, setShowSpinner] = useState(false);
  const [sparkTrigger, setSparkTrigger] = useState(false);
  const validate = useValidateAndCompleteDailyChallenge();

  const handlePress = async () => {
    if (item.completed || validating)
      return;
    // Fire-and-forget — never await haptics (may hang if native module not ready)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSparkTrigger(true);
    setTimeout(() => setSparkTrigger(false), 900);
    setValidating(true);
    // Delay spinner so sparks play unobstructed
    const spinnerTimer = setTimeout(() => setShowSpinner(true), 600);
    try {
      const result = await validate({ challengeId: item._id, threadId });
      onComplete(result ?? { approved: false, message: 'Validation failed.' });
    }
    finally {
      clearTimeout(spinnerTimer);
      setValidating(false);
      setShowSpinner(false);
    }
  };

  return (
    <View
      className="mb-3 flex-row items-center rounded-2xl p-4"
      style={{
        backgroundColor: colors.brand.card,
        shadowColor: colors.brand.dark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
      }}
    >
      {/* Checkbox with overflow visible for spark burst */}
      <View style={{ overflow: 'visible', marginRight: 12 }}>
        <TouchableOpacity
          onPress={handlePress}
          disabled={validating || item.completed}
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: colors.brand.dark,
            backgroundColor: item.completed ? colors.brand.dark : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {showSpinner
            ? <ActivityIndicator size="small" color={colors.brand.dark} />
            : item.completed
              ? <Text style={{ fontSize: 13, color: colors.white }}>✓</Text>
              : null}
        </TouchableOpacity>
        <SparkBurst
          trigger={sparkTrigger}
          color={colors.primary[500]}
          count={8}
          size={6}
          radius={30}
        />
      </View>
      <View className="flex-1">
        <Text
          style={{
            fontSize: 15,
            fontWeight: '600',
            color: item.completed ? colors.brand.muted : colors.brand.dark,
            textDecorationLine: item.completed ? 'line-through' : 'none',
          }}
        >
          {item.label}
        </Text>
        {item.dimension && (
          <View className="mt-1 flex-row items-center">
            <DimensionBadge dimension={item.dimension} />
          </View>
        )}
      </View>
      <View
        className="ml-3 rounded-full px-3 py-1"
        style={{
          backgroundColor: colors.brand.card,
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.05)',
          shadowColor: colors.brand.dark,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 2,
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: '800', color: colors.brand.dark }}>
          +
          {item.points}
          {' '}
          pts
        </Text>
      </View>
    </View>
  );
}

function DailyChallengesSection() {
  const challenges = useDailyChallenges(localDateString());
  const threadId = useActiveThreadId();
  const [rejectionMessage, setRejectionMessage] = useState<string | null>(null);

  const completedCount = challenges?.filter(c => c.completed).length ?? 0;
  const totalCount = challenges?.length ?? 0;

  return (
    <View className="mb-6">
      <View className="mb-3 flex-row items-center justify-between">
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.brand.dark, letterSpacing: -0.5 }}>
          Daily challenges
        </Text>
        {completedCount < totalCount && totalCount > 0 && (
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 2,
              backgroundColor: colors.brand.dark,
              borderRadius: 12,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.white }}>
              {completedCount}
              /
              {totalCount}
            </Text>
          </View>
        )}
      </View>
      {!challenges || challenges.length === 0
        ? (
            <Text className="text-sm" style={{ color: colors.brand.muted }}>
              No challenges today — check back later.
            </Text>
          )
        : challenges.map(item => (
            <ChallengeRow
              key={item._id}
              item={item}
              threadId={threadId ?? ''}
              onComplete={(result) => {
                if (!result.approved)
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
              borderRadius: 16,
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
      className="mb-3 flex-row items-center rounded-2xl p-4"
      style={{
        backgroundColor: colors.brand.card,
        shadowColor: colors.brand.dark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
      }}
    >
      <TouchableOpacity
        onPress={onComplete}
        style={{
          marginRight: 12,
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: colors.brand.dark,
          backgroundColor: item.completed ? colors.brand.dark : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {item.completed && (
          <Text style={{ fontSize: 13, color: colors.white }}>✓</Text>
        )}
      </TouchableOpacity>
      <View className="flex-1">
        <Text
          style={{
            fontSize: 15,
            fontWeight: '600',
            color: item.completed ? colors.brand.muted : colors.brand.dark,
            textDecorationLine: item.completed ? 'line-through' : 'none',
          }}
        >
          {item.title}
        </Text>
        {item.dimension && (
          <View className="mt-1 flex-row items-center">
            <DimensionBadge dimension={item.dimension} />
          </View>
        )}
      </View>
      <Text style={{ fontSize: 18, marginRight: 8 }}>{isAgent ? '🤖' : '👤'}</Text>
      <View
        className="rounded-full px-3 py-1"
        style={{
          backgroundColor: colors.brand.card,
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.05)',
          shadowColor: colors.brand.dark,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 2,
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: '800', color: colors.brand.dark }}>
          +
          {item.points}
          {' '}
          pts
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
      <Text className="mb-3" style={{ fontSize: 20, fontWeight: '800', color: colors.brand.dark, letterSpacing: -0.5 }}>
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
  const scores = useProjectScores(threadId ?? null);
  const stats = useUserStats();
  const { showModal, levelUpData, dismiss } = useLevelUpDetection(stats);
  const [showStreakModal, setShowStreakModal] = useState(false);

  return (
    <View className="flex-1" style={{ backgroundColor: colors.brand.bg }}>
      <FocusAwareStatusBar />
      <ScrollView>
        <View className="px-4 pt-16 pb-8">
          <Text className="mb-6 text-2xl font-bold" style={{ color: colors.brand.dark }}>
            Focus
          </Text>
          <LevelHeader stats={stats} onStreakPress={() => setShowStreakModal(true)} />
          <RadarChart scores={scores} />
          <DailyChallengesSection />
          <ProjectGoalsSection />
        </View>
      </ScrollView>
      {levelUpData && (
        <LevelUpModal
          visible={showModal}
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
