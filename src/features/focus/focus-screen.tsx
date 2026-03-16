import type { DailyChallenge, ProjectGoal } from './api';

import { TouchableOpacity } from 'react-native';

import { colors, FocusAwareStatusBar, ScrollView, Text, View } from '@/components/ui';
import {
  localDateString,
  useActiveThreadId,
  useCompleteDailyChallenge,
  useCompleteGoal,
  useDailyChallenges,
  useProjectGoals,
  useProjectScores,
} from './api';
import { LevelHeader } from './components/level-header';
import { RadarChart } from './components/radar-chart';

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

function ChallengeRow({ item, onComplete }: { item: DailyChallenge; onComplete: () => void }) {
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
  // console.log('Daily challenges:', challenges);
  const completeChallenge = useCompleteDailyChallenge();

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
              onComplete={() => {
                if (!item.completed) {
                  completeChallenge({ challengeId: item._id });
                }
              }}
            />
          ))}
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
  return (
    <View className="flex-1" style={{ backgroundColor: colors.brand.bg }}>
      <FocusAwareStatusBar />
      <ScrollView>
        <View className="px-4 pt-16 pb-8">
          <Text className="mb-6 text-2xl font-bold" style={{ color: colors.brand.dark }}>
            Focus
          </Text>
          <LevelHeader />
          <RadarChart scores={scores} />
          <DailyChallengesSection />
          <ProjectGoalsSection />
        </View>
      </ScrollView>
    </View>
  );
}
