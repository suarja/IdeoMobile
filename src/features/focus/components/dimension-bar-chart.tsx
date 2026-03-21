import type { ProjectScores } from '../api';

import { View } from 'react-native';

import { colors, Text } from '@/components/ui';

const LABEL_MAP: Record<string, string> = {
  validation: 'Validation',
  design: 'Design',
  development: 'Dev',
  distribution: 'Distribution',
};

const DIMENSIONS = ['validation', 'design', 'development', 'distribution'] as const;

function getBarColor(score: number): string {
  if (score < 40)
    return colors.danger[500];
  if (score < 70)
    return colors.warning[500];
  return colors.success[500];
}

type DimensionBarChartProps = {
  scores: ProjectScores | undefined | null;
};

export function DimensionBarChart({ scores }: DimensionBarChartProps) {
  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.brand.border,
        padding: 16,
        marginBottom: 12,
        gap: 14,
      }}
    >
      {scores === undefined || scores === null
        ? DIMENSIONS.map(key => (
            <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 90, height: 10, borderRadius: 5, backgroundColor: colors.neutral[200], opacity: 0.5 }} />
              <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.neutral[200], opacity: 0.5 }} />
              <View style={{ width: 30, height: 10, borderRadius: 5, backgroundColor: colors.neutral[200], opacity: 0.5 }} />
            </View>
          ))
        : DIMENSIONS.map((key) => {
            const dim = scores[key];
            return (
              <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text
                  style={{
                    width: 90,
                    fontSize: 12,
                    fontWeight: '600',
                    color: colors.brand.dark,
                  }}
                >
                  {LABEL_MAP[key]}
                </Text>
                <View
                  style={{
                    flex: 1,
                    height: 8,
                    borderRadius: 6,
                    backgroundColor: 'rgba(67,56,49,0.15)',
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderTopColor: 'rgba(0,0,0,0.18)',
                    borderLeftColor: 'rgba(0,0,0,0.12)',
                    borderBottomColor: 'rgba(255,255,255,0.22)',
                    borderRightColor: 'rgba(255,255,255,0.16)',
                  }}
                >
                  <View
                    style={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: getBarColor(dim.score),
                      width: `${dim.score}%`,
                    }}
                  />
                </View>
                <Text
                  style={{
                    width: 30,
                    fontSize: 11,
                    fontWeight: '700',
                    color: colors.brand.muted,
                    textAlign: 'right',
                  }}
                >
                  {dim.score}
                  %
                </Text>
                <Text
                  style={{
                    width: 30,
                    fontSize: 11,
                    color: colors.brand.muted,
                    textAlign: 'right',
                  }}
                >
                  ×
                  {dim.weight.toFixed(1)}
                </Text>
              </View>
            );
          })}
    </View>
  );
}
