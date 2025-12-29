export const SHORTCUTS = {
  SUBMIT_COMMENT: ["Meta+Enter", "Ctrl+Enter"],
} as const;

export type ShortcutName = keyof typeof SHORTCUTS;
