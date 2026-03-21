import type { DailyChallenge } from '@/features/focus/api';
import { useCallback, useEffect, useRef } from 'react';
import { Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, Text, View } from '@/components/ui';

const MAX_VISIBLE = 3;
const AUTO_DISMISS_MS = 4000;

const FANOUT = [
  { translateY: 0, scale: 1.0, opacity: 1.0, zIndex: 3 },
  { translateY: 8, scale: 0.97, opacity: 0.88, zIndex: 2 },
  { translateY: 16, scale: 0.94, opacity: 0.76, zIndex: 1 },
];

function DimensionBadge({ dimension }: { dimension: string }) {
  const label = dimension.charAt(0).toUpperCase() + dimension.slice(1);
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: `${colors.brand.border}60`,
        backgroundColor: colors.brand.selected,
      }}
    >
      <Text style={{ fontSize: 10, color: colors.brand.dark, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

type ToastCardProps = {
  challenge: DailyChallenge;
  stackIndex: number; // 0 = front
  onDismiss: (id: string) => void;
};

function ToastCard({ challenge, stackIndex, onDismiss }: ToastCardProps) {
  const animY = useRef(new Animated.Value(-100)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slideOut = useCallback(() => {
    Animated.timing(animY, {
      toValue: -120,
      duration: 280,
      useNativeDriver: true,
    }).start(() => onDismiss(challenge._id as string));
  }, [animY, challenge._id, onDismiss]);

  // Slide in on mount
  useEffect(() => {
    Animated.spring(animY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 120,
      friction: 14,
    }).start();
  }, [animY]);

  // Auto-dismiss only for front card
  useEffect(() => {
    if (stackIndex !== 0)
      return;
    timerRef.current = setTimeout(slideOut, AUTO_DISMISS_MS);
    return () => {
      if (timerRef.current)
        clearTimeout(timerRef.current);
    };
  }, [stackIndex, slideOut]);

  const fanout = FANOUT[stackIndex] ?? FANOUT[MAX_VISIBLE - 1];

  return (
    <Animated.View
      style={[
        styles.card,
        {
          zIndex: fanout.zIndex,
          opacity: fanout.opacity,
          transform: [
            { translateY: Animated.add(animY, new Animated.Value(fanout.translateY)) },
            { scale: fanout.scale },
          ],
        },
      ]}
    >
      <TouchableOpacity
        onPress={stackIndex === 0 ? slideOut : undefined}
        activeOpacity={0.85}
        style={styles.cardInner}
      >
        <Text style={styles.newIcon}>✦</Text>
        <View style={styles.labelContainer}>
          <Text style={styles.label} numberOfLines={2}>{challenge.label}</Text>
          {challenge.dimension && (
            <View style={styles.badgeRow}>
              <DimensionBadge dimension={challenge.dimension} />
            </View>
          )}
        </View>
        <View style={styles.pointsBadge}>
          <Text style={styles.pointsText}>
            +
            {challenge.points}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

type Props = {
  toasts: DailyChallenge[];
  onDismiss: (id: string) => void;
};

export function ChallengeToastStack({ toasts, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  const visible = toasts.slice(0, MAX_VISIBLE);

  if (visible.length === 0)
    return null;

  return (
    <View
      style={[
        styles.container,
        { top: insets.top + 8 },
      ]}
      pointerEvents="box-none"
    >
      {/* Render in reverse so front card (index 0) paints last / on top */}
      {[...visible].reverse().map((challenge, reverseIdx) => {
        const stackIndex = visible.length - 1 - reverseIdx;
        return (
          <ToastCard
            key={challenge._id as string}
            challenge={challenge}
            stackIndex={stackIndex}
            onDismiss={onDismiss}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  card: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${colors.brand.dark}26`,
    backgroundColor: colors.brand.bg,
    shadowColor: colors.brand.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 6,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  newIcon: {
    fontSize: 14,
    color: colors.primary[500],
    fontWeight: '700',
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brand.dark,
    lineHeight: 18,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  pointsBadge: {
    backgroundColor: colors.brand.dark,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pointsText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brand.bg,
  },
});
