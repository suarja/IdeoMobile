import { colors, Text, View } from '@/components/ui';

import { useUserStats } from '../api';

export function LevelHeader() {
  const stats = useUserStats();

  if (stats === undefined || stats === null) {
    return (
      <View className="mb-4 rounded-2xl bg-white p-4">
        <View
          className="mb-2 rounded-sm bg-neutral-200"
          style={{ height: 20, width: 160, opacity: 0.5 }}
        />
        <View
          className="mb-3 rounded-sm bg-neutral-200"
          style={{ height: 8, width: '100%', opacity: 0.5 }}
        />
        <View
          className="rounded-sm bg-neutral-200"
          style={{ height: 24, width: 112, opacity: 0.5 }}
        />
      </View>
    );
  }

  const { levelIcon, levelName, totalPoints, progressToNextLevel, currentStreak } = stats;
  const progressPercent = Math.round(progressToNextLevel * 100);

  return (
    <View className="mb-4 rounded-2xl bg-white p-4">
      {/* Row 1 — Level name + points */}
      <View className="flex-row items-center justify-between">
        <Text
          style={{ fontWeight: 'bold', color: colors.brand.dark, fontSize: 16 }}
        >
          {levelIcon}
          {'  '}
          {levelName}
        </Text>
        <Text style={{ fontSize: 14, color: colors.brand.muted }}>
          {totalPoints.toLocaleString()}
          {' '}
          pts
        </Text>
      </View>

      {/* Row 2 — Progress bar */}
      <View className="mt-2 flex-row items-center" style={{ gap: 8 }}>
        <View className="flex-1 rounded-full" style={{ height: 8, backgroundColor: colors.neutral[200] }}>
          <View
            className="rounded-full"
            style={{
              height: '100%',
              width: `${progressToNextLevel * 100}%`,
              backgroundColor: colors.primary[600],
            }}
          />
        </View>
        <Text style={{ fontSize: 12, color: colors.brand.muted, minWidth: 36, textAlign: 'right' }}>
          {progressPercent}
          {' '}
          %
        </Text>
      </View>

      {/* Row 3 — Streak */}
      {currentStreak > 0 && (
        <View className="mt-3 flex-row">
          <View
            className="self-start rounded-full px-3 py-1"
            style={{ backgroundColor: colors.brand.selected }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.brand.dark }}>
              🔥
              {' '}
              {currentStreak}
              -day streak
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
