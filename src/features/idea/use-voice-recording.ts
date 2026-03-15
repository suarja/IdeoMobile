import type { ScrollView } from 'react-native';
import type { TranscribeRealtimeOptions } from 'whisper.rn/index.js';
import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';

type VoiceRecording = {
  isListening: boolean;
  isStopping: boolean;
  transcript: string;
  transcriptScrollRef: React.RefObject<ScrollView | null>;
  /** Toggle mic on/off. Calls onRecordingComplete when a non-empty transcript is ready. */
  toggleListening: () => Promise<void>;
  clearTranscript: () => void;
};

type Options = {
  whisperContext: any | null;
  /** Called with the final transcript when recording stops and text is non-empty. */
  onRecordingComplete: () => void;
};

export function useVoiceRecording({ whisperContext, onRecordingComplete }: Options): VoiceRecording {
  const [isListening, setIsListening] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [transcript, setTranscript] = useState('');

  // Holds the stop handle from whisperContext.transcribeRealtime.
  // Stored in a ref (not state) to avoid re-renders on assignment.
  const realtimeRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const transcriptScrollRef = useRef<ScrollView>(null);

  // Auto-scroll to bottom during live transcription only.
  // Does not interfere with the preview scroll position.
  useEffect(() => {
    if (transcript && isListening) {
      transcriptScrollRef.current?.scrollToEnd({ animated: true });
    }
  }, [transcript, isListening]);

  const ensurePermission = async (): Promise<boolean> => {
    const status = await getRecordingPermissionsAsync();
    if (status.granted)
      return true;
    if (!status.canAskAgain)
      return false;
    const result = await requestRecordingPermissionsAsync();
    return result.granted;
  };

  const clearTranscript = () => setTranscript('');

  /**
   * Public toggle called by the FAB.
   * On stop: fires onRecordingComplete (which triggers preview) only when
   * transcript is non-empty. Does NOT clear transcript automatically —
   * the transcript must survive until the user explicitly sends or cancels.
   */
  const toggleListening = async () => {
    if (isListening) {
      const finalTranscript = transcript;
      setIsListening(false);
      setIsStopping(true);
      const stopPromise = realtimeRef.current?.stop() ?? Promise.resolve();
      realtimeRef.current = null;
      await Promise.race([
        stopPromise,
        new Promise<void>(resolve => setTimeout(resolve, 3000)),
      ]);
      setIsStopping(false);
      if (finalTranscript.trim()) {
        onRecordingComplete();
      }
      return;
    }

    if (!whisperContext)
      return;

    const hasPermission = await ensurePermission();
    if (!hasPermission)
      return;

    setTranscript('');
    setIsListening(true);

    const options: TranscribeRealtimeOptions = {
      realtimeAudioSec: 300,
      realtimeAudioSliceSec: 25,
      realtimeAudioMinSec: 1,
      audioSessionOnStartIos: {
        category: 'PlayAndRecord' as any,
        options: ['DefaultToSpeaker'] as any,
        mode: 'Default' as any,
      },
      audioSessionOnStopIos: 'restore',
    };

    try {
      const { stop, subscribe } = await whisperContext.transcribeRealtime(options);
      realtimeRef.current = { stop };
      subscribe((event: any) => {
        if (event.data?.result) {
          setTranscript(event.data.result.trim());
        }
      });
    }
    catch (err) {
      console.error('Realtime transcription failed:', err);
      setIsListening(false);
    }
  };

  return {
    isListening,
    isStopping,
    transcript,
    transcriptScrollRef,
    toggleListening,
    clearTranscript,
  };
}
