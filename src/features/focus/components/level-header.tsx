import type { LayoutChangeEvent } from 'react-native';
import type { useUserStats } from '../api';
import { useEffect, useRef, useState } from 'react';

import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors, Text, View } from '@/components/ui';

import { SparkBurst } from './spark-burst';

type LevelHeaderProps = {
  stats: ReturnType<typeof useUserStats>;
};

// eslint-disable-next-line max-lines-per-function -- multi-burst timeouts require setState in effect
export function LevelHeader({ stats }: LevelHeaderProps) {
  const progressAnim = useSharedValue(0);
  const prevProgressRef = useRef<number | null>(null);
  const [emberTrigger, setEmberTrigger] = useState(false);

  // Track width as both React state (for conditional render) and shared value (for animation)
  const [trackWidth, setTrackWidth] = useState(0);
  const trackWidthShared = useSharedValue(0);

  const progressToNextLevel = stats?.progressToNextLevel ?? 0;

  useEffect(() => {
    const target = progressToNextLevel * 100;
    progressAnim.value = withTiming(target, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });

    const shouldFire = prevProgressRef.current !== null && progressToNextLevel > prevProgressRef.current;
    prevProgressRef.current = progressToNextLevel;

    if (!shouldFire)
      return undefined;

    // 3 bursts during the 600ms animation — container follows bar in real-time so each
    // burst fires from the correct position on the leading edge.
    const timers = [

      setTimeout(() => setEmberTrigger(true), 0), // burst 1: start of bar travel
      setTimeout(() => setEmberTrigger(false), 220),

      setTimeout(() => setEmberTrigger(true), 280), // burst 2: mid-journey
      setTimeout(() => setEmberTrigger(false), 500),

      setTimeout(() => setEmberTrigger(true), 620), // burst 3: final position
      setTimeout(() => setEmberTrigger(false), 1520),
    ];
    return () => timers.forEach(clearTimeout);
  }, [progressToNextLevel, progressAnim, setEmberTrigger]);

  const barStyle = useAnimatedStyle(() => ({
    height: 8,
    width: `${progressAnim.value}%`,
    backgroundColor: colors.brand.dark,
    borderRadius: 999,
  }));

  // Spark container follows leading edge of animated bar in real-time
  const emberLeftAnim = useDerivedValue(() =>
    trackWidthShared.value > 0
      ? (progressAnim.value / 100) * trackWidthShared.value - 12
      : -100,
  );

  const emberContainerStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    top: -14,
    left: emberLeftAnim.value,
    width: 28,
    height: 32,
    overflow: 'visible',
  }));

  const handleTrackLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setTrackWidth(w);
    trackWidthShared.value = w;
  };

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
        {/* Track — overflow visible so sparks can escape */}
        <View
          className="flex-1 rounded-full"
          style={{ height: 8, backgroundColor: 'rgba(67,56,49,0.2)', overflow: 'visible' }}
          onLayout={handleTrackLayout}
        >
          <Animated.View style={barStyle} />

          {/* Ember container: follows leading edge of bar in real-time */}
          {trackWidth > 0 && (
            <Animated.View style={emberContainerStyle}>
              <SparkBurst
                trigger={emberTrigger}
                color={colors.primary[500]}
                count={8}
                size={7}
                radius={38}
              />
            </Animated.View>
          )}
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
