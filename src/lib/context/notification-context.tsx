import * as React from 'react';

import { useNotifications } from '@/lib/hooks/use-notifications';

type NotifPrefs = { standupReminder: boolean } | undefined;

type NotificationContextType = {
  isPermissionGranted: boolean;
  notifPrefs: NotifPrefs;
  setStandupReminder: (value: boolean) => Promise<void>;
  sendTestNotification: () => Promise<void>;
};

const NotificationContext = React.createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { isPermissionGranted, notifPrefs, setStandupReminder, sendTestNotification } = useNotifications();

  return (
    <NotificationContext value={{ isPermissionGranted, notifPrefs, setStandupReminder, sendTestNotification }}>
      {children}
    </NotificationContext>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotificationContext(): NotificationContextType {
  const ctx = React.use(NotificationContext);
  if (!ctx)
    throw new Error('useNotificationContext must be used within NotificationProvider');
  return ctx;
}
