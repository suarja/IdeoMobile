import * as React from 'react';
import { Image, View } from 'react-native';
import { colors, Text } from '@/components/ui';

type Props = {
  imageUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  size?: number;
};

export function UserAvatar({ imageUrl, firstName, lastName, email, size = 80 }: Props) {
  const [imageError, setImageError] = React.useState(false);

  const initials
    = (firstName?.[0] ?? email?.[0] ?? '?').toUpperCase()
      + (lastName?.[0] ?? '').toUpperCase();

  if (imageUrl && !imageError) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
        }}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.brand.dark,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: colors.brand.bg,
          fontSize: size * 0.35,
          fontWeight: '600',
        }}
      >
        {initials}
      </Text>
    </View>
  );
}
