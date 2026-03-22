/**
 * OpenAI's Whisper models converted to ggml format for use with whisper.cpp
 *
 * Download from https://huggingface.co/ggerganov/whisper.cpp/tree/main
 */
import type { DownloadProgressData, FileSystemDownloadResult } from 'expo-file-system/legacy';
import type { WhisperContext } from 'whisper.rn/index.js';
import type { TxKeyPath } from '@/lib/i18n';
import { Directory, File, Paths } from 'expo-file-system';
import {
  createDownloadResumable,
} from 'expo-file-system/legacy';
import { useCallback, useEffect, useRef, useState } from 'react';
import { initWhisper, initWhisperVad } from 'whisper.rn/index.js';
import { storage } from '@/lib/storage';

const SELECTED_MODEL_KEY = 'whisper_selected_model';

export type WhisperModel = {
  id: string;
  /** i18n key used with translate() — e.g. 'settings.model_precise' */
  labelKey: TxKeyPath;
  url: string;
  filename: string;
  /** Approximate compressed file size in bytes — shown before download. */
  sizeBytes: number;
  capabilities: {
    multilingual: boolean;
    quantizable: boolean;
  };
};

// Models ordered from best to lightest.
// Sizes are the actual file sizes on HuggingFace (whisper.cpp ggml builds).
export const WHISPER_MODELS: WhisperModel[] = [
  {
    id: 'large-v3-turbo',
    labelKey: 'settings.model_precise',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin',
    filename: 'ggml-large-v3-turbo.bin',
    sizeBytes: 809_000_000, // ~809 MB
    capabilities: {
      multilingual: true,
      quantizable: false,
    },
  },
  {
    id: 'small',
    labelKey: 'settings.model_balanced',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
    filename: 'ggml-small.bin',
    sizeBytes: 487_000_000, // ~487 MB
    capabilities: {
      multilingual: true,
      quantizable: false,
    },
  },
  {
    id: 'base',
    labelKey: 'settings.model_lightweight',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
    filename: 'ggml-base.bin',
    sizeBytes: 148_000_000, // ~148 MB
    capabilities: {
      multilingual: true,
      quantizable: false,
    },
  },
  {
    id: 'tiny',
    labelKey: 'settings.model_minimal',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin',
    filename: 'ggml-tiny.en.bin',
    sizeBytes: 77_700_000, // ~78 MB
    capabilities: {
      multilingual: false,
      quantizable: false,
    },
  },
];

type ModelFileInfo = {
  path: string;
  size: number;
};

// eslint-disable-next-line max-lines-per-function
export function useWhisperModels() {
  const [modelFiles, setModelFiles] = useState<Record<string, ModelFileInfo>>(
    {},
  );
  const [downloadProgress, setDownloadProgress] = useState<
    Record<string, number>
  >({});
  const [isDownloading, setIsDownloading] = useState(false);
  const [isInitializingModel, setIsInitializingModel] = useState(false);
  const [whisperContext, setWhisperContext] = useState<WhisperContext | null>(
    null,
  );
  const [vadContext, setVadContext] = useState<any>(null);
  const [currentModelId, setCurrentModelId] = useState<string | null>(null);

  // Throttle download progress setState calls: only emit when progress changes by ≥1%
  // to avoid "Maximum update depth exceeded" at high download speeds.
  const lastEmittedProgressRef = useRef<Record<string, number>>({});

  // Refs always pointing to the latest contexts — used for cleanup on unmount (Fast Refresh,
  // app teardown) to release native Whisper objects and avoid TurboModuleManager timeout.
  const whisperContextRef = useRef<WhisperContext | null>(null);
  const vadContextRef = useRef<any>(null);
  useEffect(() => {
    whisperContextRef.current = whisperContext;
  }, [whisperContext]);
  useEffect(() => {
    vadContextRef.current = vadContext;
  }, [vadContext]);

  const getModelDirectory = useCallback(async () => {
    let documentDirectory: Directory;
    try {
      documentDirectory = Paths.document;
    }
    // eslint-disable-next-line unused-imports/no-unused-vars
    catch (error) {
      throw new Error('Document directory is not available.');
    }

    if (!documentDirectory?.uri) {
      throw new Error('Document directory is not available.');
    }

    const directory = new Directory(documentDirectory, 'whisper-models');
    try {
      directory.create({ idempotent: true, intermediates: true });
    }
    catch (error) {
      console.warn('Failed to ensure Whisper model directory exists:', error);
      throw error;
    }
    return directory;
  }, []);

  const downloadModel = useCallback(
    async (model: WhisperModel) => {
      const directory = await getModelDirectory();
      const file = new File(directory, model.filename);

      // Helper to update cache with latest stat info
      const updateModelFileInfo = () => {
        try {
          const stats = file.info();
          if (!stats.exists)
            throw new Error('File not found');
          setModelFiles(prev => ({
            ...prev,
            [model.id]: {
              path: file.uri,
              size: Number(stats.size) || 0,
            },
          }));
        }
        catch (statError) {
          console.warn(
            `Failed to stat model file ${model.id} at ${file.uri}:`,
            statError,
          );
          setModelFiles(prev => ({
            ...prev,
            [model.id]: {
              path: file.uri,
              size: 0,
            },
          }));
        }
      };

      // Check if file already exists
      let existingInfo;
      try {
        existingInfo = file.info();
      }
      catch (infoError) {
        console.warn(
          `Failed to read info for model ${model.id} at ${file.uri}:`,
          infoError,
        );
        existingInfo = { exists: false };
      }
      if (existingInfo.exists) {
        console.log(`Model ${model.id} already exists at ${file.uri}`);
        updateModelFileInfo();
        return file.uri;
      }

      setIsDownloading(true);
      console.log(`Downloading model ${model.id} from ${model.url}`);

      try {
        const downloadResumable = createDownloadResumable(
          model.url,
          file.uri,
          undefined,
          (progressData: DownloadProgressData) => {
            const { totalBytesWritten, totalBytesExpectedToWrite } = progressData;
            const fraction
              = totalBytesExpectedToWrite > 0
                ? totalBytesWritten / totalBytesExpectedToWrite
                : 0;
            const last = lastEmittedProgressRef.current[model.id] ?? -1;
            if (fraction - last >= 0.01 || fraction === 1) {
              lastEmittedProgressRef.current[model.id] = fraction;
              setDownloadProgress(prev => ({
                ...prev,
                [model.id]: fraction,
              }));
              console.log(
                `Download progress for ${model.id}: ${(fraction * 100).toFixed(
                  1,
                )}%`,
              );
            }
          },
        );

        const downloadResult = (await downloadResumable.downloadAsync()) as
          | FileSystemDownloadResult
          | undefined;

        if (
          downloadResult
          && (downloadResult.status === 0
            || (downloadResult.status >= 200 && downloadResult.status < 300))
        ) {
          console.log(`Successfully downloaded model ${model.id}`);
          updateModelFileInfo();
          setDownloadProgress(prev => ({ ...prev, [model.id]: 1 }));
          delete lastEmittedProgressRef.current[model.id];
          return file.uri;
        }
        else {
          throw new Error(
            `Download failed with status: ${downloadResult?.status}`,
          );
        }
      }
      catch (error) {
        console.error(`Error downloading model ${model.id}:`, error);
        throw error;
      }
      finally {
        setIsDownloading(false);
      }
    },
    [getModelDirectory],
  );

  const initializeWhisperModel = useCallback(
    async (modelId: string, options?: { initVad?: boolean }) => {
      const model = WHISPER_MODELS.find(m => m.id === modelId);
      if (!model)
        throw new Error('Invalid model selected');

      try {
        setIsInitializingModel(true);
        console.log(`Initializing Whisper model: ${model.labelKey}`);

        // Download model if not already available
        const modelPath = await downloadModel(model);

        // Initialize Whisper context
        const context = await initWhisper({
          filePath: modelPath,
        });

        setWhisperContext(context);
        setCurrentModelId(modelId);
        storage.set(SELECTED_MODEL_KEY, modelId);
        console.log(`Whisper context initialized for model: ${model.labelKey}`);

        // Optionally initialize VAD context
        let vad: any = null;
        if (options?.initVad) {
          console.log('Initializing VAD context...');
          try {
            vad = await initWhisperVad({
              filePath: modelPath,
            });
            setVadContext(vad);
            console.log('VAD context initialized successfully');
          }
          catch (vadError) {
            console.warn('VAD initialization failed:', vadError);
            // Continue without VAD - it's optional
          }
        }

        return {
          whisperContext: context,
          vadContext: options?.initVad ? vad : null,
        };
      }
      catch (error) {
        console.error('Model initialization error:', error);
        throw error;
      }
      finally {
        setIsInitializingModel(false);
      }
    },
    [downloadModel],
  );

  const resetWhisperContext = useCallback(() => {
    setWhisperContext(null);
    setVadContext(null);
    setCurrentModelId(null);
    storage.delete(SELECTED_MODEL_KEY);
    console.log('Whisper contexts reset');
  }, []);

  /**
   * Clears in-memory context state without deleting the saved model preference.
   * Use when the native context is stuck (e.g. stop() timed out) — preserves the
   * storage key so the model auto-reinits on next app mount. The user can re-select
   * the same model from the bottom sheet to get a fresh native context immediately.
   */
  const softResetWhisperContext = useCallback(() => {
    setWhisperContext(null);
    setVadContext(null);
    console.log('Whisper context soft-reset (model preference preserved)');
  }, []);

  const getModelById = useCallback((modelId: string) => {
    return WHISPER_MODELS.find(m => m.id === modelId);
  }, []);

  const getCurrentModel = useCallback(() => {
    return currentModelId ? getModelById(currentModelId) : null;
  }, [currentModelId, getModelById]);

  const isModelDownloaded = useCallback(
    (modelId: string) => {
      return modelFiles[modelId] !== undefined;
    },
    [modelFiles],
  );

  const getDownloadProgress = useCallback(
    (modelId: string) => {
      return downloadProgress[modelId] || 0;
    },
    [downloadProgress],
  );

  const deleteModel = useCallback(
    async (modelId: string) => {
      const fileInfo = modelFiles[modelId];
      if (!fileInfo) {
        console.warn(`Attempted to delete non-downloaded model: ${modelId}`);
        return;
      }

      try {
        const file = new File(fileInfo.path);
        const info = file.info();
        if (info.exists) {
          file.delete();
          console.log(`Deleted model file at ${fileInfo.path}`);
        }
      }
      catch (error) {
        console.error(`Failed to delete model ${modelId}:`, error);
        throw error;
      }

      setModelFiles((prev) => {
        const next = { ...prev };
        delete next[modelId];
        return next;
      });
      setDownloadProgress((prev) => {
        const next = { ...prev };
        delete next[modelId];
        return next;
      });

      if (currentModelId === modelId) {
        if (whisperContext?.release) {
          try {
            await whisperContext.release();
          }
          catch (releaseError) {
            console.warn(
              'Failed to release Whisper context during model deletion:',
              releaseError,
            );
          }
        }
        setWhisperContext(null);
        setCurrentModelId(null);
        setVadContext(null);
        storage.delete(SELECTED_MODEL_KEY);
      }
    },
    [currentModelId, modelFiles, whisperContext],
  );

  // Release native Whisper contexts on unmount (Fast Refresh, app teardown).
  // Without this, the native C++ context outlives the JS side and causes:
  //   TurboModuleManager: Timed out waiting for modules to be invalidated
  useEffect(() => {
    return () => {
      whisperContextRef.current?.release?.().catch(() => {});
      vadContextRef.current?.release?.().catch(() => {});
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadExistingModels = async () => {
      try {
        const directory = await getModelDirectory();
        const entries = await Promise.all(
          WHISPER_MODELS.map(async (model) => {
            const file = new File(directory, model.filename);
            try {
              const fileInfo = file.info();
              if (!fileInfo.exists)
                return null;

              return {
                id: model.id,
                info: {
                  path: file.uri,
                  size: Number(fileInfo.size) || 0,
                },
              } as { id: string; info: ModelFileInfo };
            }
            catch (statError) {
              console.warn(
                `Failed to stat existing model file ${model.id}:`,
                statError,
              );
              return {
                id: model.id,
                info: {
                  path: file.uri,
                  size: 0,
                },
              };
            }
          }),
        );

        if (!isMounted)
          return;

        const fileMap: Record<string, ModelFileInfo> = {};
        entries.forEach((entry) => {
          if (entry) {
            fileMap[entry.id] = entry.info;
          }
        });

        if (Object.keys(fileMap).length > 0) {
          setModelFiles(prev => ({ ...prev, ...fileMap }));
        }

        const saved = storage.getString(SELECTED_MODEL_KEY);
        if (saved && isMounted) {
          setCurrentModelId(saved);
        }
      }
      catch (error) {
        console.warn('Failed to load existing Whisper models:', error);
      }
    };

    loadExistingModels();

    return () => {
      isMounted = false;
    };
  }, [getModelDirectory]);

  return {
    // State
    modelFiles,
    downloadProgress,
    isDownloading,
    isInitializingModel,
    whisperContext,
    vadContext,
    currentModelId,

    // Actions
    downloadModel,
    initializeWhisperModel,
    resetWhisperContext,
    softResetWhisperContext,
    deleteModel,

    // Helpers
    getModelById,
    getCurrentModel,
    isModelDownloaded,
    getDownloadProgress,

    // Constants
    availableModels: WHISPER_MODELS,
  };
}
