/**
 * Shared text cleaning for model output and request labels. Control
 * characters become a space instead of vanishing, so "A\nB" stays two words.
 * Uses a code-point loop: a control-char regex would trip the linter.
 */
export function replaceControlChars(value: string): string {
  let out = "";
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    out += (code >= 0x00 && code <= 0x1f) || code === 0x7f ? " " : char;
  }
  return out;
}
