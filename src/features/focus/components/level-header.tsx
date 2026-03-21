import type { useUserStats } from '../api';
import { TouchableOpacity } from 'react-native';

import { colors, Text, View } from '@/components/ui';
import { AnimatedProgressBar } from '@/components/ui/animated-progress-bar';

type LevelHeaderProps = {
  stats: ReturnType<typeof useUserStats>;
  onStreakPress?: () => void;
};

function LevelHeaderSkeleton() {
  return (
    <View className="mb-4 rounded-2xl p-4" style={{ backgroundColor: colors.brand.border }}>
      <View className="mb-2 rounded-sm bg-neutral-200" style={{ height: 20, width: 160, opacity: 0.5 }} />
      <View className="mb-3 rounded-sm bg-neutral-200" style={{ height: 8, width: '100%', opacity: 0.5 }} />
    </View>
  );
}

export function LevelHeader({ stats, onStreakPress }: LevelHeaderProps) {
  const progressToNextLevel = stats?.progressToNextLevel ?? 0;

  if (stats === undefined || stats === null) {
    return <LevelHeaderSkeleton />;
  }

  const {
    levelIcon,
    levelName,
    totalPoints,
    pointsToNextLevel,
    currentStreak,
    nextLevelName,
    nextLevelIcon,
  } = stats;

  const progressPercent = Math.round(progressToNextLevel * 100);
  const nextLevelMinPoints = totalPoints + pointsToNextLevel;

  return (
    <View
      className="mb-4 rounded-2xl p-4"
      style={{
        backgroundColor: colors.brand.border,
        gap: 12,
        shadowColor: colors.brand.dark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 5,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
      }}
    >
      {/* Row 1 — Level badge + streak chip aligned */}
      <View className="flex-row items-center justify-between">
        <View
          className="self-start rounded-full px-3 py-1"
          style={{
            backgroundColor: colors.brand.dark,
            shadowColor: colors.brand.dark,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.brand.bg }}>
            {levelIcon}
            {'  '}
            {levelName}
          </Text>
        </View>
        {currentStreak > 0 && (
          <TouchableOpacity
            className="rounded-full px-3 py-1"
            style={{
              backgroundColor: colors.brand.selected,
              shadowColor: colors.brand.dark,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 3,
              elevation: 4,
            }}
            onPress={onStreakPress}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brand.dark }}>
              🔥
              {' '}
              {currentStreak}
              -day streak
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Row 2 — Progress bar + % */}
      <View className="flex-row items-center" style={{ gap: 8 }}>
        <AnimatedProgressBar progress={progressToNextLevel} />
        <Text style={{ fontSize: 12, color: colors.brand.dark, minWidth: 36, textAlign: 'right', fontWeight: '600' }}>
          {progressPercent}
          {' '}
          %
        </Text>
      </View>

      {/* Row 3 — Points subtitle */}
      {pointsToNextLevel > 0 && nextLevelName
        ? (
            <Text style={{ fontSize: 12, color: colors.brand.dark, opacity: 0.7 }}>
              {totalPoints.toLocaleString()}
              {' / '}
              {nextLevelMinPoints.toLocaleString()}
              {' pts pour atteindre '}
              {nextLevelIcon}
              {' '}
              {nextLevelName}
            </Text>
          )
        : (
            <Text style={{ fontSize: 12, color: colors.brand.dark, opacity: 0.7 }}>
              Niveau max atteint 🎉
            </Text>
          )}
    </View>
  );
}
