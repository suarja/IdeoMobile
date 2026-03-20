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
  /**
   * Called when stop() exceeds the timeout budget (large model processing a big buffer).
   * The whisper context has been released — caller must clear it from state so the user
   * can re-initialize a fresh native context from the model selector.
   */
  onStopTimeout?: () => void;
};

// eslint-disable-next-line max-lines-per-function
export function useVoiceRecording({ whisperContext, onRecordingComplete, onStopTimeout }: Options): VoiceRecording {
  const [isListening, setIsListening] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [transcript, setTranscriptState] = useState('');

  // Ref always holds the latest transcript value — including results that arrive during stop().
  // This is critical for slow models (large) that emit results after stop() is called.
  const transcriptRef = useRef('');

  // stop handle from whisperContext.transcribeRealtime — null when not capturing
  const realtimeRef = useRef<{ stop: () => Promise<void> } | null>(null);
  // Tracks whether Whisper has actually started capture (set true after transcribeRealtime resolves)
  const isCapturingRef = useRef(false);
  const transcriptScrollRef = useRef<ScrollView>(null);

  // Sync both state (for rendering) and ref (for stop handler) together
  const updateTranscript = (text: string) => {
    transcriptRef.current = text;
    setTranscriptState(text);
  };

  useEffect(() => {
    if (transcript && isListening) {
      transcriptScrollRef.current?.scrollToEnd({ animated: true });
    }
  }, [transcript, isListening]);

  // Stop any active capture on unmount (Fast Refresh, screen unmount).
  // Without this, a live realtimeRef + whisperContext.release() from useWhisperModels
  // run concurrently on reload, which crashes the native side.
  useEffect(() => {
    return () => {
      if (isCapturingRef.current) {
        const stopFn = realtimeRef.current?.stop ?? null;
        realtimeRef.current = null;
        isCapturingRef.current = false;
        stopFn?.().catch(() => {});
      }
    };
  }, []);

  const ensurePermission = async (): Promise<boolean> => {
    const status = await getRecordingPermissionsAsync();
    if (status.granted)
      return true;
    if (!status.canAskAgain)
      return false;
    const result = await requestRecordingPermissionsAsync();
    return result.granted;
  };

  const clearTranscript = () => updateTranscript('');

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
      setIsListening(false);
      setIsStopping(true);

      // Timeout budget: 5s when silent (nothing recorded), 90s when audio was captured.
      // Large models may take 60-90s to flush their buffer — we give them time.
      // On timeout we call whisperContext.release() to kill the native context, which
      // unblocks the orphaned stop() call and avoids a zombie (unlike the old approach
      // that just abandoned stop() without releasing the context).
      // See docs/bugs/whisper-realtime-capturing-bug.md for the zombie description.
      const STOP_TIMEOUT_SILENCE_MS = 5_000;
      const STOP_TIMEOUT_ACTIVE_MS = 90_000;
      const stopTimeoutMs = transcriptRef.current.trim()
        ? STOP_TIMEOUT_ACTIVE_MS
        : STOP_TIMEOUT_SILENCE_MS;

      let timedOut = false;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      await Promise.race([
        stopCapture().then(() => {
          if (timeoutId !== null)
            clearTimeout(timeoutId);
        }),
        new Promise<void>((resolve) => {
          timeoutId = setTimeout(() => {
            timedOut = true;
            // Release the entire native context — this is the key improvement over the
            // old approach. release() kills the native thread, preventing the zombie state
            // that blocked subsequent recordings. The orphaned stop() call will error out
            // and be caught by stopCapture's try/catch.
            whisperContext?.release?.().catch(() => {});
            isCapturingRef.current = false;
            realtimeRef.current = null;
            onStopTimeout?.();
            resolve();
          }, stopTimeoutMs);
        }),
      ]);

      if (timedOut) {
        console.warn(`useVoiceRecording: stop() timed out after ${stopTimeoutMs}ms — context released, caller notified`);
      }

      setIsStopping(false);
      // Use transcriptRef instead of a snapshot captured at stop time.
      // The ref includes any results that arrived *during* stop() processing — critical for
      // slow models where the first transcription result arrives well after stop() is called.
      if (transcriptRef.current.trim()) {
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

    updateTranscript('');
    setIsListening(true);

    const options: TranscribeRealtimeOptions = {
      realtimeAudioSec: 300,
      // 20s slices match Beto's reference impl and give Whisper a large enough context
      // window to produce coherent sentences (5s was producing isolated words on large model).
      // The large model still emits progressive results every ~20s during recording.
      // The 90s timeout is the escape valve if the backlog grows too large to drain.
      realtimeAudioSliceSec: 10,
      realtimeAudioMinSec: 2,
      audioSessionOnStartIos: {
        category: 'PlayAndRecord' as any,
        // MixWithOthers: don't monopolize the audio session — avoids conflicts with other
        // audio consumers (e.g. Convex, system sounds) and matches Beto's reference impl.
        options: ['MixWithOthers'] as any,
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
          updateTranscript(event.data.result.trim());
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
    setTranscript: updateTranscript,
  };
}
