/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AJO_NETWORK?: string
  readonly VITE_AJO_CIRCLE_ADDRESS: string
  readonly VITE_AJO_DEPLOY_BLOCK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
