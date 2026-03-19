import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { storage } from '@/lib/storage';

type UserStats = {
  standupTime?: string;
  hasDailyMood?: boolean;
};

export function useStandupTrigger(userStats: UserStats | undefined | null) {
  const [showStandupSplash, setShowStandupSplash] = useState(false);

  useEffect(() => {
    if (!userStats || userStats.hasDailyMood || !userStats.standupTime) {
      // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks-extra/no-direct-set-state-in-use-effect
      setShowStandupSplash(false);
      return;
    }

    const checkStandup = () => {
      if (!userStats?.standupTime || userStats.hasDailyMood)
        return;

      const today = new Date().toISOString().split('T')[0];
      const lastShown = storage.getString('@ideo_last_standup_splash_date');
      if (lastShown === today)
        return;

      const [targetH, targetM] = userStats.standupTime.split(':').map(Number);
      const now = new Date();
      const currentH = now.getHours();
      const currentM = now.getMinutes();

      if (currentH > targetH || (currentH === targetH && currentM >= targetM)) {
        setShowStandupSplash(true);
        storage.set('@ideo_last_standup_splash_date', today);
      }
    };

    checkStandup();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkStandup();
      }
    });

    return () => subscription.remove();
  }, [userStats?.standupTime, userStats?.hasDailyMood]);

  return { showStandupSplash, setShowStandupSplash };
}
