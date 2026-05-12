/// <reference types="vite/client" />

// Type-only declarations for the env vars our app reads. Keeps typescript
// happy when accessing import.meta.env.* in src/lib/msal.ts.
interface ImportMetaEnv {
  readonly VITE_AZURE_TENANT_ID: string;
  readonly VITE_AZURE_CLIENT_ID: string;
  readonly VITE_API_SCOPE: string;
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
