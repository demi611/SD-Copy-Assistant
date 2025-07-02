// 文件拷贝相关类型
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
  fileProcessed?: string;
  error?: string;
  totalFiles?: number;
  processedFiles?: number;
}

export interface FileCopyResult {
  status: 'copied' | 'skipped' | 'failed';
  error?: string;
}

export interface CopyOperationResult {
  success: boolean;
  message: string;
  errors?: string[];
}

// 驱动器相关类型
export interface DriveInfo {
  path: string;
  label: string;
}

export interface EjectResult {
  success: boolean;
  message: string;
}

// 日志相关类型
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// 窗口管理类型
export interface WindowConfig {
  width: number;
  height: number;
  show: boolean;
  autoHideMenuBar: boolean;
  icon?: string;
} 