import { colors, Text, View } from '@/components/ui';

import { useUserStats } from '../api';

export function LevelHeader() {
  const stats = useUserStats();

  if (stats === undefined || stats === null) {
    return (
      <View className="mb-4 rounded-2xl p-4" style={{ backgroundColor: colors.brand.border }}>
        <View
          className="mb-2 rounded-sm bg-neutral-200"
          style={{ height: 20, width: 160, opacity: 0.5 }}
        />
        <View
          className="mb-3 rounded-sm bg-neutral-200"
          style={{ height: 8, width: '100%', opacity: 0.5 }}
        />
      </View>
    );
  }

  const {
    levelIcon,
    levelName,
    totalPoints,
    progressToNextLevel,
    pointsToNextLevel,
    currentStreak,
    nextLevelName,
    nextLevelIcon,
  } = stats;
  const progressPercent = Math.round(progressToNextLevel * 100);
  const nextLevelMinPoints = totalPoints + pointsToNextLevel;

  return (
    <View className="mb-4 rounded-2xl p-4" style={{ backgroundColor: colors.brand.border, gap: 10 }}>
      {/* Row 1 — Level badge + streak chip aligned */}
      <View className="flex-row items-center justify-between">
        <View className="self-start rounded-full px-3 py-1" style={{ backgroundColor: colors.brand.dark }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.brand.bg }}>
            {levelIcon}
            {'  '}
            {levelName}
          </Text>
        </View>
        {currentStreak > 0 && (
          <View className="rounded-full px-3 py-1" style={{ backgroundColor: colors.brand.selected }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.brand.dark }}>
              🔥
              {' '}
              {currentStreak}
              -day streak
            </Text>
          </View>
        )}
      </View>

      {/* Row 2 — Progress bar + % */}
      <View className="flex-row items-center" style={{ gap: 8 }}>
        <View className="flex-1 rounded-full" style={{ height: 8, backgroundColor: 'rgba(67,56,49,0.2)' }}>
          <View
            className="rounded-full"
            style={{
              height: '100%',
              width: `${progressToNextLevel * 100}%`,
              backgroundColor: colors.brand.dark,
            }}
          />
        </View>
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
