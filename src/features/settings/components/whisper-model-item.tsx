import type { WhisperModel } from '@/lib/hooks/use-whisper-models';

import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { colors, Text } from '@/components/ui';
import { Modal, useModal } from '@/components/ui/modal';
import { useWhisperModels, WHISPER_MODELS } from '@/lib/hooks/use-whisper-models';

import { SettingsItem } from './settings-item';

function formatBytes(bytes: number): string {
  if (!bytes)
    return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

type ModelRowActionsProps = {
  model: WhisperModel;
  isActive: boolean;
  downloaded: boolean;
  isThisDownloading: boolean;
  isBusy: boolean;
  onUse: () => void;
  onDelete: () => void;
  onDownload: () => void;
};

function ModelRowActions({
  isActive,
  downloaded,
  isThisDownloading,
  isBusy,
  onUse,
  onDelete,
  onDownload,
}: ModelRowActionsProps) {
  if (isThisDownloading) {
    return <ActivityIndicator size="small" color={colors.brand.dark} />;
  }
  if (downloaded) {
    return (
      <>
        {!isActive && (
          <TouchableOpacity onPress={onUse} disabled={isBusy}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.brand.dark, opacity: isBusy ? 0.4 : 1 }}>
              Use
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onDelete} disabled={isBusy}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: colors.danger[600], opacity: isBusy ? 0.4 : 1 }}>
            Delete
          </Text>
        </TouchableOpacity>
      </>
    );
  }
  return (
    <TouchableOpacity onPress={onDownload} disabled={isBusy}>
      <Text style={{ fontSize: 14, fontWeight: '500', color: colors.brand.dark, opacity: isBusy ? 0.4 : 1 }}>
        Download
      </Text>
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
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {isActive && (
              <View style={{ backgroundColor: colors.brand.dark, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.brand.bg }}>Active</Text>
              </View>
            )}
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.brand.dark }}>{model.label}</Text>
          </View>
          <Text style={{ marginTop: 2, fontSize: 12, color: colors.brand.muted }}>
            {model.capabilities.multilingual ? 'Multilingual' : 'English only'}
            {fileSize ? `  ·  ${formatBytes(fileSize)}` : ''}
          </Text>
          {isThisDownloading && (
            <View style={{ marginTop: 6, height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: colors.brand.border }}>
              <View style={{ height: 4, borderRadius: 2, width: `${Math.round(progress * 100)}%`, backgroundColor: colors.brand.dark }} />
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <ModelRowActions
            model={model}
            isActive={isActive}
            downloaded={downloaded}
            isThisDownloading={isThisDownloading}
            isBusy={isBusy}
            onUse={onUse}
            onDelete={onDelete}
            onDownload={onDownload}
          />
        </View>
      </View>
      {!isLast && <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.06)' }} />}
    </View>
  );
}

export function WhisperModelItem() {
  const modal = useModal();
  const {
    modelFiles,
    isDownloading,
    isInitializingModel,
    currentModelId,
    initializeWhisperModel,
    deleteModel,
    isModelDownloaded,
    getDownloadProgress,
  } = useWhisperModels();

  const activeModel = WHISPER_MODELS.find(m => m.id === currentModelId);
  const snapPoints = [`${Math.min(WHISPER_MODELS.length * 88 + 120, 600)}`];
  const isBusy = isDownloading || isInitializingModel;

  return (
    <>
      <SettingsItem
        text="settings.voice_model"
        value={activeModel?.label ?? '—'}
        onPress={modal.present}
      />
      <Modal
        ref={modal.ref}
        snapPoints={snapPoints}
        title="Voice Model"
        backgroundStyle={{ backgroundColor: colors.brand.bg }}
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          {WHISPER_MODELS.map((model, index) => {
            const isActive = currentModelId === model.id;
            const downloaded = isModelDownloaded(model.id);
            const fileInfo = modelFiles[model.id];
            const progress = getDownloadProgress(model.id);
            const isThisDownloading = isDownloading && progress > 0 && progress < 1;
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
    </>
  );
}
