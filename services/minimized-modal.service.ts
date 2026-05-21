"use client";

export type MinimizedModalTool = "properties" | "people" | "contracts";

export type MinimizedModalMode = "create" | "edit";

export type MinimizedModalState<TDraft = unknown> = {
  tool: MinimizedModalTool;
  href: string;
  title: string;
  subtitle: string;
  mode: MinimizedModalMode;
  draft?: TDraft;
  updatedAt: number;
};

export const MINIMIZED_MODAL_STORAGE_KEY = "contrx_minimized_modal";
export const MINIMIZED_MODAL_CHANGE_EVENT = "contrx-minimized-modal-change";
export const RESTORE_MINIMIZED_MODAL_EVENT = "contrx-restore-minimized-modal";
export const CLOSE_MINIMIZED_MODAL_EVENT = "contrx-close-minimized-modal";

export function getMinimizedModalState<TDraft = unknown>() {
  if (typeof window === "undefined") {
    return null;
  }

  const storedValue = window.localStorage.getItem(MINIMIZED_MODAL_STORAGE_KEY);

  if (!storedValue) {
    return null;
  }

  try {
    return JSON.parse(storedValue) as MinimizedModalState<TDraft>;
  } catch {
    window.localStorage.removeItem(MINIMIZED_MODAL_STORAGE_KEY);
    return null;
  }
}

export function setMinimizedModalState<TDraft = unknown>(state: MinimizedModalState<TDraft>) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(MINIMIZED_MODAL_STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent(MINIMIZED_MODAL_CHANGE_EVENT, { detail: state }));
}

export function clearMinimizedModalState(tool?: MinimizedModalTool) {
  if (typeof window === "undefined") {
    return;
  }

  const currentState = getMinimizedModalState();

  if (tool && currentState?.tool !== tool) {
    return;
  }

  window.localStorage.removeItem(MINIMIZED_MODAL_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(MINIMIZED_MODAL_CHANGE_EVENT, { detail: null }));
}

export function dispatchRestoreMinimizedModal(tool: MinimizedModalTool) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(RESTORE_MINIMIZED_MODAL_EVENT, { detail: { tool } }));
}

export function dispatchCloseMinimizedModal(tool: MinimizedModalTool) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(CLOSE_MINIMIZED_MODAL_EVENT, { detail: { tool } }));
}
