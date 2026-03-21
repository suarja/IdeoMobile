import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Rocket } from 'phosphor-react-native';
import { useState } from 'react';
import * as React from 'react';
import { TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors, Text, View } from '@/components/ui';

import { Modal } from '@/components/ui/modal';
import { haptics } from '@/lib/services/haptics';

import { LEVEL_ICON_MAP } from './level-header';
import { SparkBurst } from './spark-burst';

type LevelUpModalProps = {
  modalRef: React.RefObject<BottomSheetModal | null>;
  newLevel: number;
  newLevelName: string;
  newLevelIcon: string;
  onDismiss: () => void;
};

// eslint-disable-next-line max-lines-per-function
export function LevelUpModal({
  modalRef,
  newLevel: _newLevel,
  newLevelName,
  newLevelIcon,
  onDismiss,
}: LevelUpModalProps) {
  const iconScale = useSharedValue(0.5);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(12);
  const [sparkTrigger, setSparkTrigger] = useState(false);

  const handleOpen = () => {
    iconScale.value = withDelay(300, withSpring(1, { damping: 10, stiffness: 160 }));
    setTimeout(() => setSparkTrigger(true), 400);
    setTimeout(() => setSparkTrigger(false), 1200);
    textOpacity.value = withDelay(450, withTiming(1, { duration: 250 }));
    textTranslateY.value = withDelay(450, withTiming(0, { duration: 250 }));
    setTimeout(() => haptics.success(), 300);
  };

  const handleClose = () => {
    iconScale.value = withTiming(0.5, { duration: 200 });
    textOpacity.value = withTiming(0, { duration: 150 });
    textTranslateY.value = withTiming(8, { duration: 150 });
  };

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const LevelIconComponent = LEVEL_ICON_MAP[newLevelIcon] ?? Rocket;

  return (
    <Modal
      ref={modalRef}
      snapPoints={['45%']}
      backgroundStyle={{ backgroundColor: colors.brand.bg }}
      onChange={(index) => {
        if (index >= 0)
          handleOpen();
        else
          handleClose();
      }}
      onDismiss={onDismiss}
    >
      <View style={{ alignItems: 'center', paddingHorizontal: 32, paddingVertical: 24 }}>
        {/* Icon with spark burst */}
        <View style={{ overflow: 'visible', marginBottom: 8 }}>
          <Animated.View style={iconStyle}>
            <LevelIconComponent size={60} weight="fill" color={colors.brand.dark} />
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
              lineHeight: 36,
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
      </View>
    </Modal>
  );
}
