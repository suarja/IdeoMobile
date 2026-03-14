import Env from 'env';
import { useUniwind } from 'uniwind';

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
import { ThemeItem } from './components/theme-item';
import { WhisperModelSection } from './components/whisper-model-section';

export function SettingsScreen() {
  const signOut = useAuth.use.signOut();
  const { theme } = useUniwind();
  const iconColor
    = theme === 'dark' ? colors.neutral[400] : colors.neutral[500];
  return (
    <>
      <FocusAwareStatusBar />

      <ScrollView>
        <View className="flex-1 px-4">
          {/* Profile header */}
          <View className="items-center pt-16 pb-8">
            <View
              className="mb-3 size-20 items-center justify-center rounded-full"
              style={{ backgroundColor: '#433831' }}
            >
              <Text className="text-3xl" style={{ color: '#FCFAEA' }}>V</Text>
            </View>
            <Text className="text-lg font-semibold" style={{ color: '#433831' }}>
              {translate('profile.username')}
            </Text>
            <View
              className="mt-1 rounded-full px-3 py-0.5"
              style={{
                backgroundColor: '#FDF4CD',
                borderWidth: 1,
                borderColor: '#E8D88A',
              }}
            >
              <Text className="text-xs font-medium" style={{ color: '#433831' }}>
                {translate('profile.free_plan')}
              </Text>
            </View>
          </View>

          <SettingsContainer title="settings.generale">
            <LanguageItem />
            <ThemeItem />
          </SettingsContainer>

          <WhisperModelSection />

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
