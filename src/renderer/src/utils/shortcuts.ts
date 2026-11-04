const IS_MAC = navigator.platform.toLowerCase().includes('mac');

export interface ParsedShortcut {
  key: string;
  mod: boolean;
  shift: boolean;
  alt: boolean;
}

function normalizeKey(raw: string): string {
  const value = raw.toLowerCase();
  if (value === 'return') return 'enter';
  if (value === 'esc') return 'escape';
  if (value === ' ') return 'space';
  if (value === 'up' || value === 'down' || value === 'left' || value === 'right') return `arrow${value}`;
  return value;
}

export function parseShortcut(value: string): ParsedShortcut {
  const parts = value.split('+').map((part) => part.trim()).filter(Boolean);
  const parsed: ParsedShortcut = { key: '', mod: false, shift: false, alt: false };
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower === 'cmdorctrl' || lower === 'mod' || lower === 'cmd' || lower === 'ctrl' || lower === 'meta') parsed.mod = true;
    else if (lower === 'shift') parsed.shift = true;
    else if (lower === 'alt' || lower === 'option') parsed.alt = true;
    else parsed.key = normalizeKey(part);
  }
  return parsed;
}

export function matchesShortcut(event: KeyboardEvent, value: string): boolean {
  const parsed = parseShortcut(value);
  if (!parsed.key) return false;
  const modPressed = IS_MAC ? event.metaKey : event.ctrlKey;
  if (modPressed !== parsed.mod) return false;
  if (event.shiftKey !== parsed.shift) return false;
  if (event.altKey !== parsed.alt) return false;
  return normalizeKey(event.key) === parsed.key;
}

export function formatShortcut(value: string): string {
  if (IS_MAC) {
    return value
      .replace(/CmdOrCtrl/gi, '⌘')
      .replace(/Shift/gi, '⇧')
      .replace(/Alt/gi, '⌥')
      .replace(/Enter/gi, '↵')
      .replace(/\+/g, '');
  }
  return value.replace(/CmdOrCtrl/gi, 'Ctrl').replace(/Enter/gi, 'Enter');
}
