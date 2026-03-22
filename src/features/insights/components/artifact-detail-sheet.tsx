import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { Artifact } from '../api';

import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as React from 'react';
import { View } from 'react-native';
import { colors, Text } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import { AgentMarkdown } from '@/features/idea/components/agent-markdown';

type ArtifactDetailSheetProps = {
  artifact: Artifact | null;
};

const TEXT_STYLE = {
  fontSize: 14,
  color: colors.brand.dark,
  lineHeight: 22,
} as const;

export function ArtifactDetailSheet({ ref, artifact }: ArtifactDetailSheetProps & { ref?: React.RefObject<BottomSheetModal | null> }) {
  return (
    <Modal
      ref={ref}
      snapPoints={['85%']}
      backgroundStyle={{ backgroundColor: colors.brand.bg }}
    >
      {artifact && (
        <BottomSheetScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        >
          <View style={{ marginBottom: 12 }}>
            <Text
              style={{
                fontSize: 17,
                fontWeight: '700',
                color: colors.brand.dark,
                marginBottom: 4,
              }}
            >
              {artifact.title}
            </Text>
            <Text style={{ fontSize: 12, color: colors.brand.muted }}>
              {artifact.date}
            </Text>
          </View>

          <View
            style={{
              backgroundColor: colors.brand.selected,
              borderRadius: 10,
              padding: 12,
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.brand.muted, textTransform: 'uppercase', marginBottom: 4 }}>
              TLDR
            </Text>
            <Text style={{ fontSize: 13, color: colors.brand.dark, lineHeight: 20 }}>
              {artifact.tldr}
            </Text>
          </View>

          <AgentMarkdown text={artifact.content} baseStyle={TEXT_STYLE} />
        </BottomSheetScrollView>
      )}
    </Modal>
  );
}
