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

function DimensionBadge({ dimension }: { dimension: string }) {
  const label = dimension.charAt(0).toUpperCase() + dimension.slice(1);
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: `${colors.brand.border}60`,
        backgroundColor: colors.brand.selected,
      }}
    >
      <Text style={{ fontSize: 10, color: colors.brand.dark, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

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
  const [sparkTrigger, setSparkTrigger] = useState(false);
  const validate = useValidateAndCompleteDailyChallenge();

  const handlePress = async () => {
    if (item.completed || validating)
      return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
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
      <View style={{ overflow: 'visible', marginRight: 12 }}>
        <TouchableOpacity
          onPress={handlePress}
          disabled={validating || item.completed}
          style={{
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
          {validating
            ? <ActivityIndicator size="small" color={colors.brand.dark} style={{ transform: [{ scale: 0.7 }] }} />
            : item.completed
              ? <Text style={{ fontSize: 12, color: colors.brand.bg }}>✓</Text>
              : null}
        </TouchableOpacity>
        <SparkBurst
          trigger={sparkTrigger}
          color={colors.primary[500]}
          count={8}
          size={5}
          radius={24}
        />
      </View>
      <View className="flex-1">
        <Text
          style={{
            fontSize: 14,
            fontWeight: '600',
            color: item.completed ? colors.brand.muted : colors.brand.dark,
            textDecorationLine: item.completed ? 'line-through' : 'none',
          }}
        >
          {item.label}
        </Text>
        {item.dimension && !item.completed && (
          <View className="mt-1 flex-row items-center">
            <DimensionBadge dimension={item.dimension} />
          </View>
        )}
      </View>
      <View
        className="ml-3 px-2.5 py-1"
        style={{
          backgroundColor: colors.brand.dark,
          borderRadius: 12,
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
      {(!challenges || challenges.length === 0)
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
          borderRadius: 12,
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
