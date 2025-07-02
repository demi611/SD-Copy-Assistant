// 文件扩展名常量
export const IMAGE_EXTENSIONS = [
  '.jpg', '.jpeg', '.png',
  '.raw', '.nef', '.cr2', '.CR3',
  '.arw', '.dng', '.raf', '.orf', '.pef', '.srw', '.x3f'
].map(ext => ext.toLowerCase())

export const VIDEO_EXTENSIONS = ['.mp4', '.avi', '.mov'].map(ext => ext.toLowerCase())

export const RAW_EXTENSIONS = [
  '.raw', '.nef', '.cr2', '.CR3',
  '.arw', '.dng', '.raf', '.orf', '.pef', '.srw', '.x3f'
].map(ext => ext.toLowerCase())

export const JPG_EXTENSIONS = ['.jpg', '.jpeg'].map(ext => ext.toLowerCase())

// 应用配置常量
export const APP_CONFIG = {
  APP_ID: 'com.photocopytool.app',
  PRODUCT_NAME: '光影拷卡助手',
  WINDOW_WIDTH: 500,
  WINDOW_HEIGHT: 670,
  LOG_RETENTION_DAYS: 7
} as const

// 系统目录常量
export const SYSTEM_DIRS = {
  EXCLUDED_DIRS: ['.', '..', 'node_modules', '$RECYCLE.BIN', 'System Volume Information'],
  DEFAULT_PICTURES: 'Pictures',
  DEFAULT_VIDEOS: 'Movies'
} as const 