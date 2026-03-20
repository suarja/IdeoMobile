import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

import { Text, View } from '@/components/ui';

export function InlineSynthesizing() {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [rotation]);

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.synthRow}>
      <Text style={styles.synthText}>Synthesizing your thoughts…</Text>
      <Animated.View style={[styles.synthSpinner, { transform: [{ rotate }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  synthRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  synthText: {
    color: '#A08060',
    fontSize: 12,
  },
  synthSpinner: {
    borderBottomColor: 'transparent',
    borderColor: '#C4773B',
    borderLeftColor: 'transparent',
    borderRadius: 8,
    borderWidth: 1.5,
    height: 16,
    width: 16,
  },
});
