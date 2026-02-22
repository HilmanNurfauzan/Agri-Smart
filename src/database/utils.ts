/**
 * Shared utility functions for database repositories.
 */

/**
 * Generate a compact, locally-unique ID using timestamp + random suffix.
 * Format: `<base36-timestamp>-<7-char-random>`
 */
export function generateId(): string {
  return (
    Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 9)
  );
}
