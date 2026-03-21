import { TouchableOpacity, View } from 'react-native';

import { colors, Text } from '@/components/ui';

export type SegmentTab = 'defis' | 'avancement';

type SegmentControlProps = {
  activeTab: SegmentTab;
  onChange: (tab: SegmentTab) => void;
};

export function SegmentControl({ activeTab, onChange }: SegmentControlProps) {
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
      {(['defis', 'avancement'] as const).map((tab) => {
        const isActive = activeTab === tab;
        return (
          <TouchableOpacity
            key={tab}
            onPress={() => onChange(tab)}
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
              {tab === 'defis' ? 'Défis' : 'Avancement'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
