import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import * as React from 'react';
import { ActivityIndicator, Alert, TextInput, TouchableOpacity, View } from 'react-native';

import { colors, Text } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import { translate } from '@/lib/i18n';
import {
  useRemoveGitHubToken,
  useSetGitHubToken,
  useUpsertUserProfile,
  useUserProfile,
  useValidateGitHubToken,
} from '../api';
import { EditSocialLinksBottomSheet } from './edit-social-links-bottom-sheet';
import { SocialLinkRow } from './social-link-row';

type Platform = 'github' | 'instagram' | 'tiktok' | 'website';
type ValidationState = 'idle' | 'validating' | 'ok' | 'error';

function maskToken(token: string) {
  if (token.length <= 8)
    return '****';
  return `${token.slice(0, 4)}****${token.slice(-4)}`;
}

const INPUT_STYLE = {
  borderWidth: 1,
  borderColor: colors.brand.border,
  borderRadius: 8,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 14,
  color: colors.brand.dark,
  backgroundColor: colors.brand.card,
  marginTop: 12,
} as const;

const SAVE_BTN_STYLE = {
  marginTop: 10,
  backgroundColor: colors.brand.dark,
  borderRadius: 10,
  paddingVertical: 12,
  alignItems: 'center' as const,
} as const;

function ExistingToken({ token, onRemove }: { token: string; onRemove: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
      <Text style={{ fontSize: 13, color: colors.brand.dark, fontFamily: 'monospace' }}>
        {maskToken(token)}
      </Text>
      <TouchableOpacity
        onPress={onRemove}
        style={{
          backgroundColor: colors.brand.selected,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderWidth: 1,
          borderColor: colors.brand.border,
        }}
      >
        <Text style={{ fontSize: 13, color: colors.brand.dark, fontWeight: '600' }}>
          {translate('settings.remove')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function NewTokenForm({ onSaved }: { onSaved: () => void }) {
  const [tokenInput, setTokenInput] = React.useState('');
  const [validationState, setValidationState] = React.useState<ValidationState>('idle');
  const [validationMessage, setValidationMessage] = React.useState('');

  const setGitHubToken = useSetGitHubToken();
  const validateGitHubToken = useValidateGitHubToken();

  const handleValidateAndSave = async () => {
    const trimmed = tokenInput.trim();
    if (!trimmed)
      return;
    setValidationState('validating');
    setValidationMessage('');
    try {
      const result = await validateGitHubToken({ token: trimmed, repoUrl: 'https://github.com/anthropics/anthropic-sdk-python' });
      if (result.ok) {
        setValidationState('ok');
        setValidationMessage(result.preview);
        await setGitHubToken({ token: trimmed });
        setTokenInput('');
        onSaved();
      }
      else {
        setValidationState('error');
        setValidationMessage(result.preview);
      }
    }
    catch {
      setValidationState('error');
      setValidationMessage('Validation failed. Check your token.');
    }
  };

  const isError = validationState === 'error';
  const isBusy = validationState === 'validating';

  return (
    <>
      <TextInput
        value={tokenInput}
        onChangeText={(t) => {
          setTokenInput(t);
          setValidationState('idle');
          setValidationMessage('');
        }}
        placeholder="ghp_..."
        placeholderTextColor={colors.brand.muted}
        style={[INPUT_STYLE, { borderColor: isError ? '#E53E3E' : colors.brand.border }]}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {validationMessage
        ? (
            <Text
              style={{ fontSize: 12, color: isError ? '#E53E3E' : '#38A169', marginTop: 6 }}
              numberOfLines={2}
            >
              {validationMessage}
            </Text>
          )
        : null}

      <TouchableOpacity
        onPress={() => { void handleValidateAndSave(); }}
        disabled={isBusy || !tokenInput.trim()}
        style={[SAVE_BTN_STYLE, { opacity: isBusy || !tokenInput.trim() ? 0.5 : 1 }]}
      >
        {isBusy
          ? <ActivityIndicator color={colors.brand.bg} />
          : (
              <Text style={{ color: colors.brand.bg, fontWeight: '600', fontSize: 15 }}>
                {translate('settings.validate_save')}
              </Text>
            )}
      </TouchableOpacity>
    </>
  );
}

function GitHubTokenSection({ existingToken }: { existingToken: string | undefined }) {
  const removeGitHubToken = useRemoveGitHubToken();
  const [showForm, setShowForm] = React.useState(!existingToken);

  React.useEffect(() => {
    setShowForm(!existingToken);
  }, [existingToken]);

  const handleRemove = () => {
    Alert.alert(
      translate('settings.github_token'),
      'Remove your GitHub token?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: translate('settings.remove'), style: 'destructive', onPress: () => { void removeGitHubToken({}); } },
      ],
    );
  };

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.brand.dark }}>
        {translate('settings.github_token')}
      </Text>
      <Text style={{ fontSize: 12, color: colors.brand.muted, marginTop: 2 }}>
        {translate('settings.github_token_desc')}
      </Text>

      {existingToken && !showForm
        ? <ExistingToken token={existingToken} onRemove={handleRemove} />
        : <NewTokenForm onSaved={() => setShowForm(false)} />}
    </View>
  );
}

export function ProfileBottomSheet({
  ref,
}: { ref?: React.RefObject<BottomSheetModal | null> }) {
  const userProfile = useUserProfile();
  const upsertUserProfile = useUpsertUserProfile();

  const [selectedPlatform, setSelectedPlatform] = React.useState<Platform | null>(null);
  const editModalRef = React.useRef<BottomSheetModal>(null);

  const getLinks = (platform: Platform) =>
    userProfile?.socialLinks.filter(l => l.platform === platform) ?? [];

  const handleOpenPlatform = (platform: Platform) => {
    setSelectedPlatform(platform);
    editModalRef.current?.present();
  };

  const handleSave = (newLinks: Array<{ url: string }>) => {
    if (!selectedPlatform)
      return;
    const otherLinks = userProfile?.socialLinks.filter(l => l.platform !== selectedPlatform) ?? [];
    const mergedLinks = [
      ...otherLinks,
      ...newLinks.map(l => ({ platform: selectedPlatform, url: l.url })),
    ];
    void upsertUserProfile({ socialLinks: mergedLinks });
  };

  return (
    <>
      <Modal ref={ref} snapPoints={['75%']} backgroundStyle={{ backgroundColor: colors.brand.bg }}>
        <View style={{ paddingBottom: 24 }}>
          <Text
            style={{ fontSize: 16, fontWeight: '700', color: colors.brand.dark, textAlign: 'center', marginBottom: 12 }}
          >
            {translate('settings.my_profile')}
          </Text>

          <SocialLinkRow platform="github" links={getLinks('github')} onPress={() => handleOpenPlatform('github')} />
          <SocialLinkRow platform="instagram" links={getLinks('instagram')} onPress={() => handleOpenPlatform('instagram')} />
          <SocialLinkRow platform="tiktok" links={getLinks('tiktok')} onPress={() => handleOpenPlatform('tiktok')} />
          <SocialLinkRow platform="website" links={getLinks('website')} onPress={() => handleOpenPlatform('website')} />

          <View style={{ height: 1, backgroundColor: colors.brand.border, marginHorizontal: 16, marginVertical: 12 }} />

          <GitHubTokenSection existingToken={userProfile?.githubToken} />
        </View>
      </Modal>

      <EditSocialLinksBottomSheet
        ref={editModalRef}
        platform={selectedPlatform}
        links={selectedPlatform ? getLinks(selectedPlatform) : []}
        onSave={handleSave}
      />
    </>
  );
}
