/**
 * Generates a random share token using crypto.randomUUID().
 */
export function generateShareToken(): string {
  return crypto.randomUUID();
}

/**
 * Constructs the full share link URL from a token.
 * Uses window.location.origin as the base URL.
 */
export function buildShareLink(token: string): string {
  return `${window.location.origin}/join/${token}`;
}
