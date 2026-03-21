/* eslint-disable max-lines-per-function, style/multiline-ternary, react-hooks/set-state-in-effect, react-hooks-extra/no-direct-set-state-in-use-effect, react/no-array-index-key, react-web-api/no-leaked-timeout */
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { colors, Text } from '@/components/ui';
import { Modal, useModal } from '@/components/ui/modal';
import { haptics } from '@/lib/services/haptics';

type DailyStreakModalProps = {
  visible: boolean;
  currentStreak: number;
  activeDays: string[];
  onClose: () => void;
};

// Return array of YYYY-MM-DD for Mon-Sun of the current week based on local time
function getCurrentWeekDays(): { dateStr: string; label: string; isToday: boolean }[] {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);

  const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const weekDays = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);

    const yY = d.getFullYear();
    const yM = String(d.getMonth() + 1).padStart(2, '0');
    const yD = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yY}-${yM}-${yD}`;

    weekDays.push({
      dateStr,
      label: days[i],
      isToday: dateStr === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    });
  }

  return weekDays;
}

function getMonthDays(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);
  const startDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // 0=Mon ... 6=Sun

  const lastDay = new Date(year, month + 1, 0);
  const numDays = lastDay.getDate();

  const days = [];
  const todayStr = new Date().toISOString().split('T')[0];

  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null);
  }

  for (let i = 1; i <= numDays; i++) {
    const d = new Date(year, month, i);
    const yY = d.getFullYear();
    const yM = String(d.getMonth() + 1).padStart(2, '0');
    const yD = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yY}-${yM}-${yD}`;
    days.push({
      dateStr,
      dayNum: i,
      isToday: dateStr === todayStr,
    });
  }

  return days;
}

// Helper to retroactively fill historical days if currentStreak > activeDays.length
// This handles users who already had a streak before the activeDays feature was added
function getEffectiveActiveDays(activeDays: string[], currentStreak: number): string[] {
  if (currentStreak <= activeDays.length || activeDays.length === 0) {
    return activeDays;
  }

  const effectiveSet = new Set(activeDays);

  // Start from the most recent active day (usually today)
  const sortedDays = [...activeDays].sort();
  const mostRecent = sortedDays[sortedDays.length - 1];

  if (mostRecent) {
    const d = new Date(mostRecent);
    // Fill backwards for `currentStreak` days
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

export function DailyStreakModal({ visible, currentStreak, activeDays, onClose }: DailyStreakModalProps) {
  const { ref, present, dismiss } = useModal();
  const [weekDays] = useState(getCurrentWeekDays);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  useEffect(() => {
    if (visible) {
      haptics.success();
      setTimeout(() => present(), 100);
      setViewMode('week');
      setCurrentMonthDate(new Date());
    }
    else {
      dismiss();
    }
  }, [visible, present, dismiss]);

  const handleClose = () => {
    dismiss();
    onClose();
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthLabel = `${monthNames[currentMonthDate.getMonth()]} ${currentMonthDate.getFullYear()}`;
  const monthDays = getMonthDays(currentMonthDate);

  // Apply retroactive fix for migrated streaks
  const effectiveActiveDays = getEffectiveActiveDays(activeDays, currentStreak);

  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1));
  };

  return (
    <Modal
      ref={ref}
      snapPoints={['75%']}
      backgroundStyle={{ backgroundColor: colors.brand.bg }}
      onDismiss={onClose}
    >
      <View style={{ flex: 1 }}>
        <TouchableOpacity
          style={styles.toggleBtn}
          onPress={() => setViewMode(v => v === 'week' ? 'month' : 'week')}
          activeOpacity={0.7}
        >
          <Ionicons name={viewMode === 'week' ? 'calendar-outline' : 'list-outline'} size={24} color={colors.brand.dark} />
        </TouchableOpacity>

        <BottomSheetScrollView contentContainerStyle={styles.content}>
          {/* Header Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="checkmark" size={32} color={colors.brand.bg} />
          </View>

          {/* Text */}
          <Text style={styles.title}>
            {currentStreak}
            {' '}
            Day Streak
          </Text>
          <Text style={styles.subtitle}>Practice each day so your streak won't reset!</Text>

          {/* Week / Month View Toggle */}
          {viewMode === 'week' ? (
            <View style={styles.weekContainer}>
              {weekDays.map((day) => {
                const isActive = effectiveActiveDays.includes(day.dateStr);
                // It missed it if it's not today, not active, and in the past
                const todayStr = weekDays.find(d => d.isToday)?.dateStr ?? '';
                const isPast = day.dateStr < todayStr;
                const isMissed = !isActive && isPast;

                return (
                  <View key={day.dateStr} style={styles.dayCol}>
                    <Text style={styles.dayLabel}>{day.label}</Text>

                    {isActive
                      ? (
                          <View style={[styles.circle, styles.circleActive]}>
                            <Ionicons name="checkmark" size={16} color={colors.brand.bg} />
                          </View>
                        )
                      : isMissed
                        ? (
                            <View style={[styles.circle, styles.circleMissed]}>
                              <Ionicons name="close" size={16} color={colors.brand.muted} />
                            </View>
                          )
                        : (
                            <View style={[styles.circle, styles.circleFuture]} />
                          )}
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.monthContainer}>
              <View style={styles.monthHeader}>
                <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn}>
                  <Ionicons name="chevron-back" size={20} color={colors.brand.dark} />
                </TouchableOpacity>
                <Text style={styles.monthTitle}>{monthLabel}</Text>
                <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
                  <Ionicons name="chevron-forward" size={20} color={colors.brand.dark} />
                </TouchableOpacity>
              </View>

              <View style={styles.monthDaysHeader}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((dl, i) => (
                  <Text key={i} style={styles.monthDayChar}>{dl}</Text>
                ))}
              </View>

              <View style={styles.monthGrid}>
                {monthDays.map((day, idx) => {
                  if (!day)
                    return <View key={`empty-${idx}`} style={styles.monthCell} />;

                  const isActive = effectiveActiveDays.includes(day.dateStr);
                  const todayStr = new Date().toISOString().split('T')[0];
                  const isPast = day.dateStr < todayStr;
                  const isMissed = !isActive && isPast;

                  return (
                    <View key={day.dateStr} style={styles.monthCell}>
                      {isActive
                        ? (
                            <View style={[styles.circle, styles.circleActive, styles.monthCircleSmall]}>
                              <Ionicons name="checkmark" size={14} color={colors.brand.bg} />
                            </View>
                          )
                        : isMissed
                          ? (
                              <View style={[styles.circle, styles.circleMissed, styles.monthCircleSmall]}>
                                <Text style={styles.monthDayNumMuted}>{day.dayNum}</Text>
                              </View>
                            )
                          : (
                              <View style={[styles.circle, styles.circleFuture, styles.monthCircleSmall]}>
                                <Text style={styles.monthDayNumFuture}>{day.dayNum}</Text>
                              </View>
                            )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Button */}
          <TouchableOpacity style={styles.continueBtn} onPress={handleClose} activeOpacity={0.8}>
            <Text style={styles.continueText}>Continue</Text>
          </TouchableOpacity>
        </BottomSheetScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingBottom: 32,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  iconContainer: {
    alignItems: 'center',
    backgroundColor: '#ff8a4c', // specific bright orange from image
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    marginBottom: 16,
    width: 60,
    borderWidth: 4,
    borderColor: '#ffc8a8', // light orange ring
  },
  title: {
    color: colors.brand.dark,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: colors.brand.muted,
    fontSize: 14,
    marginBottom: 32,
    textAlign: 'center',
  },
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 40,
  },
  dayCol: {
    alignItems: 'center',
    gap: 8,
  },
  dayLabel: {
    color: colors.brand.dark,
    fontSize: 13,
    fontWeight: '600',
  },
  circle: {
    alignItems: 'center',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  circleActive: {
    backgroundColor: '#ff8a4c',
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#ffc8a8',
  },
  circleMissed: {
    backgroundColor: 'transparent',
  },
  circleFuture: {
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  continueBtn: {
    alignItems: 'center',
    backgroundColor: '#ff8a4c',
    borderRadius: 12,
    paddingVertical: 16,
    width: '100%',
  },
  continueText: {
    color: colors.brand.bg,
    fontSize: 16,
    fontWeight: '700',
  },
  toggleBtn: {
    padding: 8,
    position: 'absolute',
    right: 16,
    top: 4,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 20,
  },
  monthContainer: {
    width: '100%',
    marginBottom: 40,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  monthTitle: {
    color: colors.brand.dark,
    fontSize: 18,
    fontWeight: '700',
  },
  navBtn: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 8,
  },
  monthDaysHeader: {
    flexDirection: 'row',
    width: '100%',
  },
  monthDayChar: {
    width: '14.28%',
    textAlign: 'center',
    color: colors.brand.muted,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  monthCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  monthCircleSmall: {
    width: '100%',
    height: '100%',
    borderRadius: 100, // Make it a circle relative to width/height
  },
  monthDayNumMuted: {
    color: colors.brand.muted,
    textDecorationLine: 'line-through',
    fontSize: 13,
  },
  monthDayNumFuture: {
    color: colors.brand.dark,
    opacity: 0.5,
    fontSize: 13,
  },
});
