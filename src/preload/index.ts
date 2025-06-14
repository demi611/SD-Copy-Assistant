import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

// 在 preload 脚本中，我们只暴露真正需要从渲染进程调用的API
// 避免直接暴露整个 ipcRenderer 或其他 Node.js/Electron 模块

console.log('Preload script started.');

export interface FileCopyRequest {
  sdCardDir: string;
  imageTargetDir: string;
  videoTargetDir: string;
  activityName: string;
  selectedDates: string[];
  separateRawJpg: boolean;
  copyImages: boolean;
  copyVideos: boolean;
}

export interface FileCopyProgress {
  percentage: number;
  message: string;
  fileProcessed?: string; // 当前处理的文件名
  error?: string; // 如果当前文件处理失败的错误信息
  totalFiles?: number; // 总文件数
  processedFiles?: number; // 已处理文件数（包括已拷贝和已跳过的）
}

const electronApi = {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  openExternalLink: (url: string) => ipcRenderer.send('open-external-link', url),
  // 新增：用于从渲染器发送日志消息到主进程
  logMessage: (level: string, message: string, ...args: any[]) => {
    ipcRenderer.send('log-message', level, message, ...args)
  },
  // 新增文件操作相关 IPC 接口
  scanMediaFileDates: (dirPath: string): Promise<string[]> =>
    ipcRenderer.invoke('scan-media-file-dates', dirPath),
  startFileCopy: (request: FileCopyRequest): Promise<{ success: boolean; message: string; errors?: string[] }> =>
    ipcRenderer.invoke('start-file-copy', request),
  // 用于接收拷贝进度的事件
  onFileCopyProgress: (callback: (progress: FileCopyProgress) => void) => {
    const handler = (_event: IpcRendererEvent, progress: FileCopyProgress) => callback(progress);
    ipcRenderer.on('file-copy-progress', handler);
    // 返回一个取消订阅的函数
    return () => {
      ipcRenderer.removeListener('file-copy-progress', handler);
    };
  },
  // 新增：获取可移动驱动器列表
  getRemovableDrives: (): Promise<Array<{path: string, label: string}>> => ipcRenderer.invoke('get-removable-drives'),
  // 获取系统默认的图片和视频目录
  getDefaultDirs: (): Promise<{ pictures: string; videos: string }> =>
    ipcRenderer.invoke('get-default-dirs'),
  // 推出SD卡
  ejectSDCard: (sdCardPath: string): Promise<{ success: boolean; message: string }> =>
    ipcRenderer.invoke('eject-sd-card', sdCardPath),
  // SD卡事件监听
  onSDCardInserted: (callback: (drive: {path: string, label: string}) => void) => {
    const handler = (_event: IpcRendererEvent, drive: {path: string, label: string}) => callback(drive);
    ipcRenderer.on('sd-card-inserted', handler);
    return () => {
      ipcRenderer.removeListener('sd-card-inserted', handler);
    };
  },
  onSDCardRemoved: (callback: (removedPaths: string[]) => void) => {
    const handler = (_event: IpcRendererEvent, removedPaths: string[]) => callback(removedPaths);
    ipcRenderer.on('sd-card-removed', handler);
    return () => {
      ipcRenderer.removeListener('sd-card-removed', handler);
    };
  },
}

// 仅当 contextIsolation 为 true 时才使用 contextBridge
// 这是推荐的安全实践
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronApi)
    console.log('Electron API exposed successfully via contextBridge.');
  } catch (error) {
    console.error('Failed to expose electron API via contextBridge:', error)
  }
} else {
  // 如果 contextIsolation 被禁用（不推荐），则直接挂载到 window 对象
  // @ts-ignore 类型定义将在 d.ts 文件中处理
  window.electron = electronApi
  console.warn('Context Isolation is disabled. For security reasons, it is highly recommended to enable it.')
}

// 类型定义也需要更新
export interface IElectronAPI {
  selectDirectory: () => Promise<string | null>
  openExternalLink: (url: string) => void
  logMessage: (level: string, message: string, ...args: any[]) => void
  scanMediaFileDates: (dirPath: string) => Promise<string[]>
  startFileCopy: (request: FileCopyRequest) => Promise<{ success: boolean, message: string, errors?: string[] }>
  onFileCopyProgress: (callback: (progress: FileCopyProgress) => void) => () => void
  getRemovableDrives: () => Promise<Array<{path: string, label: string}>>
  getDefaultDirs: () => Promise<{ pictures: string; videos: string }>
  ejectSDCard: (sdCardPath: string) => Promise<{ success: boolean; message: string }>
  onSDCardInserted: (callback: (drive: {path: string, label: string}) => void) => () => void
  onSDCardRemoved: (callback: (removedPaths: string[]) => void) => () => void
} 