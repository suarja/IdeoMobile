import { useEffect } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';

import { colors, Text } from '@/components/ui';
import { useWhisperModels, WHISPER_MODELS } from '@/lib/hooks/use-whisper-models';

import { SettingsContainer } from './settings-container';

function formatBytes(bytes: number): string {
  if (!bytes)
    return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

// eslint-disable-next-line max-lines-per-function
export function WhisperModelSection() {
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

  // Scan existing models on mount
  useEffect(() => {}, []);

  return (
    <SettingsContainer title="settings.voice_model">
      {WHISPER_MODELS.map((model, index) => {
        const isActive = currentModelId === model.id;
        const downloaded = isModelDownloaded(model.id);
        const fileInfo = modelFiles[model.id];
        const progress = getDownloadProgress(model.id);
        const isThisDownloading = isDownloading && progress > 0 && progress < 1;
        const isBusy = isDownloading || isInitializingModel;

        return (
          <View
            key={model.id}
            className="flex-row items-center justify-between px-4 py-3"
            style={
              index < WHISPER_MODELS.length - 1
                ? { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }
                : undefined
            }
          >
            {/* Left: name + meta */}
            <View className="flex-1 pr-3">
              <View className="flex-row items-center gap-2">
                {isActive && (
                  <View
                    className="rounded-full px-2 py-0.5"
                    style={{ backgroundColor: colors.brand.dark }}
                  >
                    <Text className="text-xs font-semibold" style={{ color: colors.brand.bg }}>
                      Active
                    </Text>
                  </View>
                )}
                <Text className="text-sm font-semibold" style={{ color: colors.brand.dark }}>
                  {model.label}
                </Text>
              </View>
              <Text className="mt-0.5 text-xs" style={{ color: colors.brand.muted }}>
                {model.capabilities.multilingual ? 'Multilingual' : 'English only'}
                {fileInfo?.size ? `  ·  ${formatBytes(fileInfo.size)}` : ''}
              </Text>
              {isThisDownloading && (
                <View className="mt-1 h-1 w-full overflow-hidden rounded-full" style={{ backgroundColor: colors.brand.border }}>
                  <View
                    className="h-1 rounded-full"
                    style={{ width: `${Math.round(progress * 100)}%`, backgroundColor: colors.brand.dark }}
                  />
                </View>
              )}
            </View>

            {/* Right: actions */}
            <View className="flex-row items-center gap-3">
              {isThisDownloading
                ? (
                    <ActivityIndicator size="small" color={colors.brand.dark} />
                  )
                : downloaded
                  ? (
                      <>
                        {!isActive && (
                          <TouchableOpacity
                            onPress={() => initializeWhisperModel(model.id).catch(console.error)}
                            disabled={isBusy}
                          >
                            <Text className="text-sm font-medium" style={{ color: colors.brand.dark, opacity: isBusy ? 0.4 : 1 }}>
                              Use
                            </Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          onPress={() => deleteModel(model.id).catch(console.error)}
                          disabled={isBusy}
                        >
                          <Text className="text-sm font-medium" style={{ color: colors.danger[600], opacity: isBusy ? 0.4 : 1 }}>
                            Delete
                          </Text>
                        </TouchableOpacity>
                      </>
                    )
                  : (
                      <TouchableOpacity
                        onPress={() => initializeWhisperModel(model.id).catch(console.error)}
                        disabled={isBusy}
                      >
                        <Text className="text-sm font-medium" style={{ color: colors.brand.dark, opacity: isBusy ? 0.4 : 1 }}>
                          Download
                        </Text>
                      </TouchableOpacity>
                    )}
            </View>
          </View>
        );
      })}
    </SettingsContainer>
  );
}
