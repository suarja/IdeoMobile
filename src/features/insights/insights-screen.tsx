import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { Artifact, ArtifactType } from './api';
import type { InsightsTab } from './components/insights-segment-control';

import * as React from 'react';
import { ActivityIndicator } from 'react-native';
import { colors, FocusAwareStatusBar, ScrollView, Text, View } from '@/components/ui';
import { useModal } from '@/components/ui/modal';
import { translate } from '@/lib/i18n';
import { useArtifacts } from './api';
import { ArtifactCard } from './components/artifact-card';
import { ArtifactDetailSheet } from './components/artifact-detail-sheet';
import { InsightsSegmentControl } from './components/insights-segment-control';

function ArtifactList({
  type,
  onSelect,
}: {
  type: ArtifactType;
  onSelect: (artifact: Artifact) => void;
}) {
  const artifacts = useArtifacts(type);

  if (artifacts === undefined) {
    return (
      <View style={{ alignItems: 'center', paddingTop: 40 }}>
        <ActivityIndicator color={colors.brand.dark} />
      </View>
    );
  }

  if (artifacts.length === 0) {
    const emptyKey = type === 'validation' ? 'insights.empty_validation' : 'insights.empty_suivi';
    return (
      <View style={{ alignItems: 'center', paddingTop: 40, paddingHorizontal: 24 }}>
        <Text
          style={{
            fontSize: 14,
            color: colors.brand.muted,
            textAlign: 'center',
            lineHeight: 22,
          }}
        >
          {translate(emptyKey as any)}
        </Text>
      </View>
    );
  }

  return (
    <>
      {artifacts.map(artifact => (
        <ArtifactCard
          key={artifact._id}
          artifact={artifact as Artifact}
          onPress={onSelect}
        />
      ))}
    </>
  );
}

export function InsightsScreen() {
  const [activeTab, setActiveTab] = React.useState<InsightsTab>('validation');
  const [selectedArtifact, setSelectedArtifact] = React.useState<Artifact | null>(null);
  const detailSheet = useModal();

  const handleSelect = React.useCallback((artifact: Artifact) => {
    setSelectedArtifact(artifact);
    detailSheet.present();
  }, [detailSheet]);

  const activeType: ArtifactType = activeTab === 'validation' ? 'validation' : 'tracking';

  return (
    <View style={{ flex: 1, backgroundColor: colors.brand.bg }}>
      <FocusAwareStatusBar />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 120 }}
      >
        <Text
          style={{
            fontSize: 22,
            fontWeight: '700',
            color: colors.brand.dark,
            marginBottom: 20,
          }}
        >
          {translate('insights.tab_label' as any)}
        </Text>

        <InsightsSegmentControl activeTab={activeTab} onChange={setActiveTab} />

        <ArtifactList type={activeType} onSelect={handleSelect} />
      </ScrollView>

      <ArtifactDetailSheet
        ref={detailSheet.ref as React.RefObject<BottomSheetModal | null>}
        artifact={selectedArtifact}
      />
    </View>
  );
}
