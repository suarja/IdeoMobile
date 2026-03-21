import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import * as Notifications from 'expo-notifications';
import { useEffect, useMemo, useState } from 'react';
import { useUserStats } from '@/features/focus/api';
import { api } from '../../../convex/_generated/api';

function parseDailyStandupTime(dailyStandupTime: string | null) {
  if (!dailyStandupTime)
    return null;
  const [hourStr, minuteStr] = dailyStandupTime.split(':');
  const hour = Number.parseInt(hourStr, 10);
  const minute = Number.parseInt(minuteStr, 10);
  if (Number.isNaN(hour) || Number.isNaN(minute))
    return null;
  return { hour, minute };
}

export function useNotifications() {
  const { isAuthenticated } = useConvexAuth();
  const userStats = useUserStats();
  const userProfile = useQuery(api.userProfiles.getUserProfile, isAuthenticated ? {} : 'skip');
  const setNotifPrefsMutation = useMutation(api.userProfiles.setNotificationPreferences);
  const setPushTokenMutation = useMutation(api.userProfiles.setPushToken);

  const [isPermissionGranted, setIsPermissionGranted] = useState(false);

  const notifPrefs = userProfile?.notificationPreferences;
  const standupEnabled = notifPrefs?.standupReminder ?? true;

  const dailyStandupTime = useMemo(() => {
    if (!userStats)
      return null;
    return parseDailyStandupTime(userStats.standupTime ?? null);
  }, [userStats]);

  // Effect 1: request permissions + configure handler
  useEffect(() => {
    const configureNotificationsAsync = async () => {
      const { granted } = await Notifications.requestPermissionsAsync();
      if (!granted) {
        console.warn('⚠️ Notification Permissions not granted!');
        return;
      }
      setIsPermissionGranted(true);
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldShowAlert: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    };
    configureNotificationsAsync();
  }, []);

  // Effect 2: save device push token once permission + auth are ready
  useEffect(() => {
    if (!isPermissionGranted || !isAuthenticated)
      return;
    const savePushToken = async () => {
      try {
        const tokenData = await Notifications.getDevicePushTokenAsync();
        await setPushTokenMutation({ token: tokenData.data });
      }
      catch {
        // Silently fail — only available on physical devices, not in Expo Go/simulator
      }
    };
    savePushToken();
  }, [isPermissionGranted, isAuthenticated, setPushTokenMutation]);

  // Effect 3: (re)schedule or cancel daily standup based on prefs
  useEffect(() => {
    if (!isPermissionGranted)
      return;
    const scheduleAsync = async () => {
      await Notifications.cancelAllScheduledNotificationsAsync();
      if (!standupEnabled)
        return;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Daily Standup Reminder',
          body: 'Time for your daily standup! Let\'s crush those goals today! 🚀',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: dailyStandupTime?.hour ?? 9,
          minute: dailyStandupTime?.minute ?? 0,
        },
      });
    };
    scheduleAsync();
  }, [isPermissionGranted, standupEnabled, dailyStandupTime?.hour, dailyStandupTime?.minute]);

  const sendTestNotification = async (): Promise<void> => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Daily Standup Reminder',
        body: 'Time for your daily standup! Let\'s crush those goals today! 🚀',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
      },
    });
  };

  const setStandupReminder = async (value: boolean): Promise<void> => {
    await setNotifPrefsMutation({ standupReminder: value });
  };

  return { isPermissionGranted, notifPrefs, setStandupReminder, sendTestNotification };
}
