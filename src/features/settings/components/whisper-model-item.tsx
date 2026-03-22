import { useModal } from '@/components/ui/modal';
import { useWhisperModels, WHISPER_MODELS } from '@/lib/hooks/use-whisper-models';
import { translate } from '@/lib/i18n';

import { SettingsItem } from './settings-item';
import { WhisperModelBottomSheet } from './whisper-model-bottom-sheet';

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
    availableModels,
  } = useWhisperModels();

  const activeModel = WHISPER_MODELS.find(m => m.id === currentModelId);

  return (
    <>
      <SettingsItem
        text="settings.voice_model"
        value={activeModel ? translate(activeModel.labelKey) : '—'}
        onPress={modal.present}
      />
      <WhisperModelBottomSheet
        modalRef={modal.ref}
        modelFiles={modelFiles}
        isDownloading={isDownloading}
        isInitializingModel={isInitializingModel}
        currentModelId={currentModelId}
        initializeWhisperModel={initializeWhisperModel}
        deleteModel={deleteModel}
        isModelDownloaded={isModelDownloaded}
        getDownloadProgress={getDownloadProgress}
        availableModels={availableModels}
      />
    </>
  );
}
