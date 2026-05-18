// ES Module 兼容的 __dirname 和 __filename
import { fileURLToPath } from 'node:url'
import { dirname } from 'path'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

import { app, BrowserWindow, dialog, ipcMain, nativeImage, shell } from 'electron'
import path from 'path'
import os from 'os'
import fs from 'fs-extra'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { cancelMediaCopy, copyMediaFiles } from './services/copyService'
import { DriveMonitor, getRemovableDrives } from './services/driveService'
import { ejectSDCard } from './services/ejectService'
import { scanMediaFileDates } from './services/mediaService'
import type { FileCopyProgress, FileCopyRequest, LogLevel } from './types'
import { getLogDir, initializeLogging, writeToLog } from './utils/logger'

electronApp.setAppUserModelId('com.photo-copy-app')

let mainWindow: BrowserWindow | null = null
let isQuitting = false

const driveMonitor = new DriveMonitor(() => mainWindow)

function resolveIconPath(): string | undefined {
  let iconPath: string | undefined = path.join(__dirname, '../build/icon.png')

  if (!fs.existsSync(iconPath)) {
    if (process.platform === 'darwin') {
      iconPath = path.join(__dirname, '../build/icon.icns')
    } else if (process.platform === 'win32') {
      iconPath = path.join(__dirname, '../build/icon.ico')
    } else {
      iconPath = path.join(__dirname, '../build/icon.png')
    }
  }

  if (iconPath && fs.existsSync(iconPath)) {
    writeToLog('info', `使用自定义图标: ${iconPath}`)
    return iconPath
  }

  writeToLog('warn', `图标文件不存在: ${iconPath}`)
  return undefined
}

function setDockIcon(): void {
  if (process.platform !== 'darwin' || !mainWindow) {
    return
  }

  let iconPath = path.join(__dirname, '../build/icon.png')
  if (!fs.existsSync(iconPath)) {
    iconPath = path.join(__dirname, '../build/icon.icns')
  }

  if (!fs.existsSync(iconPath)) {
    return
  }

  try {
    const icon = nativeImage.createFromPath(iconPath)
    mainWindow.setIcon(icon)
    app.dock?.setIcon(icon)
    writeToLog('info', `已设置Dock图标: ${iconPath}, 尺寸: ${JSON.stringify(icon.getSize())}`)
  } catch (iconError: any) {
    writeToLog('error', '设置图标失败:', iconError.message)
  }
}

function createWindowInternal(): void {
  if (isQuitting) {
    return
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    mainWindow.focus()
    return
  }

  try {
    const iconPath = resolveIconPath()
    mainWindow = new BrowserWindow({
      width: 500,
      height: 670,
      // minHeight: 720,
      show: false,
      autoHideMenuBar: true,
      ...(iconPath ? { icon: iconPath } : {}),
      webPreferences: {
        preload: path.join(__dirname, 'preload.mjs'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
        devTools: false
      }
    })
  } catch (e: any) {
    writeToLog('error', '创建 BrowserWindow 实例时发生异常:', e.message, e.stack)
    return
  }

  handleWindowClose()
  registerWindowLogging(mainWindow)

  mainWindow.on('ready-to-show', () => {
    try {
      mainWindow!.show()
      writeToLog('info', '主窗口已显示')
      setDockIcon()
    } catch (e: any) {
      writeToLog('error', 'ready-to-show 时显示窗口发生异常:', e.message, e.stack)
    }
  })

  if (is.dev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    writeToLog('info', `开发环境，加载 URL: ${process.env.VITE_DEV_SERVER_URL}`)
  } else {
    const htmlPath = path.join(__dirname, '../dist/index.html')
    mainWindow.loadFile(htmlPath)
    writeToLog('info', `生产环境，加载文件: ${htmlPath}`)
  }

  optimizer.watchWindowShortcuts(mainWindow)
  writeToLog('info', '已设置 electron-toolkit 窗口快捷键优化器')
}

function registerWindowLogging(window: BrowserWindow): void {
  window.on('minimize', () => writeToLog('info', '主窗口已最小化'))
  window.on('restore', () => writeToLog('info', '主窗口已恢复'))
  window.on('blur', () => writeToLog('info', '主窗口失去焦点'))
  window.on('focus', () => writeToLog('info', '主窗口获得焦点'))
}

function handleWindowClose(): void {
  if (!mainWindow) {
    return
  }

  mainWindow.on('closed', () => {
    mainWindow = null
    if (!isQuitting && process.platform === 'darwin') {
      writeToLog('info', 'macOS: 窗口已关闭但应用继续运行')
    }
  })
}

function registerIpcHandlers(): void {
  ipcMain.handle('get-removable-drives', async () => {
    writeToLog('info', 'IPC: 收到获取可移动驱动器请求')
    try {
      const drives = await getRemovableDrives()
      writeToLog('info', `检测到可移动驱动器: ${drives.map(drive => drive.path).join(', ')}`)
      return drives.map(drive => ({ path: drive.path, label: drive.label }))
    } catch (error) {
      writeToLog('error', '获取可移动驱动器失败:', error)
      return []
    }
  })

  ipcMain.handle('get-default-dirs', async () => {
    writeToLog('info', 'IPC: 收到获取默认目录请求')
    try {
      const homeDir = os.homedir()
      return {
        pictures: path.join(homeDir, 'Pictures'),
        videos: path.join(homeDir, 'Movies')
      }
    } catch (error) {
      writeToLog('error', '获取默认目录失败:', error)
      return { pictures: '', videos: '' }
    }
  })

  ipcMain.handle('scan-media-file-dates', async (_event, dirPath: string) => {
    writeToLog('info', 'IPC: 收到扫描媒体文件日期请求', dirPath)
    try {
      return await scanMediaFileDates(dirPath)
    } catch (error: any) {
      writeToLog('error', '扫描媒体文件日期失败:', error.message)
      throw error
    }
  })

  ipcMain.handle('select-directory', async () => {
    writeToLog('info', 'IPC: 收到选择目录请求')
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory']
    })

    if (!canceled) {
      writeToLog('info', `用户选择了目录: ${filePaths[0]}`)
      return filePaths[0]
    }

    writeToLog('info', '用户取消了目录选择')
    return null
  })

  ipcMain.on('log-message', (_event, level: string, message: string, ...args: any[]) => {
    writeToLog(level as LogLevel, `[渲染进程] ${message}`, ...args)
  })

  ipcMain.on('open-external-link', (_event, url: string) => {
    writeToLog('info', '打开外部链接:', url)
    shell.openExternal(url)
  })

  ipcMain.handle('open-log-dir', async () => {
    const logDir = getLogDir()
    writeToLog('info', '打开日志目录')
    const errorMessage = await shell.openPath(logDir)
    if (errorMessage) {
      throw new Error(errorMessage)
    }

    return { success: true }
  })

  ipcMain.handle('eject-sd-card', async (_event, sdCardPath: string) => {
    writeToLog('info', 'IPC: 收到推出SD卡请求', sdCardPath)
    try {
      return await ejectSDCard(sdCardPath)
    } catch (error: any) {
      writeToLog('error', '推出SD卡失败:', error.message)
      throw error
    }
  })

  ipcMain.handle('start-file-copy', async (event, request: FileCopyRequest) => {
    writeToLog('info', 'IPC: 收到文件拷贝请求', {
      copyImages: request.copyImages,
      copyVideos: request.copyVideos,
      selectedDatesCount: request.selectedDates.length,
      separateRawJpg: request.separateRawJpg,
      verificationMode: request.verificationMode || 'quick'
    })
    return copyMediaFiles(request, (progress: FileCopyProgress) => {
      event.sender.send('file-copy-progress', progress)
    })
  })

  ipcMain.handle('cancel-file-copy', async () => {
    writeToLog('info', 'IPC: 收到取消文件拷贝请求')
    cancelMediaCopy()
    return { success: true }
  })
}

app.whenReady().then(() => {
  initializeLogging()
  createWindowInternal()
  registerIpcHandlers()
  driveMonitor.start()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindowInternal()
    }
  })
})

app.on('before-quit', () => {
  writeToLog('info', '应用即将退出')
  isQuitting = true
  driveMonitor.stop()
})

app.on('window-all-closed', () => {
  writeToLog('info', '所有窗口已关闭')
  if (process.platform !== 'darwin' || isQuitting) {
    app.quit()
  }
})

app.on('activate', () => {
  if (!isQuitting) {
    createWindowInternal()
  }
})

process.on('uncaughtException', error => {
  writeToLog('error', '主进程发生未捕获的异常:', error.message, error.stack)
})
