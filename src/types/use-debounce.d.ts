declare module 'use-debounce' {
  // Minimal type declaration for the hook variant we use
  export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
    callback: T,
    delay: number
  ): T;
} 