import type { ProjectScores } from '../api';

import { View } from 'react-native';

import { colors, Text } from '@/components/ui';

function computeWeightedScore(scores: ProjectScores): number {
  const dims = [scores.validation, scores.design, scores.development, scores.distribution];
  const totalWeight = dims.reduce((acc, d) => acc + d.weight, 0);
  if (totalWeight === 0)
    return 0;
  const weighted = dims.reduce((acc, d) => acc + d.score * d.weight, 0);
  return Math.round(weighted / totalWeight);
}

type ScoreGlobalBannerProps = {
  scores: ProjectScores | undefined | null;
};

export function ScoreGlobalBanner({ scores }: ScoreGlobalBannerProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 16,
        borderRadius: 12,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.brand.border,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.8,
          color: colors.brand.muted,
          textTransform: 'uppercase',
        }}
      >
        Score pondéré
      </Text>
      {scores === undefined || scores === null
        ? (
            <View
              style={{
                width: 80,
                height: 28,
                borderRadius: 6,
                backgroundColor: colors.neutral[200],
                opacity: 0.5,
              }}
            />
          )
        : (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: '800',
                  color: colors.brand.dark,
                  lineHeight: 32,
                }}
              >
                {computeWeightedScore(scores)}
              </Text>
              <Text style={{ fontSize: 14, color: colors.brand.muted, fontWeight: '500' }}>
                {' '}
                / 100
              </Text>
            </View>
          )}
    </View>
  );
}
