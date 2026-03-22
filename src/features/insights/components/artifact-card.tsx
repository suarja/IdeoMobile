import type { Artifact } from '../api';

import { TouchableOpacity, View } from 'react-native';
import { colors, Text } from '@/components/ui';

type ArtifactCardProps = {
  artifact: Artifact;
  onPress: (artifact: Artifact) => void;
};

export function ArtifactCard({ artifact, onPress }: ArtifactCardProps) {
  return (
    <TouchableOpacity
      onPress={() => onPress(artifact)}
      activeOpacity={0.75}
      style={{
        backgroundColor: colors.brand.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.brand.border,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '700',
            color: colors.brand.dark,
            flex: 1,
            marginRight: 8,
          }}
          numberOfLines={2}
        >
          {artifact.title}
        </Text>
        <Text style={{ fontSize: 11, color: colors.brand.muted, fontWeight: '500' }}>
          {artifact.date}
        </Text>
      </View>
      <Text
        style={{ fontSize: 12, color: colors.brand.muted, lineHeight: 18 }}
        numberOfLines={2}
      >
        {artifact.tldr}
      </Text>
    </TouchableOpacity>
  );
}
