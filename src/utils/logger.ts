/**
 * Production-safe logger.
 *
 * Hanya mencetak log di __DEV__ mode (saat development).
 * Di production build, semua output diredam agar tidak membocorkan
 * informasi sensitif (Device ID, error stack traces, dsb.) melalui
 * `adb logcat` atau debugger eksternal.
 */
export const logger = {
  log: (...args: unknown[]) => {
    if (__DEV__) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (__DEV__) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    if (__DEV__) console.error(...args);
  },
};
