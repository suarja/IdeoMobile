import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import * as React from 'react';
import { Alert, TextInput, TouchableOpacity, View } from 'react-native';

import { colors, Text } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import { translate } from '@/lib/i18n';

type Platform = 'github' | 'instagram' | 'tiktok' | 'website';

type Props = {
  platform: Platform | null;
  links: Array<{ url: string }>;
  onSave: (links: Array<{ url: string }>) => void;
};

const PLATFORM_LABELS: Record<Platform, string> = {
  github: 'GitHub',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  website: 'Website',
};

const URL_INPUT_STYLE = {
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

const SAVE_BUTTON_STYLE = {
  marginTop: 12,
  backgroundColor: colors.brand.dark,
  borderRadius: 10,
  paddingVertical: 12,
  alignItems: 'center' as const,
} as const;

export function EditSocialLinksBottomSheet({ ref, platform, links, onSave }: Props & { ref?: React.RefObject<BottomSheetModal | null> }) {
  const [localLinks, setLocalLinks] = React.useState<Array<{ url: string }>>([]);
  const [newUrl, setNewUrl] = React.useState('');

  React.useEffect(() => {
    setLocalLinks(links);
    setNewUrl('');
  }, [platform, links]);

  const handleDelete = (index: number) => {
    Alert.alert(
      translate('settings.social_delete_confirm'),
      localLinks[index].url,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setLocalLinks(prev => prev.filter((_, i) => i !== index));
          },
        },
      ],
    );
  };

  const handleSave = () => {
    let finalLinks = [...localLinks];
    if (newUrl.trim()) {
      if (!newUrl.trim().startsWith('https://')) {
        Alert.alert(translate('settings.social_invalid_url'));
        return;
      }
      finalLinks = [...finalLinks, { url: newUrl.trim() }];
    }
    onSave(finalLinks);
    setNewUrl('');
    if (ref && typeof ref === 'object' && ref.current) {
      ref.current.dismiss();
    }
  };

  // Modal must always be mounted so ref.current is ready when present() is called
  return (
    <Modal
      ref={ref}
      snapPoints={['50%']}
      backgroundStyle={{ backgroundColor: colors.brand.bg }}
    >
      {platform && (
        <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: colors.brand.dark,
              textAlign: 'center',
              marginBottom: 16,
            }}
          >
            {PLATFORM_LABELS[platform]}
          </Text>

          {localLinks.map((link, index) => (
            <TouchableOpacity
              key={index}
              onLongPress={() => handleDelete(index)}
              style={{ paddingVertical: 8 }}
            >
              <Text style={{ fontSize: 13, color: colors.brand.dark }}>{link.url}</Text>
            </TouchableOpacity>
          ))}

          <TextInput
            value={newUrl}
            onChangeText={setNewUrl}
            placeholder="https://"
            placeholderTextColor={colors.brand.muted}
            style={URL_INPUT_STYLE}
            autoCapitalize="none"
            keyboardType="url"
          />

          <TouchableOpacity onPress={handleSave} style={SAVE_BUTTON_STYLE}>
            <Text style={{ color: colors.brand.bg, fontWeight: '600', fontSize: 15 }}>
              {translate('settings.social_save')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </Modal>
  );
}
