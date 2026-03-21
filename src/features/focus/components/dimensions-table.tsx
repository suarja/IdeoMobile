import type { ProjectScores } from '../api';

import { View } from 'react-native';

import { colors, Text } from '@/components/ui';

const DIMENSIONS = ['validation', 'design', 'development', 'distribution'] as const;

const LABEL_MAP: Record<string, string> = {
  validation: 'Validation',
  design: 'Design',
  development: 'Dev',
  distribution: 'Distribution',
};

function getBarColor(score: number): string {
  if (score < 40)
    return colors.danger[500];
  if (score < 70)
    return colors.warning[500];
  return colors.success[500];
}

function formatRelativeDate(updatedAt: number | null): string {
  if (!updatedAt)
    return '—';
  const days = Math.floor((Date.now() - updatedAt) / 86_400_000);
  if (days === 0)
    return 'Aujourd\'hui';
  if (days === 1)
    return 'Hier';
  if (days < 7)
    return `Il y a ${days}j`;
  return `Il y a ${Math.floor(days / 7)}sem`;
}

type DimensionsTableProps = {
  scores: ProjectScores | undefined | null;
};

const COL_FLEX = [3, 2, 2, 3] as const;
const HEADERS = ['DIMENSION', 'SCORE', 'POIDS', 'ACTIVITÉ'] as const;

export function DimensionsTable({ scores }: DimensionsTableProps) {
  const relativeDate = scores ? formatRelativeDate(scores.updatedAt) : null;

  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.brand.border,
        overflow: 'hidden',
        marginBottom: 12,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: 12,
          paddingVertical: 8,
          backgroundColor: colors.brand.selected,
        }}
      >
        {HEADERS.map((h, i) => (
          <Text
            key={h}
            style={{
              flex: COL_FLEX[i],
              fontSize: 10,
              fontWeight: '700',
              letterSpacing: 0.5,
              color: '#A08060',
              textAlign: i === 0 ? 'left' : 'right',
              textShadowColor: 'rgba(255,255,255,0.65)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 0,
            }}
          >
            {h}
          </Text>
        ))}
      </View>

      {/* Rows */}
      {scores === undefined || scores === null
        ? DIMENSIONS.map(key => (
            <View
              key={key}
              style={{
                flexDirection: 'row',
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderTopWidth: 1,
                borderTopColor: 'rgba(67,56,49,0.08)',
              }}
            >
              {HEADERS.map((h, i) => (
                <View
                  key={h}
                  style={{
                    flex: COL_FLEX[i],
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: colors.neutral[200],
                    opacity: 0.4,
                    marginRight: i < 3 ? 8 : 0,
                  }}
                />
              ))}
            </View>
          ))
        : DIMENSIONS.map(key => (
            <View
              key={key}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderTopWidth: 1,
                borderTopColor: 'rgba(67,56,49,0.08)',
              }}
            >
              <Text style={{ flex: COL_FLEX[0], fontSize: 12, fontWeight: '600', color: colors.brand.dark }}>
                {LABEL_MAP[key]}
              </Text>
              <Text
                style={{
                  flex: COL_FLEX[1],
                  fontSize: 12,
                  fontWeight: '700',
                  color: getBarColor(scores[key].score),
                  textAlign: 'right',
                }}
              >
                {scores[key].score}
              </Text>
              <Text style={{ flex: COL_FLEX[2], fontSize: 12, color: colors.brand.muted, textAlign: 'right' }}>
                ×
                {scores[key].weight.toFixed(1)}
              </Text>
              <Text style={{ flex: COL_FLEX[3], fontSize: 11, color: colors.brand.muted, textAlign: 'right' }}>
                {relativeDate ?? '—'}
              </Text>
            </View>
          ))}
    </View>
  );
}
