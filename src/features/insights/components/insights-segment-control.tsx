import { TouchableOpacity, View } from 'react-native';
import { colors, Text } from '@/components/ui';
import { translate } from '@/lib/i18n';
import { haptics } from '@/lib/services/haptics';

export type InsightsTab = 'validation' | 'suivi';

type InsightsSegmentControlProps = {
  activeTab: InsightsTab;
  onChange: (tab: InsightsTab) => void;
};

export function InsightsSegmentControl({ activeTab, onChange }: InsightsSegmentControlProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.brand.border,
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
      }}
    >
      {(['validation', 'suivi'] as const).map((tab) => {
        const isActive = activeTab === tab;
        const label = tab === 'validation'
          ? translate('insights.segment_validation' as any)
          : translate('insights.segment_suivi' as any);
        return (
          <TouchableOpacity
            key={tab}
            onPress={() => {
              haptics.selection();
              onChange(tab);
            }}
            style={{
              flex: 1,
              paddingVertical: 8,
              alignItems: 'center',
              borderRadius: 10,
              backgroundColor: isActive ? colors.brand.dark : 'transparent',
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: isActive ? '700' : '500',
                color: isActive ? colors.brand.bg : colors.brand.dark,
                opacity: isActive ? 1 : 0.6,
              }}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
