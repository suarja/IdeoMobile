import type { DailyChallenge } from '../focus/api';

import { useAuth, useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import Env from 'env';
import { useRouter } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import { useState } from 'react';
import { Linking, Share as RNShare } from 'react-native';
import { ChallengeToastStack } from '@/components/challenge-toast-stack';
import {
  colors,
  FocusAwareStatusBar,
  Pressable,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { Github, Rate, Share as ShareIcon, Support, Website } from '@/components/ui/icons';
import { useModal } from '@/components/ui/modal';
import { useNotificationContext } from '@/lib/context/notification-context';
import { translate } from '@/lib/i18n';
import { useUserStats } from '../focus/api';
import { LevelUpModal } from '../focus/components/level-up-modal';
import { NotificationModal } from '../focus/components/notification-modal';
import { DailyRitualModal } from '../idea/components/daily-ritual-modal';
import { PointsBanner } from '../idea/components/points-banner';
import { useAppConfig, useSetStandupTime, useUserProfile } from './api';
import { DevStorageBottomSheet } from './components/dev-storage-bottom-sheet';
import { LanguageItem } from './components/language-item';
import { MemoryItem } from './components/memory-bottom-sheet';
import { ProfileBottomSheet } from './components/profile-bottom-sheet';
import { ProjectsItem } from './components/projects-bottom-sheet';
import { SettingsContainer } from './components/settings-container';
import { SettingsItem } from './components/settings-item';
import { SettingsToggleItem } from './components/settings-toggle-item';
import { StandupTimeBottomSheet } from './components/standup-time-bottom-sheet';
import { UserAvatar } from './components/user-avatar';
import { WhisperModelItem } from './components/whisper-model-item';

function ProfileHeader() {
  const { user } = useUser();
  const displayName
    = user?.firstName || user?.lastName
      ? `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()
      : (user?.primaryEmailAddress?.emailAddress ?? translate('profile.username'));

  return (
    <View className="items-center pt-24 pb-8">
      <View className="mb-3">
        <UserAvatar
          imageUrl={user?.imageUrl}
          firstName={user?.firstName}
          lastName={user?.lastName}
          email={user?.primaryEmailAddress?.emailAddress}
        />
      </View>
      <Text className="text-lg font-semibold" style={{ color: colors.brand.dark }}>
        {displayName}
      </Text>
      <View
        className="mt-1 rounded-full px-3 py-0.5"
        style={{
          backgroundColor: colors.brand.selected,
          borderWidth: 1,
          borderColor: colors.brand.border,
        }}
      >
        <Text className="text-xs font-medium" style={{ color: colors.brand.dark }}>
          {translate('profile.free_plan')}
        </Text>
      </View>
    </View>
  );
}

type SupportSectionProps = {
  iconColor: string;
  appConfig: ReturnType<typeof useAppConfig>;
};

function SupportSection({ iconColor, appConfig }: SupportSectionProps) {
  return (
    <SettingsContainer title="settings.support_us">
      <SettingsItem
        text="settings.share"
        icon={<ShareIcon color={iconColor} />}
        onPress={() => {
          void RNShare.share({ url: appConfig?.shareUrl ?? '', message: 'Check out Ideo!' });
        }}
      />
      <SettingsItem
        text="settings.rate"
        icon={<Rate color={iconColor} />}
        onPress={() => { void StoreReview.requestReview(); }}
      />
      <SettingsItem
        text="settings.support"
        icon={<Support color={iconColor} />}
        onPress={() => { void Linking.openURL(`mailto:${appConfig?.supportEmail ?? ''}`); }}
      />
    </SettingsContainer>
  );
}

type LinksSectionProps = {
  iconColor: string;
  appConfig: ReturnType<typeof useAppConfig>;
};

function LinksSection({ iconColor, appConfig }: LinksSectionProps) {
  return (
    <SettingsContainer title="settings.links">
      <SettingsItem
        text="settings.privacy"
        onPress={() => { void Linking.openURL(appConfig?.privacyUrl ?? ''); }}
      />
      <SettingsItem
        text="settings.terms"
        onPress={() => { void Linking.openURL(appConfig?.termsUrl ?? ''); }}
      />
      <SettingsItem
        text="settings.github"
        icon={<Github color={iconColor} />}
        onPress={() => { void Linking.openURL(appConfig?.githubUrl ?? ''); }}
      />
      <SettingsItem
        text="settings.website"
        icon={<Website color={iconColor} />}
        onPress={() => { void Linking.openURL(appConfig?.websiteUrl ?? ''); }}
      />
    </SettingsContainer>
  );
}

function SectionAgent() {
  return (
    <SettingsContainer title="settings.agent">
      <MemoryItem />
      <ProjectsItem />
    </SettingsContainer>
  );
}

function SectionNotifications({
  standupTime,
  onPressStandupTime,
}: {
  standupTime: string;
  onPressStandupTime: () => void;
}) {
  const { notifPrefs, setStandupReminder } = useNotificationContext();
  const standupEnabled = notifPrefs?.standupReminder ?? true;

  return (
    <SettingsContainer title="settings.notifications">
      <SettingsToggleItem
        text="settings.notification_standup"
        value={standupEnabled}
        onToggle={(value) => { void setStandupReminder(value); }}
      />
      <SettingsItem
        text="settings.daily_standup_time"
        value={standupTime}
        onPress={onPressStandupTime}
      />
    </SettingsContainer>
  );
}

function SectionDeveloper({
  iconColor,
  onOpenStorage,
  onOpenDailyRitual,
  onOpenLevelUp,
  onOpenNotification,
  onShowPointsBanner,
  onShowChallengeToast,
}: {
  iconColor: string;
  onOpenStorage: () => void;
  onOpenDailyRitual: () => void;
  onOpenLevelUp: () => void;
  onOpenNotification: () => void;
  onShowPointsBanner: () => void;
  onShowChallengeToast: () => void;
}) {
  return (
    <SettingsContainer title="settings.developer">
      <SettingsItem
        text="settings.storage_manager"
        icon={<Ionicons name="construct-outline" size={20} color={iconColor} />}
        onPress={onOpenStorage}
      />
      <Pressable
        className="flex-1 flex-row items-center justify-between px-4 py-3"
        onPress={onOpenDailyRitual}
      >
        <View className="flex-row items-center">
          <View className="pr-1.5">
            <Ionicons name="sunny-outline" size={20} color={iconColor} />
          </View>
          <Text style={{ color: colors.brand.dark }}>Daily Ritual Modal</Text>
        </View>
      </Pressable>
      <Pressable
        className="flex-1 flex-row items-center justify-between px-4 py-3"
        onPress={onOpenLevelUp}
      >
        <View className="flex-row items-center">
          <View className="pr-1.5">
            <Ionicons name="trophy-outline" size={20} color={iconColor} />
          </View>
          <Text style={{ color: colors.brand.dark }}>Level Up Modal</Text>
        </View>
      </Pressable>
      <Pressable
        className="flex-1 flex-row items-center justify-between px-4 py-3"
        onPress={onOpenNotification}
      >
        <View className="flex-row items-center">
          <View className="pr-1.5">
            <Ionicons name="notifications-outline" size={20} color={iconColor} />
          </View>
          <Text style={{ color: colors.brand.dark }}>Notification</Text>
        </View>
      </Pressable>
      <Pressable
        className="flex-1 flex-row items-center justify-between px-4 py-3"
        onPress={onShowPointsBanner}
      >
        <View className="flex-row items-center">
          <View className="pr-1.5">
            <Ionicons name="star-outline" size={20} color={iconColor} />
          </View>
          <Text style={{ color: colors.brand.dark }}>Points Banner</Text>
        </View>
      </Pressable>
      <Pressable
        className="flex-1 flex-row items-center justify-between px-4 py-3"
        onPress={onShowChallengeToast}
      >
        <View className="flex-row items-center">
          <View className="pr-1.5">
            <Ionicons name="flash-outline" size={20} color={iconColor} />
          </View>
          <Text style={{ color: colors.brand.dark }}>Challenge Toast</Text>
        </View>
      </Pressable>
    </SettingsContainer>
  );
}

function SectionAbout({ appConfig }: { appConfig: any }) {
  const iconColor = colors.brand.muted;
  return (
    <>
      <SettingsContainer title="settings.about">
        <SettingsItem text="settings.app_name" value={Env.EXPO_PUBLIC_NAME} />
        <SettingsItem text="settings.version" value={Env.EXPO_PUBLIC_VERSION} />
      </SettingsContainer>

      <SupportSection iconColor={iconColor} appConfig={appConfig} />
      <LinksSection iconColor={iconColor} appConfig={appConfig} />
    </>
  );
}

const DEBUG_CHALLENGE: DailyChallenge = {
  _id: 'debug-challenge-1' as unknown as DailyChallenge['_id'],
  label: 'Envoie un message à ton agent pour tester ce défi',
  points: 15,
  completed: false,
  dimension: 'focus',
};

function useDevDebug() {
  const devModal = useModal();
  const levelUpDebugModal = useModal();
  const notificationDebugModal = useModal();
  const [showDailyRitual, setShowDailyRitual] = useState(false);
  const [showPointsBanner, setShowPointsBanner] = useState(false);
  const [challengeToasts, setChallengeToasts] = useState<DailyChallenge[]>([]);
  return { devModal, levelUpDebugModal, notificationDebugModal, showDailyRitual, setShowDailyRitual, showPointsBanner, setShowPointsBanner, challengeToasts, setChallengeToasts };
}

type DevDebug = ReturnType<typeof useDevDebug>;

function DevDebugOverlays({ dev }: { dev: DevDebug }) {
  const router = useRouter();
  return (
    <>
      <DevStorageBottomSheet modalRef={dev.devModal.ref} />
      <DailyRitualModal
        visible={dev.showDailyRitual}
        onClose={() => dev.setShowDailyRitual(false)}
        onStartStandup={() => {
          dev.setShowDailyRitual(false);
          router.push('/(app)');
        }}
      />
      <LevelUpModal
        modalRef={dev.levelUpDebugModal.ref}
        newLevel={3}
        newLevelName="Rocket"
        newLevelIcon="🚀"
        onDismiss={() => dev.levelUpDebugModal.dismiss()}
      />
      <NotificationModal
        modalRef={dev.notificationDebugModal.ref}
        onDismiss={() => dev.notificationDebugModal.dismiss()}
      />
      <PointsBanner
        points={42}
        label="Session terminée"
        visible={dev.showPointsBanner}
        onDismiss={() => dev.setShowPointsBanner(false)}
      />
      <ChallengeToastStack
        toasts={dev.challengeToasts}
        onDismiss={id => dev.setChallengeToasts(prev => prev.filter(c => (c._id as unknown as string) !== id))}
      />
    </>
  );
}

export function SettingsScreen() {
  const { signOut } = useAuth();
  const appConfig = useAppConfig();
  const userProfile = useUserProfile();
  const userStats = useUserStats();
  const setStandupTime = useSetStandupTime();
  const iconColor = colors.brand.muted;

  const profileModal = useModal();
  const standupTimeModal = useModal();
  const dev = useDevDebug();

  const hasProfileLinks = (userProfile?.socialLinks.length ?? 0) > 0 || !!userProfile?.githubToken;

  return (
    <View style={{ flex: 1 }}>
      <FocusAwareStatusBar style="dark" />

      <ScrollView style={{ backgroundColor: colors.brand.bg }}>
        <View className="flex-1 px-4">
          <ProfileHeader />

          <SettingsContainer title="settings.generale">
            <LanguageItem />
          </SettingsContainer>

          <SectionNotifications
            standupTime={userStats?.standupTime || '09:00'}
            onPressStandupTime={() => standupTimeModal.present()}
          />

          <SettingsContainer title="settings.my_profile">
            <SettingsItem
              text="settings.edit_profile"
              value={hasProfileLinks ? translate('settings.configured') : undefined}
              onPress={() => profileModal.present()}
            />
          </SettingsContainer>

          <SettingsContainer title="settings.voice_model">
            <WhisperModelItem />
          </SettingsContainer>

          <SectionAgent />
          <SectionAbout appConfig={appConfig} />

          {__DEV__ && (
            <SectionDeveloper
              iconColor={iconColor}
              onOpenStorage={() => dev.devModal.present()}
              onOpenDailyRitual={() => dev.setShowDailyRitual(true)}
              onOpenLevelUp={() => dev.levelUpDebugModal.present()}
              onOpenNotification={() => dev.notificationDebugModal.present()}
              onShowPointsBanner={() => dev.setShowPointsBanner(true)}
              onShowChallengeToast={() => dev.setChallengeToasts([DEBUG_CHALLENGE])}
            />
          )}

          <View className="my-8">
            <SettingsContainer>
              <SettingsItem text="settings.logout" onPress={() => { void signOut(); }} />
            </SettingsContainer>
          </View>
        </View>
      </ScrollView>

      <ProfileBottomSheet ref={profileModal.ref} />
      <StandupTimeBottomSheet
        ref={standupTimeModal.ref}
        currentStandupTime={userStats?.standupTime || '09:00'}
        onSave={time => setStandupTime({ time })}
      />
      {__DEV__ && <DevDebugOverlays dev={dev} />}
    </View>
  );
}
