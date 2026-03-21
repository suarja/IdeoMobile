import type { TxKeyPath } from '@/lib/i18n';

import { Switch } from 'react-native';
import { colors, Text, View } from '@/components/ui';

type Props = {
  text: TxKeyPath;
  value: boolean;
  onToggle: (value: boolean) => void;
};

export function SettingsToggleItem({ text, value, onToggle }: Props) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3">
      <Text style={{ color: colors.brand.dark }} tx={text} />
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.brand.border, true: colors.primary[400] }}
        thumbColor={colors.brand.bg}
        ios_backgroundColor={colors.brand.border}
      />
    </View>
  );
}
