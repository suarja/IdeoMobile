import type { Icon } from 'phosphor-react-native';
import type { useUserStats } from '../api';
import { Fire, Hammer, Leaf, Lightbulb, Lightning, Plant, Rocket } from 'phosphor-react-native';
import { TouchableOpacity, View } from 'react-native';

import { colors, Text } from '@/components/ui';
import { AnimatedProgressBar } from '@/components/ui/animated-progress-bar';

type LevelHeaderProps = {
  stats: ReturnType<typeof useUserStats>;
  onStreakPress?: () => void;
};

// Mapping DB emoji → Phosphor icon component
export const LEVEL_ICON_MAP: Record<string, Icon> = {
  '🌱': Plant,
  '💡': Lightbulb,
  '🔨': Hammer,
  '⚡': Lightning,
  '🚀': Rocket,
};

const ENGRAVED_TEXT = {
  color: 'rgba(67,56,49,0.55)',
  textShadowColor: 'rgba(255,255,255,0.7)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 0,
} as const;

function LevelHeaderSkeleton() {
  return (
    <View className="mb-4 rounded-2xl p-4" style={{ backgroundColor: colors.brand.border }}>
      <View className="mb-2 rounded-sm bg-neutral-200" style={{ height: 20, width: 160, opacity: 0.5 }} />
      <View className="mb-3 rounded-sm bg-neutral-200" style={{ height: 8, width: '100%', opacity: 0.5 }} />
    </View>
  );
}

export function LevelBadge({ levelIcon, levelName }: { levelIcon: string; levelName: string }) {
  const LevelIconComponent = LEVEL_ICON_MAP[levelIcon] ?? Leaf;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: colors.brand.dark, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, shadowColor: colors.brand.dark, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 }}>
      <LevelIconComponent size={13} weight="fill" color={colors.brand.bg} />
      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.brand.bg, letterSpacing: 1.2 }}>
        {levelName.toUpperCase()}
      </Text>
    </View>
  );
}

function StreakBadge({ currentStreak, onPress }: { currentStreak: number; onPress?: () => void }) {
  if (currentStreak <= 0)
    return null;
  return (
    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.brand.selected, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, shadowColor: colors.brand.dark, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 }} onPress={onPress} activeOpacity={0.7}>
      <Fire size={13} weight="fill" color="#FF8A4C" />
      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.brand.dark, letterSpacing: 0.8 }}>
        {currentStreak}
        {' '}
        JOURS
      </Text>
    </TouchableOpacity>
  );
}

export function LevelHeader({ stats, onStreakPress }: LevelHeaderProps) {
  const progressToNextLevel = stats?.progressToNextLevel ?? 0;

  if (stats === undefined || stats === null)
    return <LevelHeaderSkeleton />;

  const { levelIcon, levelName, totalPoints, pointsToNextLevel, currentStreak, nextLevelName, nextLevelIcon } = stats;
  const progressPercent = Math.round(progressToNextLevel * 100);
  const nextLevelMinPoints = totalPoints + pointsToNextLevel;
  const NextLevelIconComponent = nextLevelIcon ? (LEVEL_ICON_MAP[nextLevelIcon] ?? null) : null;

  return (
    <View className="mb-4 rounded-2xl p-4" style={{ backgroundColor: colors.brand.border, gap: 12, shadowColor: colors.brand.dark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 5, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' }}>
      {/* Row 1 — Level badge + streak chip */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <LevelBadge levelIcon={levelIcon} levelName={levelName} />
        <StreakBadge currentStreak={currentStreak} onPress={onStreakPress} />
      </View>

      {/* Row 2 — Progress bar + % chip */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <AnimatedProgressBar progress={progressToNextLevel} height={10} animateOnMount />
        <View style={{ backgroundColor: 'rgba(67,56,49,0.1)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, minWidth: 40, alignItems: 'center' }}>
          <Text style={{ fontSize: 11, color: colors.brand.dark, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
            {progressPercent}
            {' '}
            %
          </Text>
        </View>
      </View>

      {/* Row 3 — Points subtitle (engraved) */}
      {pointsToNextLevel > 0 && nextLevelName
        ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 }}>
              <Text style={{ fontSize: 12, ...ENGRAVED_TEXT }}>
                {totalPoints.toLocaleString()}
                {' / '}
                {nextLevelMinPoints.toLocaleString()}
                {' pts pour atteindre'}
              </Text>
              {NextLevelIconComponent && <NextLevelIconComponent size={11} weight="fill" color="rgba(67,56,49,0.55)" />}
              <Text style={{ fontSize: 12, ...ENGRAVED_TEXT }}>{nextLevelName.toUpperCase()}</Text>
            </View>
          )
        : <Text style={{ fontSize: 12, ...ENGRAVED_TEXT }}>NIVEAU MAX ATTEINT</Text>}
    </View>
  );
}
