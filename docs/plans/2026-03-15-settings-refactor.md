# Settings Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Polish the Settings screen by adding item separators, tightening icon/text spacing, switching to `expo-status-bar`, and converting the inline Whisper model list into a Vintage Metal–styled bottom sheet.

**Architecture:** Four self-contained changes to existing files + one new component (`whisper-model-item.tsx`). Each change is isolated and can be committed independently. No new dependencies needed — `expo-status-bar` is already installed.

**Tech Stack:** React Native (Expo SDK 54), NativeWind/Tailwind, `@gorhom/bottom-sheet`, `expo-status-bar`, Vintage Metal brand palette (`src/components/ui/colors.js`).

---

### Task 1: Reduce icon/text gap in `SettingsItem`

**Files:**
- Modify: `src/features/settings/components/settings-item.tsx:23`

**Step 1: Apply the fix**

In `settings-item.tsx`, change the icon wrapper padding from `pr-2` (8px) to `pr-1.5` (6px):

```tsx
// Before
{icon && <View className="pr-2">{icon}</View>}

// After
{icon && <View className="pr-1.5">{icon}</View>}
```

**Step 2: Visual check**

Run `pnpm ios` and navigate to the Settings tab. Confirm the icon and label text are slightly closer — the gap should feel snug but not cramped.

**Step 3: Commit**

```bash
git add src/features/settings/components/settings-item.tsx
git commit -m "fix: reduce icon/text gap in SettingsItem"
```

---

### Task 2: Add separators between items in `SettingsContainer`

**Files:**
- Modify: `src/features/settings/components/settings-container.tsx`

**Step 1: Update SettingsContainer to inject separators**

Replace the `{children}` render with a mapped version that adds a thin divider between every child:

```tsx
import type { TxKeyPath } from '@/lib/i18n';

import * as React from 'react';
import { colors, Text, View } from '@/components/ui';

type Props = {
  children: React.ReactNode;
  title?: TxKeyPath;
};

export function SettingsContainer({ children, title }: Props) {
  const childArray = React.Children.toArray(children);

  return (
    <>
      {title && (
        <Text
          className="pt-4 pb-2 text-lg font-semibold"
          style={{ color: colors.brand.dark }}
          tx={title}
        />
      )}
      <View
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: colors.brand.card,
          borderWidth: 1,
          borderColor: colors.brand.border,
        }}
      >
        {childArray.map((child, index) => (
          <React.Fragment key={index}>
            {child}
            {index < childArray.length - 1 && (
              <View
                style={{
                  height: 1,
                  marginHorizontal: 16,
                  backgroundColor: 'rgba(0,0,0,0.06)',
                }}
              />
            )}
          </React.Fragment>
        ))}
      </View>
    </>
  );
}
```

Note: `overflow-hidden` is added so the top/bottom children respect the `rounded-xl` corners.

**Step 2: Visual check**

Navigate to Settings. Every section (General, About, Support Us, Links, Logout) should now show thin dividers between items, consistent with the existing Voice Model section style.

**Step 3: Commit**

```bash
git add src/features/settings/components/settings-container.tsx
git commit -m "feat: add automatic item separators in SettingsContainer"
```

---

### Task 3: Switch `FocusAwareStatusBar` to `expo-status-bar`

**Files:**
- Modify: `src/components/ui/focus-aware-status-bar.tsx`

**Step 1: Rewrite the component**

`expo-status-bar` is already installed (`~3.0.9`). Replace `SystemBars` from `react-native-edge-to-edge` with `StatusBar` from `expo-status-bar`:

```tsx
import { useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { Platform } from 'react-native';
import { useUniwind } from 'uniwind';

type Props = { hidden?: boolean };

export function FocusAwareStatusBar({ hidden = false }: Props) {
  const isFocused = useIsFocused();
  const { theme } = useUniwind();

  if (Platform.OS === 'web')
    return null;

  return isFocused
    ? (
        <StatusBar
          style={theme === 'light' ? 'dark' : 'light'}
          hidden={hidden}
        />
      )
    : null;
}
```

**Step 2: Visual check**

Open the app, navigate between tabs. Status bar style (dark/light icons) should remain correct on each screen. Open the language bottom sheet — confirm the status bar doesn't flicker.

**Step 3: Commit**

```bash
git add src/components/ui/focus-aware-status-bar.tsx
git commit -m "feat: switch FocusAwareStatusBar to expo-status-bar"
```

---

### Task 4: Create `WhisperModelItem` — SettingsItem + branded bottom sheet

**Files:**
- Create: `src/features/settings/components/whisper-model-item.tsx`
- Modify: `src/features/settings/settings-screen.tsx`

This replaces `WhisperModelSection` entirely. The new component shows a single `SettingsItem` row (label "Voice Model", value = active model name). Tapping opens a branded bottom sheet listing all models.

**Step 1: Create `whisper-model-item.tsx`**

```tsx
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';

import { colors, Text } from '@/components/ui';
import { Modal, useModal } from '@/components/ui/modal';
import { useWhisperModels, WHISPER_MODELS } from '@/lib/hooks/use-whisper-models';

import { SettingsItem } from './settings-item';

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
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

  const snapPoints = [`${Math.min(WHISPER_MODELS.length * 88 + 120, 600)}px`];

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
            const isBusy = isDownloading || isInitializingModel;

            return (
              <View key={model.id}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 14,
                  }}
                >
                  {/* Left: name + meta */}
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {isActive && (
                        <View
                          style={{
                            backgroundColor: colors.brand.dark,
                            borderRadius: 999,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '600',
                              color: colors.brand.bg,
                            }}
                          >
                            Active
                          </Text>
                        </View>
                      )}
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: colors.brand.dark,
                        }}
                      >
                        {model.label}
                      </Text>
                    </View>
                    <Text
                      style={{
                        marginTop: 2,
                        fontSize: 12,
                        color: colors.brand.muted,
                      }}
                    >
                      {model.capabilities.multilingual ? 'Multilingual' : 'English only'}
                      {fileInfo?.size ? `  ·  ${formatBytes(fileInfo.size)}` : ''}
                    </Text>
                    {isThisDownloading && (
                      <View
                        style={{
                          marginTop: 6,
                          height: 4,
                          borderRadius: 2,
                          overflow: 'hidden',
                          backgroundColor: colors.brand.border,
                        }}
                      >
                        <View
                          style={{
                            height: 4,
                            borderRadius: 2,
                            width: `${Math.round(progress * 100)}%`,
                            backgroundColor: colors.brand.dark,
                          }}
                        />
                      </View>
                    )}
                  </View>

                  {/* Right: actions */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
                                  <Text
                                    style={{
                                      fontSize: 14,
                                      fontWeight: '500',
                                      color: colors.brand.dark,
                                      opacity: isBusy ? 0.4 : 1,
                                    }}
                                  >
                                    Use
                                  </Text>
                                </TouchableOpacity>
                              )}
                              <TouchableOpacity
                                onPress={() => deleteModel(model.id).catch(console.error)}
                                disabled={isBusy}
                              >
                                <Text
                                  style={{
                                    fontSize: 14,
                                    fontWeight: '500',
                                    color: colors.danger[600],
                                    opacity: isBusy ? 0.4 : 1,
                                  }}
                                >
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
                              <Text
                                style={{
                                  fontSize: 14,
                                  fontWeight: '500',
                                  color: colors.brand.dark,
                                  opacity: isBusy ? 0.4 : 1,
                                }}
                              >
                                Download
                              </Text>
                            </TouchableOpacity>
                          )}
                  </View>
                </View>

                {/* Separator — not after last item */}
                {index < WHISPER_MODELS.length - 1 && (
                  <View
                    style={{
                      height: 1,
                      backgroundColor: 'rgba(0,0,0,0.06)',
                    }}
                  />
                )}
              </View>
            );
          })}
        </View>
      </Modal>
    </>
  );
}
```

**Step 2: Update `settings-screen.tsx`**

Replace `<WhisperModelSection />` with `<WhisperModelItem />` inside a `SettingsContainer`:

```tsx
// Remove this import:
import { WhisperModelSection } from './components/whisper-model-section';

// Add this import:
import { WhisperModelItem } from './components/whisper-model-item';

// Replace:
<WhisperModelSection />

// With:
<SettingsContainer title="settings.voice_model">
  <WhisperModelItem />
</SettingsContainer>
```

The `settings.voice_model` translation key already exists (previously used as the `SettingsContainer` title inside `WhisperModelSection`).

**Step 3: Visual check**

- Settings screen shows "Voice Model" row with the active model name as value and an arrow.
- Tapping opens a cream-background bottom sheet with the model list, brand-colored text, separators between items, Active badge, and Download/Use/Delete actions.

**Step 4: Commit**

```bash
git add src/features/settings/components/whisper-model-item.tsx
git add src/features/settings/settings-screen.tsx
git commit -m "feat: replace WhisperModelSection with bottom sheet modal"
```

---

### Task 5: Delete the now-unused `WhisperModelSection`

**Files:**
- Delete: `src/features/settings/components/whisper-model-section.tsx`

**Step 1: Delete the file**

```bash
rm src/features/settings/components/whisper-model-section.tsx
```

**Step 2: Run type-check to confirm no remaining imports**

```bash
pnpm type-check
```

Expected: no errors related to `whisper-model-section`.

**Step 3: Commit**

```bash
git commit -m "chore: remove WhisperModelSection (replaced by WhisperModelItem)"
```

---

## Done

All five tasks deliver:
- Consistent separators across all settings sections
- Tighter icon/text spacing
- Stable `expo-status-bar` integration
- A Vintage Metal–themed bottom sheet for model selection
