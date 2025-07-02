// ES Module 兼容的 __dirname 和 __filename
import { fileURLToPath } from 'node:url'
import { dirname } from 'path'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

import { app, BrowserWindow, ipcMain, dialog, shell, nativeImage } from 'electron'
import path from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// 应用程序初始化
electronApp.setAppUserModelId('com.photo-copy-app')

// 导入工具模块
import fs from 'fs-extra'
import { initializeLogging, writeToLog } from './utils/logger'
import { 
  scanMediaFiles, 
  getFileModifiedDate, 
  copyAndVerifyFile
} from './utils/fileOperations'
import { IMAGE_EXTENSIONS, VIDEO_EXTENSIONS, RAW_EXTENSIONS, JPG_EXTENSIONS } from './constants'
import type { FileCopyRequest, FileCopyProgress, LogLevel } from './types'

// 导入文件操作工具
import { createTargetDir } from './utils/fileOperations'

let mainWindow: BrowserWindow | null = null
let isQuitting = false // 添加标志来跟踪应用是否正在退出

function createWindowInternal(): void {
  // 如果应用正在退出，不要创建新窗口
  if (isQuitting) {
    return
  }

  // 如果窗口已存在且有效，则聚焦该窗口
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    mainWindow.focus()
    return
  }

  // 如果窗口不存在或已被销毁，创建新窗口
  try {
    // 设置图标路径 - 优先使用PNG格式
    let iconPath: string | undefined = path.join(__dirname, '../build/icon.png');
    
    // 如果PNG不存在，则根据平台选择其他格式
    if (!fs.existsSync(iconPath)) {
      if (process.platform === 'darwin') {
        // macOS
        iconPath = path.join(__dirname, '../build/icon.icns');
      } else if (process.platform === 'win32') {
        // Windows
        iconPath = path.join(__dirname, '../build/icon.ico');
      } else {
        // Linux
        iconPath = path.join(__dirname, '../build/icon.png');
      }
    }

    // 检查图标文件是否存在
    if (iconPath && fs.existsSync(iconPath)) {
      writeToLog('info', `使用自定义图标: ${iconPath}`);
    } else {
      writeToLog('warn', `图标文件不存在: ${iconPath}`);
      iconPath = undefined;
    }

    mainWindow = new BrowserWindow({
      width: 500,
      height: 670,
      show: false,
      autoHideMenuBar: true,
      ...(iconPath ? { icon: iconPath } : {}),
      webPreferences: {
        preload: path.join(__dirname, 'preload.mjs'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
        devTools: false,
      }
    })
  } catch (e: any) {
    writeToLog('error', '创建 BrowserWindow 实例时发生异常:', e.message, e.stack)
    return
  }

  handleWindowClose() // 添加窗口关闭事件处理

  // Event handlers for mainWindow
  mainWindow.on('minimize', () => {
    writeToLog('info', '主窗口已最小化')
  })

  mainWindow.on('restore', () => {
    writeToLog('info', '主窗口已恢复')
  })

  mainWindow.on('blur', () => {
    writeToLog('info', '主窗口失去焦点')
  })

  mainWindow.on('focus', () => {
    writeToLog('info', '主窗口获得焦点')
  })

  mainWindow.on('ready-to-show', () => {
    try {
      mainWindow!.show()
      writeToLog('info', '主窗口已显示')
      
      // 在窗口显示后再次尝试设置图标
      if (process.platform === 'darwin') {
        // 优先使用PNG格式
        let iconPath = path.join(__dirname, '../build/icon.png');
        if (!fs.existsSync(iconPath)) {
          iconPath = path.join(__dirname, '../build/icon.icns');
        }
        
        if (fs.existsSync(iconPath)) {
          try {
            const icon = nativeImage.createFromPath(iconPath);
            mainWindow!.setIcon(icon);
            app.dock?.setIcon(icon); // 设置Dock图标
            writeToLog('info', `已设置Dock图标: ${iconPath}, 尺寸: ${JSON.stringify(icon.getSize())}`);
          } catch (iconError: any) {
            writeToLog('error', '设置图标失败:', iconError.message);
          }
        }
      }
    } catch (e: any) {
      writeToLog('error', 'ready-to-show 时显示窗口发生异常:', e.message, e.stack)
    }
  })

  // Load the renderer process
  if (is.dev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    writeToLog('info', `开发环境，加载 URL: ${process.env.VITE_DEV_SERVER_URL}`)
  } else {
    const htmlPath = path.join(__dirname, '../dist/index.html')
    mainWindow.loadFile(htmlPath)
    writeToLog('info', `生产环境，加载文件: ${htmlPath}`)
  }

  // Set up electron-toolkit optimizer
  optimizer.watchWindowShortcuts(mainWindow)
  writeToLog('info', '已设置 electron-toolkit 窗口快捷键优化器')
}

// 这将在 Electron 应用程序准备就绪后创建窗口
app.whenReady().then(() => {
  // 初始化日志系统
  initializeLogging()
  
  createWindowInternal() // 在应用准备就绪后创建窗口

  // IPC 主进程处理器
  ipcMain.handle('get-removable-drives', async () => {
    writeToLog('info', 'IPC: 收到获取可移动驱动器请求');
    try {
      const drives = await getRemovableDrives();
      writeToLog('info', `检测到可移动驱动器: ${drives.map(drive => drive.path).join(', ')}`);
      return drives.map(drive => ({ path: drive.path, label: drive.label }));
    } catch (error) {
      writeToLog('error', '获取可移动驱动器失败:', error);
      return [];
    }
  });

  // 添加获取系统默认目录的处理器
  ipcMain.handle('get-default-dirs', async () => {
    writeToLog('info', 'IPC: 收到获取默认目录请求');
    try {
      const homeDir = os.homedir();
      return {
        pictures: path.join(homeDir, 'Pictures'),
        videos: path.join(homeDir, 'Movies')
      };
    } catch (error) {
      writeToLog('error', '获取默认目录失败:', error);
      return {
        pictures: '',
        videos: ''
      };
    }
  });

  ipcMain.handle('scan-media-file-dates', async (_event, dirPath: string) => {
    writeToLog('info', 'IPC: 收到扫描媒体文件日期请求', dirPath);
    try {
      const files = await scanMediaFiles(dirPath);
      const dates = new Set<string>();
      
      for (const filePath of files) {
        const date = getFileModifiedDate(filePath);
        if (date !== '00000000') {
          dates.add(date);
        }
      }
      
      const sortedDates = Array.from(dates).sort().reverse();
      writeToLog('info', `扫描完成，找到 ${sortedDates.length} 个不同日期: ${sortedDates.join(', ')}`);
      return sortedDates;
    } catch (error: any) {
      writeToLog('error', '扫描媒体文件日期失败:', error.message);
      throw error;
    }
  });

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

  // 添加日志消息处理器
  ipcMain.on('log-message', (_event, level: string, message: string, ...args: any[]) => {
    writeToLog(level as LogLevel, `[渲染进程] ${message}`, ...args);
  });

  // 添加打开外部链接处理器
  ipcMain.on('open-external-link', (_event, url: string) => {
    writeToLog('info', '打开外部链接:', url);
    shell.openExternal(url);
  });

  // 添加推出SD卡处理器
  ipcMain.handle('eject-sd-card', async (_event, sdCardPath: string) => {
    writeToLog('info', 'IPC: 收到推出SD卡请求', sdCardPath);
    try {
      const result = await ejectSDCard(sdCardPath);
      return result;
    } catch (error: any) {
      writeToLog('error', '推出SD卡失败:', error.message);
      throw error;
    }
  });

  // 启动SD卡监控
  startSDCardMonitoring();

  ipcMain.handle('start-file-copy', async (_event, request: FileCopyRequest) => {
    writeToLog('info', 'IPC: 收到文件拷贝请求', request)
    const { sdCardDir, imageTargetDir, videoTargetDir, activityName, selectedDates, separateRawJpg, copyImages, copyVideos } = request
    let totalFiles = 0
    let filesProcessed = 0
    let filesSkipped = 0
    const errors: string[] = []

    try {
      writeToLog('info', `正在扫描源目录: ${sdCardDir}`)
      const allFiles = await scanMediaFiles(sdCardDir)
      writeToLog('info', `扫描完成，发现 ${allFiles.length} 个媒体文件。`)

      // 根据选择的日期过滤文件
      let filesToCopy: string[] = []
      if (selectedDates.includes('all')) {
        filesToCopy = allFiles
        writeToLog('info', '用户选择了全部日期，将拷贝所有文件。')
      } else {
        for (const filePath of allFiles) {
          const fileDate = getFileModifiedDate(filePath)
          if (selectedDates.includes(fileDate)) {
            filesToCopy.push(filePath)
          }
        }
        writeToLog('info', `根据选择的日期 [${selectedDates.join(', ')}] 过滤后，需要拷贝 ${filesToCopy.length} 个文件。`)
      }

      // 新增：根据照片/视频开关过滤
      filesToCopy = filesToCopy.filter(filePath => {
        const ext = path.extname(filePath).toLowerCase();
        if (IMAGE_EXTENSIONS.includes(ext) && (RAW_EXTENSIONS.includes(ext) || JPG_EXTENSIONS.includes(ext) || (!RAW_EXTENSIONS.includes(ext) && !JPG_EXTENSIONS.includes(ext)))) {
          return !!copyImages;
        }
        if (VIDEO_EXTENSIONS.includes(ext)) {
          return !!copyVideos;
        }
        return false;
      });
      writeToLog('info', `根据照片/视频开关过滤后，最终需要拷贝 ${filesToCopy.length} 个文件。`);

      totalFiles = filesToCopy.length

      // 在开始拷贝前发送初始进度信息，确保前端能立即显示总文件数
      _event.sender.send('file-copy-progress', {
        percentage: 0,
        message: totalFiles > 0 ? `准备拷贝 ${totalFiles} 个文件...` : (selectedDates.includes('all') ? '没有找到要拷贝的文件。' : '在选择的日期中没有找到要拷贝的文件。'),
        fileProcessed: '',
        error: undefined,
        totalFiles: totalFiles,
        processedFiles: 0
      } as FileCopyProgress)

      if (totalFiles === 0) {
        _event.sender.send('file-copy-progress', {
          percentage: 100,
          message: selectedDates.includes('all') ? '没有找到要拷贝的文件。' : '在选择的日期中没有找到要拷贝的文件。',
          fileProcessed: '',
          error: undefined
        } as FileCopyProgress)
        return { success: false, message: selectedDates.includes('all') ? '没有找到要拷贝的文件。' : '在选择的日期中没有找到要拷贝的文件。', errors: [] }
      }

      for (const sourcePath of filesToCopy) {
        const fileDate = getFileModifiedDate(sourcePath)
        const fileExtension = path.extname(sourcePath).toLowerCase()

        let baseTargetDir: string

        if (IMAGE_EXTENSIONS.includes(fileExtension) && !RAW_EXTENSIONS.includes(fileExtension) && !JPG_EXTENSIONS.includes(fileExtension)) {
          baseTargetDir = imageTargetDir;
        } else if (JPG_EXTENSIONS.includes(fileExtension) || RAW_EXTENSIONS.includes(fileExtension)) {
          baseTargetDir = imageTargetDir;
        } else if (VIDEO_EXTENSIONS.includes(fileExtension)) {
          baseTargetDir = videoTargetDir;
        } else {
          writeToLog('warn', `未知文件类型，跳过拷贝: ${sourcePath}`);
          continue;
        }

        const targetDirForFile = await createTargetDir(baseTargetDir, fileDate, activityName)

        const result = await copyAndVerifyFile(sourcePath, targetDirForFile, separateRawJpg)
        if (result.status === 'copied') {
          filesProcessed++
          _event.sender.send('file-copy-progress', {
            percentage: Math.round(((filesProcessed + filesSkipped) / totalFiles) * 100),
            message: `正在拷贝: ${path.basename(sourcePath)}`,
            fileProcessed: sourcePath,
            error: undefined,
            totalFiles,
            processedFiles: filesProcessed + filesSkipped
          } as FileCopyProgress)
        } else if (result.status === 'skipped') {
          filesSkipped++
          _event.sender.send('file-copy-progress', {
            percentage: Math.round(((filesProcessed + filesSkipped) / totalFiles) * 100),
            message: `已跳过: ${path.basename(sourcePath)}`,
            fileProcessed: sourcePath,
            error: undefined,
            totalFiles,
            processedFiles: filesProcessed + filesSkipped
          } as FileCopyProgress)
        } else {
          errors.push(`文件拷贝失败或校验不通过: ${path.basename(sourcePath)}`)
          _event.sender.send('file-copy-progress', {
            percentage: Math.round(((filesProcessed + filesSkipped) / totalFiles) * 100),
            message: `拷贝失败: ${path.basename(sourcePath)}`,
            fileProcessed: sourcePath,
            error: result.error || `拷贝失败或校验不通过: ${path.basename(sourcePath)}`,
            totalFiles,
            processedFiles: filesProcessed + filesSkipped
          } as FileCopyProgress)
        }
      }

      let finalMessage = errors.length > 0
        ? `拷贝完成，但有 ${errors.length} 个文件拷贝失败。`
        : `所有 ${filesProcessed} 个文件拷贝成功！`

      if (filesSkipped > 0) {
        finalMessage += ` 已跳过 ${filesSkipped} 个重复文件。`;
      }

      _event.sender.send('file-copy-progress', {
        percentage: 100,
        message: finalMessage,
        fileProcessed: '',
        error: errors.length > 0 ? '部分文件拷贝失败' : undefined
      } as FileCopyProgress)

      writeToLog('info', finalMessage, '错误详情:', errors)
      return { success: errors.length === 0, message: finalMessage, errors: errors }
    } catch (error: any) {
      const errorMessage = `文件拷贝过程中的致命错误: ${error.message}`
      writeToLog('error', errorMessage, error.stack)
      _event.sender.send('file-copy-progress', {
          percentage: totalFiles > 0 ? Math.round(((filesProcessed + filesSkipped) / totalFiles) * 100) : 0,
          message: errorMessage,
          fileProcessed: '',
          error: errorMessage
        } as FileCopyProgress)
        return { success: false, message: errorMessage, errors: [errorMessage] }
      }
    })

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindowInternal()
  })
})

// 监听应用退出事件
app.on('before-quit', () => {
  writeToLog('info', '应用即将退出')
  isQuitting = true
  // 停止SD卡监控
  stopSDCardMonitoring()
})

// 监听所有窗口关闭事件
app.on('window-all-closed', () => {
  writeToLog('info', '所有窗口已关闭')
  if (process.platform !== 'darwin' || isQuitting) {
    app.quit()
  }
})

// 监听窗口关闭事件
app.on('activate', () => {
  if (!isQuitting) {
    createWindowInternal()
  }
})

// 在主窗口关闭时的处理
function handleWindowClose(): void {
  if (mainWindow) {
    mainWindow.on('closed', () => {
      mainWindow = null
      if (!isQuitting && process.platform === 'darwin') {
        writeToLog('info', 'macOS: 窗口已关闭但应用继续运行')
      }
    })
  }
}

// 移除主进程中的重复注册，这将导致冲突
process.on('uncaughtException', (error) => {
  writeToLog('error', '主进程发生未捕获的异常:', error.message, error.stack)
})

// 简单的可移动驱动器检测函数
async function getRemovableDrives(): Promise<Array<{path: string, label: string}>> {
  const drives: Array<{path: string, label: string}> = []
  
  if (process.platform === 'darwin') {
    // macOS: 检查 /Volumes 目录，但排除系统卷
    try {
      const volumesPath = '/Volumes'
      const volumes = await fs.readdir(volumesPath)
      
      // 需要排除的系统卷和常见的非SD卡卷
      const excludePatterns = [
        'Macintosh HD',
        'Macintosh HD - Data',
        'Preboot',
        'Recovery',
        'VM',
        'Data',
        '光影拷卡助手',  // 排除应用自身的DMG挂载点
        'photo-copy-app' // 排除可能的英文名称
      ]
      
      for (const volume of volumes) {
        // 跳过系统卷
        if (excludePatterns.some(pattern => volume.includes(pattern))) {
          continue
        }
        
        const volumePath = path.join(volumesPath, volume)
        try {
          const stats = await fs.stat(volumePath)
          if (stats.isDirectory()) {
            // 检查是否是DMG挂载点（通过检查是否包含.app文件）
            try {
              const entries = await fs.readdir(volumePath)
              const hasAppFile = entries.some(entry => entry.endsWith('.app'))
              if (hasAppFile) {
                writeToLog('info', `跳过DMG挂载点: ${volumePath}`)
                continue // 跳过包含.app文件的挂载点（通常是DMG）
              }
            } catch (error) {
              // 如果无法读取目录，继续处理
            }
            
            // 进一步检查是否像是可移动设备（包含典型的相机文件夹结构）
            const hasTypicalCameraFolders = await checkForCameraFolders(volumePath)
            
            drives.push({
              path: volumePath,
              label: hasTypicalCameraFolders ? `${volume} (相机存储卡)` : volume
            })
          }
        } catch (error) {
          // 忽略无法访问的卷
        }
      }
    } catch (error) {
      writeToLog('error', '检测可移动驱动器失败:', error)
    }
  } else if (process.platform === 'win32') {
    // Windows: 使用WMI查询可移动磁盘
    try {
      const { stdout } = await execAsync(
        'wmic logicaldisk where "DriveType=2" get DeviceID,VolumeName,Size /format:csv'
      )
      
      const lines = stdout.split('\n').filter(line => line.trim() && !line.startsWith('Node'))
      
      for (const line of lines) {
        const parts = line.split(',')
        if (parts.length >= 4) {
          const deviceId = parts[1]?.trim()
          const volumeName = parts[3]?.trim() || ''
          
          if (deviceId && deviceId.match(/^[A-Z]:$/)) {
            const drivePath = `${deviceId}\\`
            try {
              await fs.access(drivePath)
              
              // 进一步验证是否可以弹出（真正的可移动设备）
              const isEjectable = await checkIfDriveIsEjectable(deviceId)
              if (!isEjectable) {
                writeToLog('info', `跳过不可弹出的驱动器: ${drivePath}`)
                continue
              }
              
              const hasTypicalCameraFolders = await checkForCameraFolders(drivePath)
              const label = volumeName 
                ? (hasTypicalCameraFolders ? `${volumeName} (${deviceId} 相机存储卡)` : `${volumeName} (${deviceId})`)
                : (hasTypicalCameraFolders ? `${deviceId} (相机存储卡)` : `${deviceId} 可移动磁盘`)
              
              drives.push({
                path: drivePath,
                label: label
              })
            } catch (error) {
              // 驱动器不存在或无法访问
            }
          }
        }
      }
    } catch (error) {
      writeToLog('error', 'Windows WMI查询失败，回退到传统方法:', error)
      
      // 回退方案：检查常见驱动器字母，但增加更严格的验证
      const driveLetters = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K']
      for (const letter of driveLetters) {
        const drivePath = `${letter}:\\`
        try {
          await fs.access(drivePath)
          
          // 检查是否可以弹出
          const isEjectable = await checkIfDriveIsEjectable(`${letter}:`)
          if (!isEjectable) {
            continue
          }
          
          const hasTypicalCameraFolders = await checkForCameraFolders(drivePath)
          drives.push({
            path: drivePath,
            label: hasTypicalCameraFolders ? `${letter}: (相机存储卡)` : `${letter}: 可移动磁盘`
          })
        } catch (error) {
          // 驱动器不存在或无法访问
        }
      }
    }
  } else {
    // Linux: 检查 /media 和 /mnt 目录
    const mountPaths = ['/media', '/mnt']
    for (const mountPath of mountPaths) {
      try {
        const mounts = await fs.readdir(mountPath)
        for (const mount of mounts) {
          const fullPath = path.join(mountPath, mount)
          try {
            const stats = await fs.stat(fullPath)
            if (stats.isDirectory()) {
              const hasTypicalCameraFolders = await checkForCameraFolders(fullPath)
              drives.push({
                path: fullPath,
                label: hasTypicalCameraFolders ? `${mount} (相机存储卡)` : mount
              })
            }
          } catch (error) {
            // 忽略无法访问的挂载点
          }
        }
      } catch (error) {
        // 目录不存在
      }
    }
  }
  
  return drives
}

// 检查是否包含典型的相机文件夹结构
async function checkForCameraFolders(drivePath: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(drivePath)
    const lowerEntries = entries.map(entry => entry.toLowerCase())
    
    // 常见的相机文件夹名称
    const cameraFolders = [
      'dcim',           // 数码相机图像
      '100canon',       // Canon 相机
      '101canon',
      '100nikon',       // Nikon 相机
      '101nikon',
      '100olymp',       // Olympus 相机
      '100pentx',       // Pentax 相机
      '100sony',        // Sony 相机
      'avchd',          // AVCHD 视频格式
      'private',        // 某些相机使用的私有文件夹
      'misc'            // 杂项文件夹
    ]
    
    // 检查是否包含任何相机文件夹
    return cameraFolders.some(folder => lowerEntries.includes(folder))
  } catch (error) {
    return false
  }
}

// Windows: 检查驱动器是否可以弹出（真正的可移动设备）
async function checkIfDriveIsEjectable(deviceId: string): Promise<boolean> {
  if (process.platform !== 'win32') {
    return true // 非Windows平台默认返回true
  }
  
  try {
    // 方法1: 使用PowerShell检查驱动器类型
    const { stdout } = await execAsync(
      `powershell -Command "Get-WmiObject -Class Win32_LogicalDisk | Where-Object {$_.DeviceID -eq '${deviceId}'} | Select-Object DriveType, MediaType"`
    )
    
    // DriveType=2 表示可移动磁盘
    if (stdout.includes('DriveType') && stdout.includes('2')) {
      return true
    }
    
    // 方法2: 尝试使用Shell.Application检查是否有弹出选项
    try {
      const { stdout: shellResult } = await execAsync(
        `powershell -Command "try { $shell = New-Object -ComObject Shell.Application; $drive = $shell.Namespace(17).ParseName('${deviceId}'); $verbs = $drive.Verbs(); $hasEject = $verbs | Where-Object {$_.Name -like '*弹出*' -or $_.Name -like '*Eject*'}; if ($hasEject) { 'EJECTABLE' } else { 'NOT_EJECTABLE' } } catch { 'ERROR' }"`
      )
      
      if (shellResult.trim() === 'EJECTABLE') {
        return true
      }
    } catch (error) {
      // Shell方法失败，继续使用其他方法
    }
    
    // 方法3: 检查是否是USB设备
    try {
      const { stdout: usbResult } = await execAsync(
        `powershell -Command "Get-WmiObject -Class Win32_LogicalDiskToPartition | Where-Object {$_.Dependent -like '*${deviceId}*'} | ForEach-Object { Get-WmiObject -Class Win32_DiskPartition | Where-Object {$_.DeviceID -eq $_.Antecedent.Split('=')[1].Trim('\"')} } | ForEach-Object { Get-WmiObject -Class Win32_DiskDrive | Where-Object {$_.Index -eq $_.DiskIndex} } | Select-Object InterfaceType"`
      )
      
      if (usbResult.includes('USB') || usbResult.includes('1394')) {
        return true
      }
    } catch (error) {
      // USB检查失败
    }
    
    return false
  } catch (error) {
    writeToLog('error', `检查驱动器${deviceId}是否可弹出时出错:`, error)
    // 出错时保守处理，返回false避免误识别
    return false
  }
}

// SD卡监控相关变量
let sdCardMonitorInterval: NodeJS.Timeout | null = null
let previousDrives: string[] = []

// 启动SD卡监控
function startSDCardMonitoring() {
  writeToLog('info', '启动SD卡监控')
  
  // 立即检测一次当前驱动器状态
  updateDrivesList()
  
  // 每1秒检测一次SD卡变化
  sdCardMonitorInterval = setInterval(updateDrivesList, 1000)
}

// 停止SD卡监控
function stopSDCardMonitoring() {
  if (sdCardMonitorInterval) {
    clearInterval(sdCardMonitorInterval)
    sdCardMonitorInterval = null
    writeToLog('info', 'SD卡监控已停止')
  }
}

// 更新驱动器列表并检测变化
async function updateDrivesList() {
  try {
    const currentDrives = await getRemovableDrives()
    const currentDrivePaths = currentDrives.map(drive => drive.path)
    
    // 检测新插入的驱动器
    const newDrives = currentDrives.filter(drive => !previousDrives.includes(drive.path))
    
    // 检测移除的驱动器
    const removedDrives = previousDrives.filter(path => !currentDrivePaths.includes(path))
    
    if (newDrives.length > 0) {
      writeToLog('info', `检测到新的SD卡插入: ${newDrives.map(d => d.path).join(', ')}`)
      // 通知渲染进程有新的SD卡插入
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('sd-card-inserted', newDrives[0]) // 发送第一个检测到的SD卡
      }
    }
    
    if (removedDrives.length > 0) {
      writeToLog('info', `检测到SD卡移除: ${removedDrives.join(', ')}`)
      // 通知渲染进程有SD卡被移除
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('sd-card-removed', removedDrives)
      }
    }
    
    // 更新之前的驱动器列表
    previousDrives = currentDrivePaths
  } catch (error) {
    writeToLog('error', 'SD卡监控检测失败:', error)
  }
}

// 推出SD卡
async function ejectSDCard(sdCardPath: string): Promise<{ success: boolean; message: string }> {
  try {
    writeToLog('info', `尝试推出SD卡: ${sdCardPath}`)
    
    if (process.platform === 'darwin') {
      // macOS: 使用 diskutil eject 命令
      const { stderr } = await execAsync(`diskutil eject "${sdCardPath}"`)
      
      if (stderr && !stderr.toLowerCase().includes('warning')) {
        throw new Error(stderr)
      }
      
      writeToLog('info', `SD卡推出成功: ${sdCardPath}`)
      return { 
        success: true, 
        message: 'SD卡已安全推出' 
      }
    } else if (process.platform === 'win32') {
      // Windows: 使用 PowerShell 推出
      const driveLetter = sdCardPath.substring(0, 2) // 例如 "D:"
      const { stderr } = await execAsync(
        `powershell -Command "(New-Object -comObject Shell.Application).Namespace(17).ParseName('${driveLetter}').InvokeVerb('Eject')"`
      )
      
      if (stderr) {
        throw new Error(stderr)
      }
      
      writeToLog('info', `SD卡推出成功: ${sdCardPath}`)
      return { 
        success: true, 
        message: 'SD卡已安全推出' 
      }
    } else if (process.platform === 'linux') {
      // Linux: 使用 umount 命令
      const { stderr } = await execAsync(`umount "${sdCardPath}"`)
      
      if (stderr && !stderr.toLowerCase().includes('warning')) {
        throw new Error(stderr)
      }
      
      writeToLog('info', `SD卡推出成功: ${sdCardPath}`)
      return { 
        success: true, 
        message: 'SD卡已安全推出' 
      }
    } else {
      throw new Error('不支持的操作系统')
    }
  } catch (error: any) {
    writeToLog('error', `推出SD卡失败: ${sdCardPath}`, error.message)
    return { 
      success: false, 
      message: `推出失败: ${error.message}` 
    }
  }
} 