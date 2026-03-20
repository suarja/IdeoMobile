/* eslint-disable react-web-api/no-leaked-timeout */
import type { LayoutChangeEvent } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/components/ui';
import { SparkBurst } from '@/features/focus/components/spark-burst';

type Props = {
  progress: number; // 0–1
  height?: number;
  color?: string;
  showSpark?: boolean;
  animateOnMount?: boolean;
};

export function AnimatedProgressBar({ progress, height = 8, color, showSpark = true, animateOnMount = false }: Props) {
  const barColor = color ?? colors.brand.dark;
  const progressAnim = useSharedValue(0);
  const prevProgressRef = useRef<number | null>(null);
  const [emberTrigger, setEmberTrigger] = useState(false);

  const [trackWidth, setTrackWidth] = useState(0);
  const trackWidthShared = useSharedValue(0);

  useEffect(() => {
    const target = progress * 100;
    progressAnim.value = withTiming(target, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });

    const shouldFire = showSpark && (
      animateOnMount
        ? prevProgressRef.current === null
        : prevProgressRef.current !== null && progress > prevProgressRef.current
    );
    prevProgressRef.current = progress;

    if (!shouldFire)
      return undefined;

    const timers = [
      setTimeout(() => setEmberTrigger(true), 0),
      setTimeout(() => setEmberTrigger(false), 220),
      setTimeout(() => setEmberTrigger(true), 280),
      setTimeout(() => setEmberTrigger(false), 500),
      setTimeout(() => setEmberTrigger(true), 620),
      setTimeout(() => setEmberTrigger(false), 1520),
    ];
    return () => timers.forEach(clearTimeout);
  }, [progress, progressAnim, showSpark, animateOnMount]);

  const barStyle = useAnimatedStyle(() => ({
    height,
    width: `${progressAnim.value}%`,
    backgroundColor: barColor,
    borderRadius: 999,
    shadowColor: barColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  }));

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

  return (
    <View
      style={{
        height,
        backgroundColor: 'rgba(67,56,49,0.2)',
        borderRadius: 999,
        overflow: 'visible',
        flex: 1,
      }}
      onLayout={handleTrackLayout}
    >
      <Animated.View style={barStyle} />
      {showSpark && trackWidth > 0 && (
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
  );
}
