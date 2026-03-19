import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import * as React from 'react';
import { useCallback } from 'react';
import { View } from 'react-native';

import { colors, Text, TouchableOpacity } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import { translate } from '@/lib/i18n';

type Props = {
  currentStandupTime: string;
  onSave: (time: string) => void;
};

const TIMES = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${h.toString().padStart(2, '0')}:${m}`;
});

export function StandupTimeBottomSheet({ ref, currentStandupTime, onSave }: Props & { ref?: React.RefObject<BottomSheetModal | null> }) {
  const handleSelectTime = (time: string) => {
    onSave(time);
    if (ref && typeof ref === 'object' && ref.current) {
      ref.current.dismiss();
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: string }) => {
      const isSelected = item === currentStandupTime;
      return (
        <TouchableOpacity
          onPress={() => handleSelectTime(item)}
          className="flex-row items-center justify-between border-b p-4"
          style={{
            borderColor: colors.brand.border,
            backgroundColor: isSelected ? colors.brand.selected : 'transparent',
          }}
        >
          <Text className="text-base font-medium" style={{ color: colors.brand.dark }}>
            {item}
          </Text>
          {isSelected && (
            <View className="size-3 rounded-full" style={{ backgroundColor: colors.brand.dark }} />
          )}
        </TouchableOpacity>
      );
    },
    [currentStandupTime, handleSelectTime],
  );

  return (
    <Modal ref={ref} snapPoints={['50%']} backgroundStyle={{ backgroundColor: colors.brand.bg }}>
      <View className="flex-1 px-4 py-2 pb-8">
        <Text className="mb-4 text-center text-lg font-semibold" style={{ color: colors.brand.dark }}>
          {translate('settings.daily_standup_time' as any)}
        </Text>
        <BottomSheetFlatList
          data={TIMES}
          keyExtractor={item => item}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Modal>
  );
}
