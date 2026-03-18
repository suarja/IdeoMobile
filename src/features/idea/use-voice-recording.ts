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
  /** Manually override the transcript text (e.g. from editable preview). */
  setTranscript: (text: string) => void;
};

type Options = {
  whisperContext: any | null;
  /** Called with the final transcript when recording stops and text is non-empty. */
  onRecordingComplete: () => void;
};

// eslint-disable-next-line max-lines-per-function
export function useVoiceRecording({ whisperContext, onRecordingComplete }: Options): VoiceRecording {
  const [isListening, setIsListening] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [transcript, setTranscript] = useState('');

  // stop handle from whisperContext.transcribeRealtime — null when not capturing
  const realtimeRef = useRef<{ stop: () => Promise<void> } | null>(null);
  // Tracks whether Whisper has actually started capture (set true after transcribeRealtime resolves)
  const isCapturingRef = useRef(false);
  const transcriptScrollRef = useRef<ScrollView>(null);

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
   * Cleanly stops Whisper capture and resets refs.
   * Awaits stop() fully — no forced timeout — to guarantee the context is free
   * before the next transcribeRealtime call.
   */
  const stopCapture = async () => {
    const stopFn = realtimeRef.current?.stop ?? null;
    realtimeRef.current = null;
    if (stopFn) {
      try {
        await stopFn();
      }
      catch {
        // ignore stop errors — context may already be stopped
      }
    }
    isCapturingRef.current = false;
  };

  const toggleListening = async () => {
    if (isListening) {
      const finalTranscript = transcript;
      setIsListening(false);
      setIsStopping(true);
      await stopCapture();
      setIsStopping(false);
      if (finalTranscript.trim()) {
        onRecordingComplete();
      }
      return;
    }

    if (!whisperContext)
      return;

    // Guard: if Whisper is still capturing from a previous session, stop it first.
    // This can happen after an unexpected error or if the context wasn't properly released.
    if (isCapturingRef.current) {
      await stopCapture();
    }

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
      // Mark as capturing only after transcribeRealtime resolves — i.e. Whisper is actually running
      isCapturingRef.current = true;
      realtimeRef.current = { stop };
      subscribe((event: any) => {
        if (event.data?.result) {
          setTranscript(event.data.result.trim());
        }
      });
    }
    catch (err) {
      console.error('Realtime transcription failed:', err);
      isCapturingRef.current = false;
      realtimeRef.current = null;
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
    setTranscript,
  };
}
