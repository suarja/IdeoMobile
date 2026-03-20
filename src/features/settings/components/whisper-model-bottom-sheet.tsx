import type { useModal } from '@/components/ui/modal';
import type { WhisperModel } from '@/lib/hooks/use-whisper-models';

import { Ionicons } from '@expo/vector-icons';
import { ActionSheetIOS, ActivityIndicator, Alert, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { colors, Text } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import { WHISPER_MODELS } from '@/lib/hooks/use-whisper-models';
import { translate } from '@/lib/i18n';

function formatBytes(bytes: number): string {
  if (!bytes)
    return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

type ModelRowActionsProps = {
  isActive: boolean;
  downloaded: boolean;
  isThisDownloading: boolean;
  isBusy: boolean;
  onUse: () => void;
  onDelete: () => void;
  onDownload: () => void;
};

function showModelActionSheet({
  isActive,
  onUse,
  onDelete,
}: {
  isActive: boolean;
  onUse: () => void;
  onDelete: () => void;
}) {
  const options = isActive
    ? ['Delete', 'Cancel']
    : ['Use', 'Delete', 'Cancel'];

  const destructiveIndex = isActive ? 0 : 1;
  const cancelIndex = isActive ? 1 : 2;

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      { options, cancelButtonIndex: cancelIndex, destructiveButtonIndex: destructiveIndex },
      (buttonIndex) => {
        if (isActive) {
          if (buttonIndex === 0)
            onDelete();
        }
        else {
          if (buttonIndex === 0)
            onUse();
          else if (buttonIndex === 1)
            onDelete();
        }
      },
    );
  }
  else {
    const alertButtons = [];
    if (!isActive) {
      alertButtons.push({ text: 'Use', onPress: onUse });
    }
    alertButtons.push({ text: 'Delete', style: 'destructive' as const, onPress: onDelete });
    alertButtons.push({ text: 'Cancel', style: 'cancel' as const });
    Alert.alert('Model options', undefined, alertButtons);
  }
}

function ModelRowActions({ isActive, downloaded, isThisDownloading, isBusy, onUse, onDelete, onDownload }: ModelRowActionsProps) {
  if (isThisDownloading) {
    return <ActivityIndicator size="small" color={colors.brand.dark} />;
  }

  if (downloaded) {
    return (
      <TouchableOpacity
        style={[styles.moreBtn, isBusy && styles.btnDisabled]}
        onPress={() => showModelActionSheet({ isActive, onUse, onDelete })}
        disabled={isBusy}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="ellipsis-horizontal" size={16} color={colors.brand.dark} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.downloadBtn, isBusy && styles.btnDisabled]}
      onPress={onDownload}
      disabled={isBusy}
      activeOpacity={0.75}
    >
      <Ionicons name="cloud-download-outline" size={13} color={colors.brand.dark} />
      <Text style={styles.downloadBtnText}>Download</Text>
    </TouchableOpacity>
  );
}

type ModelRowProps = {
  model: WhisperModel;
  isLast: boolean;
  isActive: boolean;
  downloaded: boolean;
  fileSize: number;
  progress: number;
  isThisDownloading: boolean;
  isBusy: boolean;
  onUse: () => void;
  onDelete: () => void;
  onDownload: () => void;
};

function ModelRow({ model, isLast, isActive, downloaded, fileSize, progress, isThisDownloading, isBusy, onUse, onDelete, onDownload }: ModelRowProps) {
  return (
    <View style={[styles.row, isActive && styles.rowActive]}>
      <View style={styles.rowInner}>
        <View style={styles.rowInfo}>
          <View style={styles.rowNameRow}>
            {isActive && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            )}
            <Text style={styles.modelName}>{model.label}</Text>
          </View>
          <Text style={styles.modelMeta}>
            {model.capabilities.multilingual ? 'Multilingual' : 'English only'}
            {fileSize ? `  ·  ${formatBytes(fileSize)}` : ''}
          </Text>
          {isThisDownloading && (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
          )}
        </View>
        <ModelRowActions
          isActive={isActive}
          downloaded={downloaded}
          isThisDownloading={isThisDownloading}
          isBusy={isBusy}
          onUse={onUse}
          onDelete={onDelete}
          onDownload={onDownload}
        />
      </View>
      {!isLast && <View style={styles.separator} />}
    </View>
  );
}

export type WhisperModelBottomSheetProps = {
  modalRef: ReturnType<typeof useModal>['ref'];
  modelFiles: Record<string, { path: string; size: number }>;
  isDownloading: boolean;
  isInitializingModel: boolean;
  currentModelId: string | null;
  initializeWhisperModel: (modelId: string) => Promise<unknown>;
  deleteModel: (modelId: string) => Promise<void>;
  isModelDownloaded: (modelId: string) => boolean;
  getDownloadProgress: (modelId: string) => number;
  availableModels: WhisperModel[];
};

export function WhisperModelBottomSheet({
  modalRef,
  modelFiles,
  isDownloading,
  isInitializingModel,
  currentModelId,
  initializeWhisperModel,
  deleteModel,
  isModelDownloaded,
  getDownloadProgress,
}: WhisperModelBottomSheetProps) {
  const isBusy = isDownloading || isInitializingModel;

  return (
    <Modal
      ref={modalRef}
      snapPoints={['70%']}
      backgroundStyle={{ backgroundColor: colors.brand.bg }}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{translate('settings.voice_model')}</Text>
      </View>
      <View style={styles.list}>
        {WHISPER_MODELS.map((model, index) => {
          const isActive = currentModelId === model.id;
          const downloaded = isModelDownloaded(model.id);
          const fileInfo = modelFiles[model.id];
          const progress = getDownloadProgress(model.id);
          const isThisDownloading = progress > 0 && progress < 1;
          return (
            <ModelRow
              key={model.id}
              model={model}
              isLast={index === WHISPER_MODELS.length - 1}
              isActive={isActive}
              downloaded={downloaded}
              fileSize={fileInfo?.size ?? 0}
              progress={progress}
              isThisDownloading={isThisDownloading}
              isBusy={isBusy}
              onUse={() => initializeWhisperModel(model.id).catch(console.error)}
              onDelete={() => deleteModel(model.id).catch(console.error)}
              onDownload={() => initializeWhisperModel(model.id).catch(console.error)}
            />
          );
        })}
      </View>
    </Modal>
  );
}

const RADIUS = 12;

const styles = StyleSheet.create({
  header: {
    paddingBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  headerTitle: {
    color: colors.brand.dark,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  list: {
    paddingHorizontal: 16,
  },
  // Rows
  row: {
    borderRadius: RADIUS,
    paddingHorizontal: 8,
  },
  rowActive: {
    backgroundColor: colors.brand.selected,
  },
  rowInner: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowInfo: {
    flex: 1,
    paddingRight: 12,
  },
  rowNameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 2,
  },
  modelName: {
    color: colors.brand.dark,
    fontSize: 14,
    fontWeight: '600',
  },
  modelMeta: {
    color: colors.brand.muted,
    fontSize: 12,
  },
  progressTrack: {
    backgroundColor: colors.brand.border,
    borderRadius: 2,
    height: 4,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: colors.brand.dark,
    borderRadius: 2,
    height: 4,
  },
  separator: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    height: 1,
    marginHorizontal: 4,
  },
  // Active badge
  activeBadge: {
    backgroundColor: colors.brand.dark,
    borderRadius: RADIUS,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activeBadgeText: {
    color: colors.brand.bg,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // "⋯" button for downloaded models
  moreBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: RADIUS,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  // Download pill button
  downloadBtn: {
    alignItems: 'center',
    borderColor: colors.brand.dark,
    borderRadius: RADIUS,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  downloadBtnText: {
    color: colors.brand.dark,
    fontSize: 13,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.4,
  },
});
