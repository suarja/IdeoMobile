import { StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors, FocusAwareStatusBar, ScrollView, Text, View } from '@/components/ui';

import {
  localDateString,
  useActiveThreadId,
  useCompleteDailyChallenge,
  useCompleteGoal,
  useDailyChallenges,
  useProjectGoals,
  useUserStats,
} from './api';

type CircularGaugeProps = {
  value: number;
  max: number;
  label: string;
  color: string;
  displayValue: string;
};

function CircularGauge({ value, max, label, color, displayValue }: CircularGaugeProps) {
  const size = 90;
  const radius = 36;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / Math.max(max, 1), 1);
  const strokeDashoffset = circumference * (1 - progress);
  const center = size / 2;

  return (
    <View style={styles.gaugeContainer}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(67,56,49,0.12)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${center}, ${center}`}
        />
      </Svg>
      <View style={styles.gaugeInner}>
        <Text style={[styles.gaugeValue, { color }]}>{displayValue}</Text>
      </View>
      <Text style={styles.gaugeLabel}>{label}</Text>
    </View>
  );
}

function GaugeStats() {
  const stats = useUserStats();
  const today = localDateString();
  const challenges = useDailyChallenges(today);

  const streak = stats?.currentStreak ?? 0;
  const streakMax = Math.max(stats?.longestStreak ?? 7, streak, 7);

  const totalChallenges = challenges?.length ?? 0;
  const completedChallenges = challenges?.filter(c => c.completed).length ?? 0;
  const todayFraction = totalChallenges > 0 ? completedChallenges / totalChallenges : 0;

  const totalPoints = stats?.totalPoints ?? 0;
  const nextLevelPoints = totalPoints + (stats?.pointsToNextLevel ?? 500);

  return (
    <View className="mb-4">
      {stats?.levelName && (
        <Text className="mb-4 text-center text-sm font-medium" style={{ color: colors.brand.muted }}>
          {stats.levelIcon}
          {' '}
          {stats.levelName}
        </Text>
      )}
      <View className="flex-row justify-around">
        <CircularGauge
          value={streak}
          max={streakMax}
          label="Streak"
          color={colors.primary[600]}
          displayValue={String(streak)}
        />
        <CircularGauge
          value={todayFraction}
          max={1}
          label="Today"
          color={colors.brand.dark}
          displayValue={`${Math.round(todayFraction * 100)}%`}
        />
        <CircularGauge
          value={totalPoints}
          max={nextLevelPoints}
          label="Points"
          color={colors.primary[600]}
          displayValue={String(totalPoints)}
        />
      </View>
    </View>
  );
}

function DailyChallengesList() {
  const today = localDateString();
  const challenges = useDailyChallenges(today);
  const completeChallenge = useCompleteDailyChallenge();

  if (!challenges || challenges.length === 0) {
    return (
      <Text className="mb-6 text-sm" style={{ color: colors.brand.muted }}>
        No challenges today — check back later.
      </Text>
    );
  }

  return (
    <View className="mb-6">
      <Text className="mb-3 text-lg font-semibold" style={{ color: colors.brand.dark }}>
        Daily challenges
      </Text>
      {challenges.map(item => (
        <TouchableOpacity
          key={item._id}
          onPress={() => {
            if (!item.completed) {
              completeChallenge({ challengeId: item._id });
            }
          }}
          className="flex-row items-center justify-between border-b py-3"
          style={{ borderColor: colors.brand.border }}
        >
          <View className="flex-1 pr-4">
            <Text
              className="text-sm"
              style={{
                color: item.completed ? colors.brand.muted : colors.brand.dark,
                textDecorationLine: item.completed ? 'line-through' : 'none',
              }}
            >
              {item.label}
            </Text>
          </View>
          <Text className="text-xs font-semibold" style={{ color: colors.primary[600] }}>
            +
            {item.points}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ProjectGoalsList() {
  const threadId = useActiveThreadId();
  const goals = useProjectGoals(threadId ?? null);
  const completeGoal = useCompleteGoal();

  if (!threadId || !goals || goals.length === 0) {
    return null;
  }

  return (
    <View className="mb-6">
      <Text className="mb-3 text-lg font-semibold" style={{ color: colors.brand.dark }}>
        Goals
      </Text>
      {goals.map(item => (
        <TouchableOpacity
          key={item._id}
          onPress={() => {
            if (!item.completed) {
              completeGoal({ goalId: item._id });
            }
          }}
          className="flex-row items-center justify-between border-b py-3"
          style={{ borderColor: colors.brand.border }}
        >
          <View className="flex-1 pr-4">
            <Text
              className="text-sm"
              style={{
                color: item.completed ? colors.brand.muted : colors.brand.dark,
                textDecorationLine: item.completed ? 'line-through' : 'none',
              }}
            >
              {item.title}
            </Text>
            {item.dimension && (
              <Text className="mt-0.5 text-xs" style={{ color: colors.brand.muted }}>
                {item.dimension}
              </Text>
            )}
          </View>
          <Text className="text-xs font-semibold" style={{ color: colors.primary[600] }}>
            +
            {item.points}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function FocusScreen() {
  return (
    <View className="flex-1" style={{ backgroundColor: colors.brand.bg }}>
      <FocusAwareStatusBar />
      <ScrollView>
        <View className="px-4 pt-16 pb-8">
          <Text className="mb-6 text-2xl font-bold" style={{ color: colors.brand.dark }}>
            Focus
          </Text>

          <GaugeStats />

          <DailyChallengesList />

          <ProjectGoalsList />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  gaugeContainer: {
    alignItems: 'center',
    position: 'relative',
    width: 100,
  },
  gaugeInner: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  gaugeLabel: {
    color: colors.brand.muted,
    fontSize: 12,
    marginTop: 4,
  },
  gaugeValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 18,
  },
});
