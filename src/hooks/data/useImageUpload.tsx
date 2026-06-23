'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { useHarmonyActions } from '@/lib/store/useHarmonyStore';

/**
 * File-picker plumbing for image uploads.
 *
 * Owns a hidden `<input type="file" accept="image/*">` and exposes:
 *
 *   - `openPicker()` — programmatically click the input, opening the
 *     native file dialog.
 *   - `renderInput()` — JSX for the hidden input. Must be mounted once
 *     in the React tree (typically inside `HarmonyApp`); having it
 *     outside React's tree would mean unmount/remount on every render.
 *
 * On `change` the selected `File` is passed to `actions.uploadImage`,
 * then the input's `value` is cleared so re-selecting the same file
 * re-fires `onChange` (browsers de-duplicate identical selections by
 * default, which would otherwise feel broken).
 *
 * A module-level "trigger" function is also published so the global
 * `useKeyboardShortcuts` hook can fire `Ctrl+O` without needing React
 * context. The trigger is registered when the hook mounts and cleared
 * on unmount.
 */

let moduleTrigger: (() => void) | null = null;

/** Imperatively open the file picker from anywhere in the app (e.g.
 *  from the global keyboard-shortcut handler). No-op until the hook
 *  has mounted. */
export function triggerImageUpload(): void {
  moduleTrigger?.();
}

export interface ImageUploadApi {
  openPicker(): void;
  renderInput(): ReactElement;
}

export function useImageUpload(): ImageUploadApi {
  const actions = useHarmonyActions();
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  // Publish / withdraw the module-level trigger so the keyboard handler
  // can find this picker instance.
  useEffect(() => {
    moduleTrigger = openPicker;
    return () => {
      if (moduleTrigger === openPicker) moduleTrigger = null;
    };
  }, [openPicker]);

  const onChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.currentTarget.files?.[0] ?? null;
      // Reset value FIRST so a subsequent identical selection still fires.
      e.currentTarget.value = '';
      if (!file) return;
      void actions.uploadImage(file);
    },
    [actions],
  );

  const renderInput = useCallback((): ReactElement => {
    return (
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onChange}
        aria-hidden
        tabIndex={-1}
        style={{
          position: 'fixed',
          left: -9999,
          top: -9999,
          opacity: 0,
          pointerEvents: 'none',
          width: 1,
          height: 1,
        }}
      />
    );
  }, [onChange]);

  return { openPicker, renderInput };
}
