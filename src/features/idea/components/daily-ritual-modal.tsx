/* eslint-disable max-lines-per-function */
import type { Icon } from 'phosphor-react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Fire,
  Smiley,
  SmileyMeh,
  SmileyNervous,
  SmileySad,
  SmileyWink,
} from 'phosphor-react-native';
import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, Text } from '@/components/ui';
import { AnimatedProgressBar } from '@/components/ui/animated-progress-bar';
import {
  localDateString,
  useDailyChallenges,
  useUserStats,
} from '@/features/focus/api';
import { translate } from '@/lib/i18n';
import { useSaveDailyMood } from '../api';

type Props = {
  visible: boolean;
  onClose: () => void;
  onStartStandup: () => void;
};

const MOODS: { icon: Icon; score: number }[] = [
  { icon: SmileySad, score: 1 },
  { icon: SmileyNervous, score: 2 },
  { icon: SmileyMeh, score: 3 },
  { icon: Smiley, score: 4 },
  { icon: SmileyWink, score: 5 },
];

// Return Mon-Sun of the current week as { dateStr, label, isToday }
function getCurrentWeekDays(): { dateStr: string; label: string; isToday: boolean }[] {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);

  const labels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const todayStr = localDateString();

  return labels.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const yY = d.getFullYear();
    const yM = String(d.getMonth() + 1).padStart(2, '0');
    const yD = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yY}-${yM}-${yD}`;
    return { dateStr, label, isToday: dateStr === todayStr };
  });
}

// Retroactively fill historical days when currentStreak > activeDays.length
function getEffectiveActiveDays(activeDays: string[], currentStreak: number): string[] {
  if (currentStreak <= activeDays.length || activeDays.length === 0)
    return activeDays;

  const effectiveSet = new Set(activeDays);
  const sortedDays = [...activeDays].sort();
  const mostRecent = sortedDays[sortedDays.length - 1];

  if (mostRecent) {
    const d = new Date(mostRecent);
    for (let i = 0; i < currentStreak; i++) {
      const pastDate = new Date(d);
      pastDate.setDate(d.getDate() - i);
      const yY = pastDate.getFullYear();
      const yM = String(pastDate.getMonth() + 1).padStart(2, '0');
      const yD = String(pastDate.getDate()).padStart(2, '0');
      effectiveSet.add(`${yY}-${yM}-${yD}`);
    }
  }

  return Array.from(effectiveSet);
}

export function DailyRitualModal({ visible, onClose, onStartStandup }: Props) {
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const stats = useUserStats();
  const challenges = useDailyChallenges(localDateString());
  const saveDailyMood = useSaveDailyMood();
  const insets = useSafeAreaInsets();

  const weekDays = getCurrentWeekDays();
  const currentStreak = stats?.currentStreak ?? 0;
  const activeDays = (stats as any)?.activeDays ?? [];
  const effectiveActiveDays = getEffectiveActiveDays(activeDays, currentStreak);
  const todayStr = localDateString();

  const saveMoodIfSelected = () => {
    if (selectedMood !== null) {
      saveDailyMood({ moodScore: selectedMood, date: todayStr }).catch(console.error);
    }
  };

  const handleStart = () => {
    saveMoodIfSelected();
    onStartStandup();
  };

  const handleClose = () => {
    saveMoodIfSelected();
    onClose();
  };

  const progressToNextLevel = stats?.progressToNextLevel ?? 0;
  const levelName = stats?.levelName ?? '';
  const levelIcon = stats?.levelIcon ?? '';
  const nextLevelName = stats?.nextLevelName ?? '';
  const nextLevelIcon = stats?.nextLevelIcon ?? '';
  const totalPoints = stats?.totalPoints ?? 0;
  const pointsToNext = stats?.pointsToNextLevel ?? 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{translate('daily_ritual.greeting')}</Text>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeBtn}
            hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          >
            <Ionicons name="close" size={24} color={colors.brand.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Streak section */}
          <View style={styles.section}>
            <View style={styles.streakRow}>
              <Fire weight="fill" size={22} color="#FF8A4C" />
              <Text style={styles.streakCount}>
                {currentStreak}
                -day streak
              </Text>
            </View>

            {/* Week-view */}
            <View style={styles.weekContainer}>
              {weekDays.map((day) => {
                const isActive = effectiveActiveDays.includes(day.dateStr);
                const isPast = day.dateStr < todayStr;
                const isMissed = !isActive && isPast;

                return (
                  <View key={day.dateStr} style={styles.dayCol}>
                    <Text style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}>
                      {day.label}
                    </Text>
                    {isActive
                      ? (
                          <View style={[styles.circle, styles.circleActive]}>
                            <Ionicons name="checkmark" size={14} color={colors.brand.bg} />
                          </View>
                        )
                      : isMissed
                        ? (
                            <View style={[styles.circle, styles.circleMissed]}>
                              <Ionicons name="close" size={14} color={colors.brand.muted} />
                            </View>
                          )
                        : (
                            <View style={[styles.circle, styles.circleFuture, day.isToday && styles.circleToday]} />
                          )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Level + Points section */}
          {stats && (
            <View style={styles.section}>
              <View style={styles.levelBadgeRow}>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelBadgeText}>
                    {levelIcon}
                    {' '}
                    {levelName}
                  </Text>
                </View>
                <Text style={styles.pointsTotal}>
                  {totalPoints.toLocaleString()}
                  {' '}
                  pts
                </Text>
              </View>
              {nextLevelName
                ? (
                    <Text style={styles.pointsNext}>
                      {translate('daily_ritual.points_to_next', { points: pointsToNext.toLocaleString(), icon: nextLevelIcon, name: nextLevelName })}
                    </Text>
                  )
                : null}
              <View style={styles.progressBarWrapper}>
                <AnimatedProgressBar
                  progress={progressToNextLevel}
                  height={10}
                  animateOnMount
                />
              </View>
            </View>
          )}

          {/* Mood section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{translate('daily_ritual.mood_label')}</Text>
            <View style={styles.moodRow}>
              {MOODS.map((mood) => {
                const isSelected = selectedMood === mood.score;
                const MoodIcon = mood.icon;
                return (
                  <TouchableOpacity
                    key={mood.score}
                    onPress={() => setSelectedMood(mood.score)}
                    style={[styles.moodBtn, isSelected && styles.moodBtnSelected]}
                    activeOpacity={0.75}
                  >
                    <MoodIcon
                      weight={isSelected ? 'fill' : 'light'}
                      size={34}
                      color={isSelected ? '#C4773B' : 'rgba(67,56,49,0.45)'}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Daily challenges section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{translate('daily_ritual.challenges_label')}</Text>
            {!challenges || challenges.length === 0
              ? (
                  <Text style={styles.emptyChallenges}>{translate('daily_ritual.challenges_empty')}</Text>
                )
              : challenges.map(challenge => (
                  <View key={challenge._id} style={styles.challengeRow}>
                    <Text style={styles.challengeLabel} numberOfLines={2}>{challenge.label}</Text>
                    <View style={styles.challengeBadge}>
                      <Text style={styles.challengeBadgeText}>
                        +
                        {challenge.points}
                        {' '}
                        pts
                      </Text>
                    </View>
                  </View>
                ))}
          </View>
        </ScrollView>

        {/* CTA */}
        <View style={[styles.ctaContainer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity style={styles.ctaBtn} onPress={handleStart} activeOpacity={0.85}>
            <Text style={styles.ctaText}>{translate('daily_ritual.cta')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FCFAEA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  greeting: {
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    fontSize: 28,
    lineHeight: 38,
    color: '#A08060',
    letterSpacing: -0.5,
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A08060',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  streakCount: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '800',
    color: '#433831',
  },
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCol: {
    alignItems: 'center',
    gap: 6,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#433831',
    opacity: 0.5,
  },
  dayLabelToday: {
    opacity: 1,
    color: '#C4773B',
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActive: {
    backgroundColor: '#ff8a4c',
    borderWidth: 2,
    borderColor: '#ffc8a8',
  },
  circleMissed: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(67,56,49,0.15)',
  },
  circleFuture: {
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  circleToday: {
    borderWidth: 2,
    borderColor: '#C4773B',
  },
  levelBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  levelBadge: {
    backgroundColor: '#433831',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  levelBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FCFAEA',
  },
  pointsTotal: {
    fontSize: 28,
    lineHeight: 38,
    fontWeight: '800',
    color: '#433831',
  },
  pointsNext: {
    fontSize: 12,
    color: '#433831',
    opacity: 0.5,
    marginTop: 4,
  },
  progressBarWrapper: {
    marginTop: 14,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moodBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  moodBtnSelected: {
    borderColor: '#C4773B',
    transform: [{ scale: 1.15 }],
  },
  emptyChallenges: {
    fontSize: 14,
    color: '#433831',
    opacity: 0.4,
    fontStyle: 'italic',
  },
  challengeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  challengeLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#433831',
    lineHeight: 20,
    paddingRight: 12,
  },
  challengeBadge: {
    backgroundColor: '#433831',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  challengeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FCFAEA',
  },
  ctaContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: '#FCFAEA',
  },
  ctaBtn: {
    backgroundColor: '#433831',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaText: {
    color: '#FCFAEA',
    fontSize: 16,
    fontWeight: '700',
  },
});
