// electron.d.ts
import type { IElectronAPI } from '../../../preload/index' // Import the type from preload

declare global {
  interface Window {
    electron: IElectronAPI;
  }
}

// 为了确保这个文件被识别为一个模块，添加一个空的 export 语句
export {}; 