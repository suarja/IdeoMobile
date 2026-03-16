/**
 * SparkBurst — reusable particle burst primitive.
 *
 * Contract: the parent is responsible for resetting `trigger` to `false`
 * after ~800ms so the component can re-fire on the next event.
 *
 * The immediate parent View must have `overflow: 'visible'`.
 */

/* eslint-disable max-lines-per-function */
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/components/ui';

type SparkBurstProps = {
  trigger: boolean;
  color?: string;
  count?: number;
  size?: number;
  radius?: number;
};

const MAX_PARTICLES = 8;
const ANIMATION_DURATION = 700;

export function SparkBurst({
  trigger,
  color = colors.brand.dark,
  count = 6,
  size = 4,
  radius = 20,
}: SparkBurstProps) {
  // Unconditionally declare shared values for MAX_PARTICLES — never in a loop.
  const tx0 = useSharedValue(0);
  const ty0 = useSharedValue(0);
  const op0 = useSharedValue(0);
  const tx1 = useSharedValue(0);
  const ty1 = useSharedValue(0);
  const op1 = useSharedValue(0);
  const tx2 = useSharedValue(0);
  const ty2 = useSharedValue(0);
  const op2 = useSharedValue(0);
  const tx3 = useSharedValue(0);
  const ty3 = useSharedValue(0);
  const op3 = useSharedValue(0);
  const tx4 = useSharedValue(0);
  const ty4 = useSharedValue(0);
  const op4 = useSharedValue(0);
  const tx5 = useSharedValue(0);
  const ty5 = useSharedValue(0);
  const op5 = useSharedValue(0);
  const tx6 = useSharedValue(0);
  const ty6 = useSharedValue(0);
  const op6 = useSharedValue(0);
  const tx7 = useSharedValue(0);
  const ty7 = useSharedValue(0);
  const op7 = useSharedValue(0);

  // Stable refs so useEffect deps stay minimal (shared values are stable objects)
  const txRef = useRef([tx0, tx1, tx2, tx3, tx4, tx5, tx6, tx7]);
  const tyRef = useRef([ty0, ty1, ty2, ty3, ty4, ty5, ty6, ty7]);
  const opRef = useRef([op0, op1, op2, op3, op4, op5, op6, op7]);

  useEffect(() => {
    if (!trigger)
      return;

    const txValues = txRef.current;
    const tyValues = tyRef.current;
    const opValues = opRef.current;
    const clampedCount = Math.min(count, MAX_PARTICLES);

    for (let i = 0; i < clampedCount; i++) {
      // Add random angle jitter so particles scatter unpredictably (rocket exhaust feel)
      const baseAngle = (2 * Math.PI * i) / clampedCount;
      const jitterAngle = baseAngle + (Math.random() - 0.5) * 1.2;
      // Wide distance variance — some particles fly far, some stay close
      const distance = radius * (0.5 + 1.1 * Math.random());
      const targetX = Math.cos(jitterAngle) * distance;
      const targetY = Math.sin(jitterAngle) * distance;
      // Vary duration per particle (600–900ms) so they don't all land at once
      const duration = ANIMATION_DURATION + Math.random() * 300;
      // Vary fade delay per particle (100–300ms)
      const fadeDelay = 100 + Math.random() * 200;

      txValues[i].value = 0;
      tyValues[i].value = 0;
      opValues[i].value = 1;

      txValues[i].value = withTiming(targetX, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
      tyValues[i].value = withTiming(targetY, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
      opValues[i].value = withDelay(fadeDelay, withTiming(0, { duration: 600 }));
    }
  }, [trigger, count, radius]);

  const s0 = useAnimatedStyle(() => ({
    transform: [{ translateX: tx0.value }, { translateY: ty0.value }],
    opacity: op0.value,
  }));
  const s1 = useAnimatedStyle(() => ({
    transform: [{ translateX: tx1.value }, { translateY: ty1.value }],
    opacity: op1.value,
  }));
  const s2 = useAnimatedStyle(() => ({
    transform: [{ translateX: tx2.value }, { translateY: ty2.value }],
    opacity: op2.value,
  }));
  const s3 = useAnimatedStyle(() => ({
    transform: [{ translateX: tx3.value }, { translateY: ty3.value }],
    opacity: op3.value,
  }));
  const s4 = useAnimatedStyle(() => ({
    transform: [{ translateX: tx4.value }, { translateY: ty4.value }],
    opacity: op4.value,
  }));
  const s5 = useAnimatedStyle(() => ({
    transform: [{ translateX: tx5.value }, { translateY: ty5.value }],
    opacity: op5.value,
  }));
  const s6 = useAnimatedStyle(() => ({
    transform: [{ translateX: tx6.value }, { translateY: ty6.value }],
    opacity: op6.value,
  }));
  const s7 = useAnimatedStyle(() => ({
    transform: [{ translateX: tx7.value }, { translateY: ty7.value }],
    opacity: op7.value,
  }));

  const styles = [s0, s1, s2, s3, s4, s5, s6, s7];
  const clampedCount = Math.min(count, MAX_PARTICLES);

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'visible',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {Array.from({ length: clampedCount }).map((_, i) => (
        <Animated.View
          key={`spark-${i}`}
          style={[
            {
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
            },
            styles[i],
          ]}
        />
      ))}
    </View>
  );
}
