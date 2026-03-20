# Bug : Whisper "context is already capturing" & crash au rechargement

**Créé le :** 2026-03-15
**Dernière mise à jour :** 2026-03-20
**Statut :** Résolu (v2)
**Fichiers concernés :**
- `src/features/idea/use-voice-recording.ts`
- `src/lib/hooks/use-whisper-models.ts`
- `src/features/idea/idea-screen.tsx`

---

## Historique des versions

| Version | Date | Problème |
|---------|------|----------|
| v1 | 2026-03-15 | Timeout 3s → contexte zombie → "already capturing" |
| v2 | 2026-03-20 | Timeout intelligent + `release()` + cleanup unmount + crash rechargement |

---

## Symptômes (v1 → v2)

### v1 — Contexte zombie (timeout 3s)
- Deuxième enregistrement : `ERROR Realtime transcription failed: [Error: The context is already capturing]`
- Le mic ne répond plus après un premier enregistrement

### v2 — Nouveaux symptômes après le fix v1
- Large model : aucune transcription (transcription arrivait *pendant* `stop()`, jamais capturée)
- Large model : `stop()` bloque indéfiniment (modèle trop lent, >30s pour vider ses buffers)
- Crash de l'app après 2 enregistrements + rechargement
- `TurboModuleManager: Timed out waiting for modules to be invalidated` au rechargement

---

## Causes racines

### 1. `Promise.race()` timeout trop court (v1)

```typescript
// ❌ Timeout 3s abandonne stop() sans libérer le contexte natif
await Promise.race([
  stopCapture(),
  new Promise<void>(resolve => setTimeout(resolve, 3000)),
]);
```

Whisper continue de capturer en interne → "already capturing" sur le prochain enregistrement.

### 2. `finalTranscript` capturé trop tôt (v1 → v2)

```typescript
// ❌ Capturé au moment du tap Stop, avant que les callbacks subscribe arrivent
const finalTranscript = transcript;
await stopCapture();
if (finalTranscript.trim()) onRecordingComplete(); // toujours vide pour le large model
```

Le large model émet ses résultats *pendant* `stop()` (le flush peut durer 30-90s). `finalTranscript` est déjà figé → `onRecordingComplete()` n'est jamais appelé.

### 3. Pas de cleanup sur unmount dans `useVoiceRecording`

Quand l'app reload (Fast Refresh) :
1. React démonte `IdeaScreen`
2. `useWhisperModels` appelle `release()` (via son propre cleanup useEffect)
3. `useVoiceRecording` n'a pas de cleanup → `realtimeRef` a encore un handle actif
4. `release()` et `stop()` tournent en parallèle côté natif → crash

### 4. Pas de cleanup sur unmount dans `useWhisperModels` (v1)

Le contexte natif Whisper outlive le côté JS → `TurboModuleManager` timeout.

---

## Fixes appliqués (v2)

### Fix 1 — `Promise.race()` avec timeout intelligent + `release()` sur timeout

Au lieu d'abandonner `stop()` et de laisser Whisper en zombie, on appelle `release()` sur timeout pour tuer le thread natif. Cela débloque le `stop()` orphelin (qui échoue et est catchpé) et évite le zombie.

```typescript
// Timeout budget adaptatif
const STOP_TIMEOUT_SILENCE_MS = 5_000;   // rien capturé → 5s suffisent
const STOP_TIMEOUT_ACTIVE_MS = 90_000;   // large model peut prendre 60-90s

const stopTimeoutMs = transcriptRef.current.trim()
  ? STOP_TIMEOUT_ACTIVE_MS
  : STOP_TIMEOUT_SILENCE_MS;

await Promise.race([
  stopCapture().then(() => { if (timeoutId !== null) clearTimeout(timeoutId); }),
  new Promise<void>(resolve => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      whisperContext?.release?.().catch(() => {}); // ← tue le thread natif
      isCapturingRef.current = false;
      realtimeRef.current = null;
      onStopTimeout?.();
      resolve();
    }, stopTimeoutMs);
  }),
]);
```

### Fix 2 — `transcriptRef` : toujours avoir la valeur la plus récente

```typescript
const transcriptRef = useRef('');

const updateTranscript = (text: string) => {
  transcriptRef.current = text; // ref sync avec l'état
  setTranscriptState(text);
};

// Après stop(), vérifier la ref (pas le state figé au moment du tap)
setIsStopping(false);
if (transcriptRef.current.trim()) {
  onRecordingComplete(); // capture les résultats arrivés pendant stop()
}
```

### Fix 3 — Cleanup sur unmount dans `useVoiceRecording`

```typescript
useEffect(() => {
  return () => {
    // Stop la capture active avant que useWhisperModels appelle release()
    if (isCapturingRef.current) {
      const stopFn = realtimeRef.current?.stop ?? null;
      realtimeRef.current = null;
      isCapturingRef.current = false;
      stopFn?.().catch(() => {});
    }
  };
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

### Fix 4 — Cleanup sur unmount dans `useWhisperModels`

```typescript
const whisperContextRef = useRef<WhisperContext | null>(null);
const vadContextRef = useRef<any>(null);
useEffect(() => { whisperContextRef.current = whisperContext; }, [whisperContext]);
useEffect(() => { vadContextRef.current = vadContext; }, [vadContext]);

useEffect(() => {
  return () => {
    whisperContextRef.current?.release?.().catch(() => {});
    vadContextRef.current?.release?.().catch(() => {});
  };
}, []);
```

### Fix 5 — Auto-reinit après timeout (`idea-screen.tsx`)

Quand `stop()` timeout, le contexte est relâché. Sans auto-reinit, l'utilisateur doit naviguer hors de l'écran et revenir pour retrouver le modèle. Avec ce fix, le modèle est réinitialisé automatiquement.

```typescript
const handleStopTimeout = useCallback(() => {
  softResetWhisperContext(); // clear React state (pas le storage)
  const saved = currentModelIdRef.current;
  if (saved) {
    initializeWhisperModelRef.current(saved).catch(console.error);
  }
}, [softResetWhisperContext]);
```

---

## Paramètres Whisper optimaux (référence Beto)

D'après la [référence Beto](https://github.com/betomoedano/whisper-speech-recognition) :

```typescript
const options: TranscribeRealtimeOptions = {
  realtimeAudioSec: 300,
  realtimeAudioSliceSec: 10,   // 10s = bon compromis latence/qualité (vs 5s trop fragmenté, 20s trop lent)
  realtimeAudioMinSec: 2,      // évite de traiter des slices de bruit pur
  audioSessionOnStartIos: {
    category: 'PlayAndRecord',
    options: ['MixWithOthers'], // ← ne pas monopoliser la session audio
    mode: 'Default',
  },
  audioSessionOnStopIos: 'restore',
};
```

**Pourquoi `MixWithOthers` ?** Évite les conflits avec d'autres consommateurs audio (Convex, sons système). `DefaultToSpeaker` monopolise la session et peut provoquer des interruptions.

**Pourquoi `realtimeAudioSliceSec: 10` ?** Avec 5s, le large model produisait 3 mots isolés par slice. Avec 10s, il a assez de contexte pour des phrases cohérentes, tout en émettant des résultats toutes les ~10s pendant l'enregistrement.

---

## Règles à retenir

> **Ne jamais utiliser `Promise.race()` avec timeout pour stopper Whisper sans appeler `release()`.**
> Si le timeout est atteint, appeler `whisperContext.release()` pour tuer le thread natif avant de continuer.

> **Ne jamais capturer `transcript` (state React) au moment du tap Stop.**
> Utiliser un `useRef` syncronisé (`transcriptRef`) pour capturer les résultats qui arrivent *pendant* `stop()`.

> **Toujours ajouter un cleanup useEffect dans les hooks qui touchent au contexte natif Whisper.**
> React Fast Refresh et la navigation peuvent démonter les composants sans que `stop()` ou `release()` aient été appelés.

---

## Références

- `src/features/idea/use-voice-recording.ts` — hook principal de capture vocale
- `src/lib/hooks/use-whisper-models.ts` — initialisation et cycle de vie du modèle Whisper
- `src/features/idea/idea-screen.tsx` — coordinateur, gestion du timeout
- [whisper.rn](https://github.com/mybigday/whisper.rn) — lib React Native Whisper
- [Référence Beto](https://github.com/betomoedano/whisper-speech-recognition) — implémentation de référence pour les options audio iOS
