import type { DailyChallenge, ProjectGoal } from './api';

import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { ActivityIndicator, Modal, TouchableOpacity } from 'react-native';

import { colors, FocusAwareStatusBar, ScrollView, Text, View } from '@/components/ui';
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
    <View className="flex-row items-center border-b py-3" style={{ borderColor: colors.brand.border }}>
      {/* Checkbox with overflow visible for spark burst */}
      <View style={{ overflow: 'visible' }}>
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
      <Text
        className="flex-1 px-3"
        style={{
          color: item.completed ? colors.brand.muted : colors.brand.dark,
          textDecorationLine: item.completed ? 'line-through' : 'none',
        }}
      >
        {item.label}
      </Text>
      {item.dimension && <DimensionBadge dimension={item.dimension} />}
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.brand.muted, marginLeft: 8 }}>
        +
        {item.points}
      </Text>
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
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.brand.dark }}>
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
    <View className="flex-row items-center border-b py-3" style={{ borderColor: colors.brand.border }}>
      <TouchableOpacity
        onPress={onComplete}
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          borderWidth: 1.5,
          borderColor: colors.brand.dark,
          backgroundColor: item.completed ? colors.brand.dark : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {item.completed && (
          <Text style={{ fontSize: 11, color: colors.white }}>✓</Text>
        )}
      </TouchableOpacity>
      <View className="flex-1 px-3">
        <Text
          style={{
            color: item.completed ? colors.brand.muted : colors.brand.dark,
            textDecorationLine: item.completed ? 'line-through' : 'none',
          }}
        >
          {item.title}
        </Text>
        {item.dimension && (
          <Text style={{ fontSize: 11, color: colors.brand.muted, marginTop: 2 }}>
            {item.dimension}
          </Text>
        )}
      </View>
      <Text style={{ fontSize: 16 }}>{isAgent ? '🤖' : '👤'}</Text>
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.brand.muted, marginLeft: 8 }}>
        +
        {item.points}
      </Text>
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
      <Text className="mb-3" style={{ fontSize: 18, fontWeight: '600', color: colors.brand.dark }}>
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

  return (
    <View className="flex-1" style={{ backgroundColor: colors.brand.bg }}>
      <FocusAwareStatusBar />
      <ScrollView>
        <View className="px-4 pt-16 pb-8">
          <Text className="mb-6 text-2xl font-bold" style={{ color: colors.brand.dark }}>
            Focus
          </Text>
          <LevelHeader stats={stats} />
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
    </View>
  );
}
