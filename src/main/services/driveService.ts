import { exec } from 'child_process'
import path from 'path'
import { promisify } from 'util'
import fs from 'fs-extra'
import type { BrowserWindow } from 'electron'
import type { DriveInfo } from '../types'
import { writeToLog } from '../utils/logger'

const execAsync = promisify(exec)

export async function getRemovableDrives(): Promise<DriveInfo[]> {
  const drives: DriveInfo[] = []

  if (process.platform === 'darwin') {
    try {
      const volumesPath = '/Volumes'
      const volumes = await fs.readdir(volumesPath)
      const excludePatterns = [
        'Macintosh HD',
        'Macintosh HD - Data',
        'Preboot',
        'Recovery',
        'VM',
        'Data',
        '光影拷卡助手',
        'photo-copy-app'
      ]

      for (const volume of volumes) {
        if (excludePatterns.some(pattern => volume.includes(pattern))) {
          continue
        }

        const volumePath = path.join(volumesPath, volume)
        try {
          const stats = await fs.stat(volumePath)
          if (!stats.isDirectory()) {
            continue
          }

          try {
            const entries = await fs.readdir(volumePath)
            const hasAppFile = entries.some(entry => entry.endsWith('.app'))
            if (hasAppFile) {
              writeToLog('info', `跳过DMG挂载点: ${volumePath}`)
              continue
            }
          } catch (error) {
            // 无法读取目录时仍按普通卷处理。
          }

          const hasTypicalCameraFolders = await checkForCameraFolders(volumePath)
          drives.push({
            path: volumePath,
            label: hasTypicalCameraFolders ? `${volume} (相机存储卡)` : volume
          })
        } catch (error) {
          // 忽略无法访问的卷。
        }
      }
    } catch (error) {
      writeToLog('error', '检测可移动驱动器失败:', error)
    }
  } else if (process.platform === 'win32') {
    await collectWindowsDrives(drives)
  } else {
    await collectLinuxDrives(drives)
  }

  return drives
}

async function collectWindowsDrives(drives: DriveInfo[]): Promise<void> {
  try {
    const { stdout } = await execAsync(
      'wmic logicaldisk where "DriveType=2" get DeviceID,VolumeName,Size /format:csv'
    )
    const lines = stdout.split('\n').filter(line => line.trim() && !line.startsWith('Node'))

    for (const line of lines) {
      const parts = line.split(',')
      if (parts.length < 4) {
        continue
      }

      const deviceId = parts[1]?.trim()
      const volumeName = parts[3]?.trim() || ''
      if (!deviceId || !deviceId.match(/^[A-Z]:$/)) {
        continue
      }

      const drivePath = `${deviceId}\\`
      try {
        await fs.access(drivePath)
        const isEjectable = await checkIfDriveIsEjectable(deviceId)
        if (!isEjectable) {
          writeToLog('info', `跳过不可弹出的驱动器: ${drivePath}`)
          continue
        }

        const hasTypicalCameraFolders = await checkForCameraFolders(drivePath)
        const label = volumeName
          ? (hasTypicalCameraFolders ? `${volumeName} (${deviceId} 相机存储卡)` : `${volumeName} (${deviceId})`)
          : (hasTypicalCameraFolders ? `${deviceId} (相机存储卡)` : `${deviceId} 可移动磁盘`)

        drives.push({ path: drivePath, label })
      } catch (error) {
        // 驱动器不存在或无法访问。
      }
    }
  } catch (error) {
    writeToLog('error', 'Windows WMI查询失败，回退到传统方法:', error)
    const driveLetters = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K']

    for (const letter of driveLetters) {
      const drivePath = `${letter}:\\`
      try {
        await fs.access(drivePath)
        const isEjectable = await checkIfDriveIsEjectable(`${letter}:`)
        if (!isEjectable) {
          continue
        }

        const hasTypicalCameraFolders = await checkForCameraFolders(drivePath)
        drives.push({
          path: drivePath,
          label: hasTypicalCameraFolders ? `${letter}: (相机存储卡)` : `${letter}: 可移动磁盘`
        })
      } catch (accessError) {
        // 驱动器不存在或无法访问。
      }
    }
  }
}

async function collectLinuxDrives(drives: DriveInfo[]): Promise<void> {
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
          // 忽略无法访问的挂载点。
        }
      }
    } catch (error) {
      // 目录不存在。
    }
  }
}

async function checkForCameraFolders(drivePath: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(drivePath)
    const lowerEntries = entries.map(entry => entry.toLowerCase())
    const cameraFolders = [
      'dcim',
      '100canon',
      '101canon',
      '100nikon',
      '101nikon',
      '100olymp',
      '100pentx',
      '100sony',
      'avchd',
      'private',
      'misc'
    ]

    return cameraFolders.some(folder => lowerEntries.includes(folder))
  } catch (error) {
    return false
  }
}

async function checkIfDriveIsEjectable(deviceId: string): Promise<boolean> {
  if (process.platform !== 'win32') {
    return true
  }

  try {
    const { stdout } = await execAsync(
      `powershell -Command "Get-WmiObject -Class Win32_LogicalDisk | Where-Object {$_.DeviceID -eq '${deviceId}'} | Select-Object DriveType, MediaType"`
    )

    if (stdout.includes('DriveType') && stdout.includes('2')) {
      return true
    }

    try {
      const { stdout: shellResult } = await execAsync(
        `powershell -Command "try { $shell = New-Object -ComObject Shell.Application; $drive = $shell.Namespace(17).ParseName('${deviceId}'); $verbs = $drive.Verbs(); $hasEject = $verbs | Where-Object {$_.Name -like '*弹出*' -or $_.Name -like '*Eject*'}; if ($hasEject) { 'EJECTABLE' } else { 'NOT_EJECTABLE' } } catch { 'ERROR' }"`
      )

      if (shellResult.trim() === 'EJECTABLE') {
        return true
      }
    } catch (error) {
      // Shell 方法失败，继续使用 USB 检查。
    }

    try {
      const { stdout: usbResult } = await execAsync(
        `powershell -Command "Get-WmiObject -Class Win32_LogicalDiskToPartition | Where-Object {$_.Dependent -like '*${deviceId}*'} | ForEach-Object { Get-WmiObject -Class Win32_DiskPartition | Where-Object {$_.DeviceID -eq $_.Antecedent.Split('=')[1].Trim('\"')} } | ForEach-Object { Get-WmiObject -Class Win32_DiskDrive | Where-Object {$_.Index -eq $_.DiskIndex} } | Select-Object InterfaceType"`
      )

      if (usbResult.includes('USB') || usbResult.includes('1394')) {
        return true
      }
    } catch (error) {
      // USB 检查失败。
    }

    return false
  } catch (error) {
    writeToLog('error', `检查驱动器${deviceId}是否可弹出时出错:`, error)
    return false
  }
}

export class DriveMonitor {
  private interval: NodeJS.Timeout | null = null
  private previousDrives: string[] = []

  constructor(private readonly getMainWindow: () => BrowserWindow | null) {}

  start(): void {
    writeToLog('info', '启动SD卡监控')
    this.update()
    this.interval = setInterval(() => this.update(), 1000)
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
      writeToLog('info', 'SD卡监控已停止')
    }
  }

  private async update(): Promise<void> {
    try {
      const currentDrives = await getRemovableDrives()
      const currentDrivePaths = currentDrives.map(drive => drive.path)
      const newDrives = currentDrives.filter(drive => !this.previousDrives.includes(drive.path))
      const removedDrives = this.previousDrives.filter(drivePath => !currentDrivePaths.includes(drivePath))

      if (newDrives.length > 0) {
        writeToLog('info', `检测到新的SD卡插入: ${newDrives.map(d => d.path).join(', ')}`)
        const mainWindow = this.getMainWindow()
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('sd-card-inserted', newDrives[0])
        }
      }

      if (removedDrives.length > 0) {
        writeToLog('info', `检测到SD卡移除: ${removedDrives.join(', ')}`)
        const mainWindow = this.getMainWindow()
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('sd-card-removed', removedDrives)
        }
      }

      this.previousDrives = currentDrivePaths
    } catch (error) {
      writeToLog('error', 'SD卡监控检测失败:', error)
    }
  }
}
