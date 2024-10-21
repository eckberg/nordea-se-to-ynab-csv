/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly APP_VERSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    fathom?: {
      trackEvent: (
        eventName: string,
        opts?: { _value?: number; _site_id?: string }
      ) => void;
    };
  }
}
