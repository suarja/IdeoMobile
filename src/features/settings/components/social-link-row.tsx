import * as React from 'react';
import { Pressable, View } from 'react-native';

import { colors, Text } from '@/components/ui';
import { Github, Website } from '@/components/ui/icons';

type Platform = 'github' | 'instagram' | 'tiktok' | 'website';

type Props = {
  platform: Platform;
  links: Array<{ url: string }>;
  onPress: () => void;
};

function PlatformIcon({ platform, color }: { platform: Platform; color: string }) {
  switch (platform) {
    case 'github':
      return <Github color={color} />;
    case 'website':
      return <Website color={color} />;
    default:
      return <Website color={color} />;
  }
}

const PLATFORM_LABELS: Record<Platform, string> = {
  github: 'GitHub',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  website: 'Website',
};

export function SocialLinkRow({ platform, links, onPress }: Props) {
  const iconColor = colors.brand.muted;

  const linkPreview = () => {
    if (links.length === 0) {
      return <Text style={{ color: colors.brand.muted, fontSize: 13 }}>Add</Text>;
    }
    const first
      = links[0].url.length > 30 ? `${links[0].url.slice(0, 30)}...` : links[0].url;
    if (links.length === 1) {
      return <Text style={{ color: colors.brand.muted, fontSize: 13 }}>{first}</Text>;
    }
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={{ color: colors.brand.muted, fontSize: 13 }}>{first}</Text>
        <View
          style={{
            backgroundColor: colors.brand.selected,
            borderRadius: 10,
            paddingHorizontal: 6,
            paddingVertical: 1,
          }}
        >
          <Text style={{ color: colors.brand.dark, fontSize: 11, fontWeight: '600' }}>
            +
            {links.length - 1}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <PlatformIcon platform={platform} color={iconColor} />
        <Text style={{ color: colors.brand.dark, fontSize: 15 }}>{PLATFORM_LABELS[platform]}</Text>
      </View>
      {linkPreview()}
    </Pressable>
  );
}
