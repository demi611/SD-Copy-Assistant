/// <reference types="vite/client" />

import type { IElectronAPI } from './preload'

declare global {
  interface Window {
    electron: IElectronAPI
  }
}
