# Bug : Whisper "context is already capturing"

**Créé le :** 2026-03-15 02:53
**Dernière mise à jour :** 2026-03-15 02:53
**Statut :** Résolu
**Fichier concerné :** `src/features/idea/use-voice-recording.ts`

---

## Symptômes

- Après avoir arrêté un enregistrement, le bouton mic est inactif ou relancer l'enregistrement échoue silencieusement.
- La console affiche :
  ```
  ERROR  Realtime transcription failed: [Error: The context is already capturing]
  code: 'whisper_error'
  ```
- Parfois : pas de transcription en temps réel du tout sur le deuxième essai.
- Le deuxième appui sur le mic ne produit rien.

---

## Cause racine

Le code utilisait `Promise.race()` pour stopper Whisper avec un timeout forcé de 3 secondes :

```typescript
// ❌ Code fautif
await Promise.race([
  stopPromise,
  new Promise<void>(resolve => setTimeout(resolve, 3000)),
]);
```

**Ce qui se passait :**

1. L'utilisateur appuie sur "Stop".
2. `stop()` est appelé sur le contexte Whisper — mais Whisper peut prendre plus de 3s pour libérer le contexte audio (flush des buffers, fin de la session iOS).
3. Le `setTimeout(3000)` gagne la race → le code continue et marque `isStopping = false`.
4. **Whisper capture encore en interne**, même si l'UI considère que c'est terminé.
5. L'utilisateur appuie à nouveau sur le mic → `transcribeRealtime()` est appelé → Whisper rejette avec "context is already capturing".

Le `realtimeRef` était mis à `null` immédiatement, donc il n'y avait plus aucun moyen d'appeler `stop()` sur la session qui trainait.

---

## Fix appliqué

### 1. Suppression du timeout forcé

`stopCapture()` attend maintenant la résolution **réelle** de `stop()` :

```typescript
const stopCapture = async () => {
  const stopFn = realtimeRef.current?.stop ?? null;
  realtimeRef.current = null;
  if (stopFn) {
    try {
      await stopFn(); // on attend que Whisper libère vraiment le contexte
    } catch {
      // ignorer les erreurs de stop — le contexte peut déjà être arrêté
    }
  }
  isCapturingRef.current = false;
};
```

### 2. Ref de tracking de l'état interne Whisper

`isCapturingRef` (un `useRef<boolean>`) suit l'état **réel** de Whisper, séparé du state React :

- Mis à `true` uniquement **après** que `transcribeRealtime()` résout (Whisper confirme qu'il capture).
- Mis à `false` dès que `stopCapture()` est appelé.

### 3. Guard au démarrage

Si `isCapturingRef.current` est encore `true` quand l'utilisateur appuie sur le mic (cas d'erreur précédente), on stoppe d'abord avant de démarrer :

```typescript
if (isCapturingRef.current) {
  await stopCapture(); // purge la session zombie avant de relancer
}
```

---

## Règle à retenir

> **Ne jamais utiliser `Promise.race()` avec un timeout pour stopper Whisper.**
> Whisper a besoin de flush ses buffers audio et de libérer la session iOS correctement. Un timeout forcé laisse le contexte dans un état zombie qui bloque toute nouvelle capture.

Si un vrai timeout de sécurité est nécessaire à l'avenir (ex. : stop() bloqué indéfiniment), il faut le gérer **sans laisser Whisper en état zombie** — par exemple en réinitialisant le modèle entier via `useWhisperModels`.

---

## Références

- `src/features/idea/use-voice-recording.ts` — hook principal de capture vocale
- `src/lib/hooks/use-whisper-models.ts` — initialisation et cycle de vie du modèle Whisper
- [whisper.rn issues](https://github.com/mybigday/whisper.rn/issues) — issues connues sur la gestion du contexte
