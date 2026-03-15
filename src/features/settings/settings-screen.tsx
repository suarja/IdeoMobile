import Env from 'env';

import {
  colors,
  FocusAwareStatusBar,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { Github, Rate, Share, Support, Website } from '@/components/ui/icons';
import { useAuthStore as useAuth } from '@/features/auth/use-auth-store';
import { translate } from '@/lib/i18n';
import { LanguageItem } from './components/language-item';
import { SettingsContainer } from './components/settings-container';
import { SettingsItem } from './components/settings-item';
import { WhisperModelItem } from './components/whisper-model-item';

export function SettingsScreen() {
  const signOut = useAuth.use.signOut();
  const iconColor = colors.brand.muted;
  return (
    <>
      <FocusAwareStatusBar style="dark" />

      <ScrollView style={{ backgroundColor: colors.brand.bg }}>
        <View className="flex-1 px-4">
          {/* Profile header */}
          <View className="items-center pt-16 pb-8">
            <View
              className="mb-3 size-20 items-center justify-center rounded-full"
              style={{ backgroundColor: colors.brand.dark }}
            >
              <Text className="text-3xl" style={{ color: colors.brand.bg }}>V</Text>
            </View>
            <Text className="text-lg font-semibold" style={{ color: colors.brand.dark }}>
              {translate('profile.username')}
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

          <SettingsContainer title="settings.generale">
            <LanguageItem />
          </SettingsContainer>

          <SettingsContainer title="settings.voice_model">
            <WhisperModelItem />
          </SettingsContainer>

          <SettingsContainer title="settings.about">
            <SettingsItem
              text="settings.app_name"
              value={Env.EXPO_PUBLIC_NAME}
            />
            <SettingsItem
              text="settings.version"
              value={Env.EXPO_PUBLIC_VERSION}
            />
          </SettingsContainer>

          <SettingsContainer title="settings.support_us">
            <SettingsItem
              text="settings.share"
              icon={<Share color={iconColor} />}
              onPress={() => {}}
            />
            <SettingsItem
              text="settings.rate"
              icon={<Rate color={iconColor} />}
              onPress={() => {}}
            />
            <SettingsItem
              text="settings.support"
              icon={<Support color={iconColor} />}
              onPress={() => {}}
            />
          </SettingsContainer>

          <SettingsContainer title="settings.links">
            <SettingsItem text="settings.privacy" onPress={() => {}} />
            <SettingsItem text="settings.terms" onPress={() => {}} />
            <SettingsItem
              text="settings.github"
              icon={<Github color={iconColor} />}
              onPress={() => {}}
            />
            <SettingsItem
              text="settings.website"
              icon={<Website color={iconColor} />}
              onPress={() => {}}
            />
          </SettingsContainer>

          <View className="my-8">
            <SettingsContainer>
              <SettingsItem text="settings.logout" onPress={signOut} />
            </SettingsContainer>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
