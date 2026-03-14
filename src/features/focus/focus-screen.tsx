import { StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors, FocusAwareStatusBar, ScrollView, Text, View } from '@/components/ui';

const MOCK_DATA = {
  streak: 7,
  streakMax: 30,
  progress: 0.6,
  points: 340,
  pointsMax: 500,
};

const MOCK_INTERACTIONS = [
  { id: '1', label: 'Idea refined: MusicApp v2', time: '2h ago' },
  { id: '2', label: 'Blueprint generated', time: 'Yesterday' },
  { id: '3', label: 'Tech stack validated', time: '2 days ago' },
];

type CircularGaugeProps = {
  value: number;
  max: number;
  label: string;
  color: string;
  displayValue: string;
};

function CircularGauge({ value, max, label, color, displayValue }: CircularGaugeProps) {
  const size = 90;
  const radius = 36;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const strokeDashoffset = circumference * (1 - progress);
  const center = size / 2;

  return (
    <View style={styles.gaugeContainer}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(67,56,49,0.12)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${center}, ${center}`}
        />
      </Svg>
      <View style={styles.gaugeInner}>
        <Text style={[styles.gaugeValue, { color }]}>{displayValue}</Text>
      </View>
      <Text style={styles.gaugeLabel}>{label}</Text>
    </View>
  );
}

function GaugeStats() {
  return (
    <View className="mb-6 flex-row justify-around">
      <CircularGauge
        value={MOCK_DATA.streak}
        max={MOCK_DATA.streakMax}
        label="Streak"
        color={colors.primary[600]}
        displayValue={String(MOCK_DATA.streak)}
      />
      <CircularGauge
        value={MOCK_DATA.progress}
        max={1}
        label="Today"
        color={colors.brand.dark}
        displayValue="60%"
      />
      <CircularGauge
        value={MOCK_DATA.points}
        max={MOCK_DATA.pointsMax}
        label="Points"
        color={colors.primary[600]}
        displayValue={String(MOCK_DATA.points)}
      />
    </View>
  );
}

export function FocusScreen() {
  return (
    <View className="flex-1" style={{ backgroundColor: colors.brand.bg }}>
      <FocusAwareStatusBar />
      <ScrollView>
        <View className="px-4 pt-16 pb-8">
          <Text className="mb-6 text-2xl font-bold" style={{ color: colors.brand.dark }}>
            Focus
          </Text>

          <GaugeStats />

          {/* Daily objective */}
          <View
            className="mb-6 rounded-xl p-4"
            style={{ backgroundColor: colors.brand.selected, borderWidth: 1, borderColor: colors.brand.border }}
          >
            <Text
              className="mb-1 text-xs font-semibold tracking-wider uppercase"
              style={{ color: colors.brand.muted }}
            >
              Today's objective
            </Text>
            <Text className="text-base font-medium" style={{ color: colors.brand.dark }}>
              Refine your app's core value proposition
            </Text>
          </View>

          {/* Recent interactions */}
          <Text className="mb-3 text-lg font-semibold" style={{ color: colors.brand.dark }}>
            Recent interactions
          </Text>
          {MOCK_INTERACTIONS.map(item => (
            <View
              key={item.id}
              className="flex-row items-center justify-between border-b py-3"
              style={{ borderColor: colors.brand.border }}
            >
              <Text className="flex-1 pr-4 text-sm" style={{ color: colors.brand.dark }}>
                {item.label}
              </Text>
              <Text className="text-xs" style={{ color: colors.brand.muted }}>
                {item.time}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  gaugeContainer: {
    alignItems: 'center',
    position: 'relative',
    width: 100,
  },
  gaugeInner: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  gaugeLabel: {
    color: colors.brand.muted,
    fontSize: 12,
    marginTop: 4,
  },
  gaugeValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 18,
  },
});
