import type { TxKeyPath } from '@/lib/i18n';

import * as React from 'react';
import { colors, Pressable, Text, View } from '@/components/ui';
import { ArrowRight } from '@/components/ui/icons';

type ItemProps = {
  text: TxKeyPath;
  value?: string;
  onPress?: () => void;
  icon?: React.ReactNode;
};

export function SettingsItem({ text, value, icon, onPress }: ItemProps) {
  const isPressable = onPress !== undefined;
  return (
    <Pressable
      onPress={onPress}
      pointerEvents={isPressable ? 'auto' : 'none'}
      className="flex-1 flex-row items-center justify-between px-4 py-3"
    >
      <View className="flex-row items-center">
        {icon && <View className="pr-2">{icon}</View>}
        <Text style={{ color: colors.brand.dark }} tx={text} />
      </View>
      <View className="flex-row items-center">
        <Text style={{ color: colors.brand.muted }}>{value}</Text>
        {isPressable && (
          <View className="pl-2">
            <ArrowRight color={colors.brand.muted} />
          </View>
        )}
      </View>
    </Pressable>
  );
}
