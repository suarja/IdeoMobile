import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Modal, TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors, Text, View } from '@/components/ui';

import { SparkBurst } from './spark-burst';

type LevelUpModalProps = {
  visible: boolean;
  newLevel: number;
  newLevelName: string;
  newLevelIcon: string;
  onDismiss: () => void;
};

// eslint-disable-next-line max-lines-per-function
export function LevelUpModal({
  visible,
  newLevel: _newLevel,
  newLevelName,
  newLevelIcon,
  onDismiss,
}: LevelUpModalProps) {
  const overlayOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.85);
  const cardOpacity = useSharedValue(0);
  const iconScale = useSharedValue(0.5);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(12);
  const [sparkTrigger, setSparkTrigger] = useState(false);

  useEffect(() => {
    if (visible) {
      overlayOpacity.value = withTiming(1, { duration: 200 });
      cardScale.value = withDelay(100, withSpring(1, { damping: 14, stiffness: 180 }));
      cardOpacity.value = withDelay(100, withTiming(1, { duration: 200 }));
      iconScale.value = withDelay(300, withSpring(1, { damping: 10, stiffness: 160 }));
      setTimeout(() => setSparkTrigger(true), 400);
      setTimeout(() => setSparkTrigger(false), 1200);
      textOpacity.value = withDelay(450, withTiming(1, { duration: 250 }));
      textTranslateY.value = withDelay(450, withTiming(0, { duration: 250 }));
      setTimeout(() => {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        catch {}
      }, 300);
    }
    else {
      overlayOpacity.value = withTiming(0, { duration: 250 });
      cardScale.value = withTiming(0.9, { duration: 250 });
      cardOpacity.value = withTiming(0, { duration: 250 });
      iconScale.value = withTiming(0.5, { duration: 200 });
      textOpacity.value = withTiming(0, { duration: 150 });
      textTranslateY.value = withTiming(8, { duration: 150 });
    }
  }, [visible, overlayOpacity, cardScale, cardOpacity, iconScale, textOpacity, textTranslateY, setSparkTrigger]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View
        style={[
          {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.55)',
            alignItems: 'center',
            justifyContent: 'center',
          },
          overlayStyle,
        ]}
      >
        {/* Tapping overlay behind card dismisses */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={onDismiss}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        {/* Card — blocks touch propagation */}
        <Animated.View
          style={[
            {
              backgroundColor: colors.brand.bg,
              borderRadius: 24,
              paddingVertical: 40,
              paddingHorizontal: 32,
              marginHorizontal: 32,
              width: '100%',
              maxWidth: 360,
              alignItems: 'center',
              shadowColor: colors.brand.dark,
              shadowOpacity: 0.2,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 8 },
              elevation: 12,
            },
            cardStyle,
          ]}
          onStartShouldSetResponder={() => true}
        >
          {/* Icon with spark burst */}
          <View style={{ overflow: 'visible', marginBottom: 8 }}>
            <Animated.View style={iconStyle}>
              <Text style={{ fontSize: 56 }}>{newLevelIcon}</Text>
            </Animated.View>
            <SparkBurst
              trigger={sparkTrigger}
              color={colors.primary[400]}
              count={8}
              size={4}
              radius={28}
            />
          </View>

          <Animated.View style={[{ alignItems: 'center' }, textStyle]}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: colors.brand.muted,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              Niveau supérieur !
            </Text>
            <Text
              style={{
                fontSize: 26,
                fontWeight: '700',
                color: colors.brand.dark,
                textAlign: 'center',
                marginBottom: 24,
              }}
            >
              {newLevelName}
            </Text>

            <TouchableOpacity
              onPress={onDismiss}
              style={{
                backgroundColor: colors.brand.dark,
                borderRadius: 12,
                paddingVertical: 14,
                paddingHorizontal: 40,
              }}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.brand.bg }}>
                Continuer
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
