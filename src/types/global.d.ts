export {};

declare global {
  interface Window {
    abortControllers?: { [key: string]: AbortController };
  }
}
