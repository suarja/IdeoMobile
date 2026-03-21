import { useAuth, useUser } from '@clerk/expo';

import { Ionicons } from '@expo/vector-icons';
import Env from 'env';
import { useRouter } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import { useState } from 'react';
import { Linking, Share as RNShare } from 'react-native';
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
import { translate } from '@/lib/i18n';
import { useUserStats } from '../focus/api';
import { LevelUpModal } from '../focus/components/level-up-modal';
import { DailyRitualModal } from '../idea/components/daily-ritual-modal';
import { useAppConfig, useSetStandupTime, useUpsertUserProfile, useUserProfile } from './api';
import { DevStorageBottomSheet } from './components/dev-storage-bottom-sheet';
import { EditSocialLinksBottomSheet } from './components/edit-social-links-bottom-sheet';
import { LanguageItem } from './components/language-item';
import { MemoryItem } from './components/memory-bottom-sheet';
import { ProjectsItem } from './components/projects-bottom-sheet';
import { SettingsContainer } from './components/settings-container';
import { SettingsItem } from './components/settings-item';
import { SocialLinkRow } from './components/social-link-row';
import { StandupTimeBottomSheet } from './components/standup-time-bottom-sheet';
import { UserAvatar } from './components/user-avatar';
import { WhisperModelItem } from './components/whisper-model-item';

type Platform = 'github' | 'instagram' | 'tiktok' | 'website';

function buildSocialHandlers(
  selectedPlatform: Platform | null,
  userProfile: ReturnType<typeof useUserProfile>,
  upsertUserProfile: ReturnType<typeof useUpsertUserProfile>,
) {
  const getLinksForPlatform = (platform: Platform) =>
    userProfile?.socialLinks.filter(l => l.platform === platform) ?? [];

  const handleSocialSave = (newLinks: Array<{ url: string }>) => {
    if (!selectedPlatform) {
      return;
    }
    const otherLinks
      = userProfile?.socialLinks.filter(l => l.platform !== selectedPlatform) ?? [];
    const mergedLinks = [
      ...otherLinks,
      ...newLinks.map(l => ({ platform: selectedPlatform, url: l.url })),
    ];
    void upsertUserProfile({ socialLinks: mergedLinks });
  };

  return { getLinksForPlatform, handleSocialSave };
}

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

function SocialSection({
  openPlatform,
  getLinksForPlatform,
}: {
  openPlatform: (p: Platform) => void;
  getLinksForPlatform: (p: Platform) => any[];
}) {
  return (
    <SettingsContainer title="settings.my_profile">
      <SocialLinkRow platform="github" links={getLinksForPlatform('github')} onPress={() => openPlatform('github')} />
      <SocialLinkRow platform="instagram" links={getLinksForPlatform('instagram')} onPress={() => openPlatform('instagram')} />
      <SocialLinkRow platform="tiktok" links={getLinksForPlatform('tiktok')} onPress={() => openPlatform('tiktok')} />
      <SocialLinkRow platform="website" links={getLinksForPlatform('website')} onPress={() => openPlatform('website')} />
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

function SectionDeveloper({
  iconColor,
  onOpenStorage,
  onOpenDailyRitual,
  onOpenLevelUp,
}: {
  iconColor: string;
  onOpenStorage: () => void;
  onOpenDailyRitual: () => void;
  onOpenLevelUp: () => void;
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

export function SettingsScreen() {
  const { signOut } = useAuth();
  const router = useRouter();
  const appConfig = useAppConfig();
  const userProfile = useUserProfile();
  const userStats = useUserStats();
  const upsertUserProfile = useUpsertUserProfile();
  const setStandupTime = useSetStandupTime();
  const iconColor = colors.brand.muted;

  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const editModal = useModal();
  const standupTimeModal = useModal();
  const devModal = useModal();
  const levelUpDebugModal = useModal();
  const [showDailyRitualDebug, setShowDailyRitualDebug] = useState(false);

  const { getLinksForPlatform, handleSocialSave } = buildSocialHandlers(
    selectedPlatform,
    userProfile,
    upsertUserProfile,
  );

  const openPlatform = (platform: Platform) => {
    setSelectedPlatform(platform);
    editModal.present();
  };

  return (
    <>
      <FocusAwareStatusBar style="dark" />

      <ScrollView style={{ backgroundColor: colors.brand.bg }}>
        <View className="flex-1 px-4">
          <ProfileHeader />

          <SettingsContainer title="settings.generale">
            <LanguageItem />
          </SettingsContainer>

          <SettingsContainer title="settings.my_profile">
            <SettingsItem
              text="settings.daily_standup"
              value={userStats?.standupTime || '09:00'}
              onPress={() => standupTimeModal.present()}
            />
          </SettingsContainer>

          <SocialSection
            openPlatform={openPlatform}
            getLinksForPlatform={getLinksForPlatform}
          />

          <SettingsContainer title="settings.voice_model">
            <WhisperModelItem />
          </SettingsContainer>

          <SectionAgent />
          <SectionAbout appConfig={appConfig} />

          {__DEV__ && (
            <SectionDeveloper
              iconColor={iconColor}
              onOpenStorage={() => devModal.present()}
              onOpenDailyRitual={() => setShowDailyRitualDebug(true)}
              onOpenLevelUp={() => levelUpDebugModal.present()}
            />
          )}

          <View className="my-8">
            <SettingsContainer>
              <SettingsItem text="settings.logout" onPress={() => { void signOut(); }} />
            </SettingsContainer>
          </View>
        </View>
      </ScrollView>

      <EditSocialLinksBottomSheet
        ref={editModal.ref}
        platform={selectedPlatform}
        links={selectedPlatform ? getLinksForPlatform(selectedPlatform) : []}
        onSave={handleSocialSave}
      />
      <StandupTimeBottomSheet
        ref={standupTimeModal.ref}
        currentStandupTime={userStats?.standupTime || '09:00'}
        onSave={time => setStandupTime({ time })}
      />
      <DevStorageBottomSheet modalRef={devModal.ref} />
      <DailyRitualModal
        visible={showDailyRitualDebug}
        onClose={() => setShowDailyRitualDebug(false)}
        onStartStandup={() => {
          setShowDailyRitualDebug(false);
          router.push('/(app)');
        }}
      />
      <LevelUpModal
        modalRef={levelUpDebugModal.ref}
        newLevel={3}
        newLevelName="Rocket"
        newLevelIcon="🚀"
        onDismiss={() => levelUpDebugModal.dismiss()}
      />
    </>
  );
}
