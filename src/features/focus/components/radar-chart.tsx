import type { FunctionReturnType } from 'convex/server';
import type { api } from '../../../../convex/_generated/api';
import * as React from 'react';
import { Dimensions, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  Pattern,
  Polygon,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import { colors } from '@/components/ui';

type Props = {
  scores: FunctionReturnType<typeof api.gamification.getProjectScores> | undefined;
};

const screenWidth = Dimensions.get('window').width;
const SVG_WIDTH = screenWidth;
const CX = SVG_WIDTH / 2;
const CY = 140;
const MAX_RADIUS = 100;

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

// eslint-disable-next-line max-lines-per-function
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
    <View className="my-6 w-full items-center justify-center">
      <Svg width={SVG_WIDTH} height={280}>
        <Defs>
          <Pattern
            id="dotPattern"
            x="0"
            y="0"
            width="14"
            height="14"
            patternUnits="userSpaceOnUse"
          >
            <Circle cx="1" cy="1" r="0.6" fill="#C8BEA040" />
          </Pattern>
        </Defs>

        {/* Full area dotted background */}
        <Rect x="0" y="0" width={SVG_WIDTH} height={280} fill="url(#dotPattern)" />

        {/* Grid polygons with subtle shadow (added 100% path) */}
        <G>
          {[0.25, 0.5, 0.75, 1.0].map(fraction => (
            <Polygon
              key={`shadow-${fraction}`}
              points={getGridPolygonPoints(fraction)}
              fill="none"
              stroke="rgba(0, 0, 0, 0.05)"
              strokeWidth={1.5}
              transform="translate(1, 1)"
            />
          ))}
          {[0.25, 0.5, 0.75, 1.0].map(fraction => (
            <Polygon
              key={fraction}
              points={getGridPolygonPoints(fraction)}
              fill="none"
              stroke="#C8BEA0"
              strokeWidth={1.5}
            />
          ))}
        </G>

        {/* Axes with subtle shadow */}
        {AXES.map(({ key, angle }) => {
          const tip = getAxisPoint(angle, MAX_RADIUS);
          return (
            <G key={`axes-${key}`}>
              <Line
                x1={CX + 1}
                y1={CY + 1}
                x2={tip.x + 1}
                y2={tip.y + 1}
                stroke="rgba(0, 0, 0, 0.05)"
                strokeWidth={1.5}
              />
              <Line
                x1={CX}
                y1={CY}
                x2={tip.x}
                y2={tip.y}
                stroke="#C8BEA0"
                strokeWidth={1.5}
              />
            </G>
          );
        })}

        {/* Data polygon */}
        {scores && (
          <G>
            <Polygon
              points={dataPolygonPoints}
              fill="rgba(0, 0, 0, 0.05)"
              transform="translate(2, 2)"
            />
            <Polygon
              points={dataPolygonPoints}
              fill="rgba(67, 56, 49, 0.14)"
              stroke="#433831"
              strokeWidth={2}
            />
          </G>
        )}

        {/* Data dots */}
        {scores
          && dataPoints.map((p, i) => (
            <Circle key={AXES[i].key} cx={p.x} cy={p.y} r={4} fill={DIMENSION_COLORS[AXES[i].key] ?? '#433831'} />
          ))}

        {/* Labels (No frames, positioned in expanded SVG) */}
        {AXES.map(({ key, label, angle }) => {
          const labelOffset = MAX_RADIUS + 25;
          const pos = getAxisPoint(angle, labelOffset);
          const scoreVal = scores ? scores[key].score : 0;

          return (
            <G key={key}>
              <SvgText
                x={pos.x}
                y={pos.y - 4}
                textAnchor="middle"
                fill={colors.brand.dark}
                fontSize={10}
                fontWeight="800"
              >
                {label}
              </SvgText>
              <SvgText
                x={pos.x}
                y={pos.y + 8}
                textAnchor="middle"
                fill={DIMENSION_COLORS[key] ?? colors.brand.dark}
                fontSize={11}
                fontWeight="900"
              >
                {scoreVal}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}
