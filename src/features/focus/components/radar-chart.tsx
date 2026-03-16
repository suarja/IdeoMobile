import type { FunctionReturnType } from 'convex/server';
import type { api } from '../../../../convex/_generated/api';
import * as React from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  Line,
  Polygon,
  Text as SvgText,
} from 'react-native-svg';
import { colors } from '@/components/ui';

type Props = {
  scores: FunctionReturnType<typeof api.gamification.getProjectScores> | undefined;
};

const CX = 130;
const CY = 130;
const MAX_RADIUS = 80;

const DIMENSION_COLORS: Record<string, string> = {
  validation: colors.success[500],
  development: colors.charcoal[700],
  distribution: colors.warning[500],
  design: colors.primary[600],
};

const AXES = [
  { key: 'validation', label: 'Validation', angle: -Math.PI / 2 },
  { key: 'development', label: 'Development', angle: 0 },
  { key: 'distribution', label: 'Distribution', angle: Math.PI / 2 },
  { key: 'design', label: 'Design', angle: Math.PI },
] as const;

function getAxisPoint(angle: number, radius: number): { x: number; y: number } {
  return {
    x: CX + radius * Math.cos(angle),
    y: CY + radius * Math.sin(angle),
  };
}

function getGridPolygonPoints(fraction: number): string {
  return AXES.map(({ angle }) => {
    const p = getAxisPoint(angle, MAX_RADIUS * fraction);
    return `${p.x},${p.y}`;
  }).join(' ');
}

export function RadarChart({ scores }: Props) {
  const dataPoints = AXES.map(({ key, angle }) => {
    const score = scores ? scores[key].score : 0;
    const radius = (score / 100) * MAX_RADIUS;
    return getAxisPoint(angle, radius);
  });

  const dataPolygonPoints = dataPoints
    .map(p => `${p.x},${p.y}`)
    .join(' ');

  return (
    <View className="my-4 items-center">
      <Svg width={260} height={260}>
        {/* Grid polygons at 25%, 50%, 75% */}
        {[0.25, 0.5, 0.75].map(fraction => (
          <Polygon
            key={fraction}
            points={getGridPolygonPoints(fraction)}
            fill="none"
            stroke="#C8BEA0"
            strokeWidth={1}
          />
        ))}

        {/* Axes */}
        {AXES.map(({ key, angle }) => {
          const tip = getAxisPoint(angle, MAX_RADIUS);
          return (
            <Line
              key={key}
              x1={CX}
              y1={CY}
              x2={tip.x}
              y2={tip.y}
              stroke="#C8BEA0"
              strokeWidth={1}
            />
          );
        })}

        {/* Data polygon */}
        {scores && (
          <Polygon
            points={dataPolygonPoints}
            fill="rgba(67, 56, 49, 0.14)"
            stroke="#433831"
            strokeWidth={2}
          />
        )}

        {/* Data dots */}
        {scores
          && dataPoints.map((p, i) => (
            <Circle key={AXES[i].key} cx={p.x} cy={p.y} r={4} fill={DIMENSION_COLORS[AXES[i].key] ?? '#433831'} />
          ))}

        {/* Labels */}
        {AXES.map(({ key, label, angle }) => {
          const labelOffset = MAX_RADIUS + 20;
          const pos = getAxisPoint(angle, labelOffset);
          const scoreVal = scores ? scores[key].score : undefined;
          return (
            <React.Fragment key={key}>
              <SvgText
                x={pos.x}
                y={pos.y - 7}
                textAnchor="middle"
                fill="#433831"
                fontSize={10}
              >
                {label}
              </SvgText>
              {scoreVal !== undefined && (
                <SvgText
                  x={pos.x}
                  y={pos.y + 7}
                  textAnchor="middle"
                  fill={DIMENSION_COLORS[key] ?? '#433831'}
                  fontSize={10}
                >
                  {scoreVal}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}
