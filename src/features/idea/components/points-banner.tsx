import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, Text, View } from '@/components/ui';

type Props = {
  points: number;
  label?: string;
  visible: boolean;
  onDismiss: () => void;
};

export function PointsBanner({ points, label, visible, onDismiss }: Props) {
  const { top } = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible)
      return;

    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -80, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => onDismiss());
    }, 2500);

    return () => clearTimeout(timer);
  }, [visible, translateY, opacity, onDismiss]);

  if (!visible)
    return null;

  return (
    <Animated.View style={[styles.container, { top, transform: [{ translateY }], opacity }]}>
      <View style={styles.inner}>
        <Text style={styles.points}>{`+${points} pts`}</Text>
        {label && <Text style={styles.label}>{label}</Text>}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 100,
  },
  inner: {
    alignItems: 'center',
    backgroundColor: colors.brand.dark,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  points: {
    color: '#C4773B',
    fontSize: 15,
    fontWeight: '700',
  },
  label: {
    color: colors.brand.bg,
    fontSize: 13,
    opacity: 0.8,
  },
});
