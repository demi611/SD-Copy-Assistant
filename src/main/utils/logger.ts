import fs from 'fs-extra'
import path from 'path'
import dayjs from 'dayjs'
import { app } from 'electron'
import type { LogLevel } from '../types'

let logDir: string
let logFilePath: string
const LOG_FOLDER_NAME = '光影拷卡助手'

function resolveLogDir(): string {
  if (process.platform === 'darwin') {
    return path.join(app.getPath('home'), 'Library', 'Logs', LOG_FOLDER_NAME)
  }

  return path.join(app.getPath('logs'), LOG_FOLDER_NAME)
}

function redactSensitivePaths(value: string): string {
  let redactedValue = value
  const sensitiveRoots = [
    app.isReady() ? app.getPath('home') : process.env.HOME,
    process.env.APPDATA
  ].filter((item): item is string => !!item)

  for (const sensitiveRoot of sensitiveRoots) {
    redactedValue = redactedValue.split(sensitiveRoot).join('~')
  }

  return redactedValue
}

// 初始化日志系统
export function initializeLogging(): void {
  logDir = resolveLogDir()
  fs.ensureDirSync(logDir)
  logFilePath = path.join(logDir, `${dayjs().format('YYYY-MM-DD')}.log`)
  cleanupOldLogs()
}

export function getLogDir(): string {
  if (!logDir) {
    logDir = resolveLogDir()
  }

  return logDir
}

// 格式化日志消息
function formatLogMessage(level: LogLevel, message: string, args: any[]): string {
  const timestamp = dayjs().format('YYYY-MM-DD HH:mm:ss')
  let logMessage = `${timestamp} [${level.toUpperCase()}] - ${redactSensitivePaths(message)}`

  if (args.length > 0) {
    const processedArgs = args.map(arg => {
      if (arg instanceof Error) {
        return redactSensitivePaths(`Error: ${arg.message}\nStack: ${arg.stack}`)
      } else if (typeof arg === 'object' && arg !== null) {
        try {
          const cache = new WeakSet()
          return redactSensitivePaths(JSON.stringify(arg, (_key, value) => {
            if (typeof value === 'object' && value !== null) {
              if (cache.has(value)) return '[Circular]'
              cache.add(value)
            }
            return value
          }))
        } catch (e) {
          return '[Circular or complex object]'
        }
      } else {
        return redactSensitivePaths(String(arg))
      }
    })
    logMessage += ` ${processedArgs.join(' ')}`
  }
  
  return logMessage.trim()
}

// 写入日志
export function writeToLog(level: LogLevel, message: string, ...args: any[]): void {
  if (!logFilePath) {
    console.log(formatLogMessage(level, message, args))
    return
  }
  
  const logMessage = formatLogMessage(level, message, args)
  
  // 开发环境下也在控制台输出
  if (process.env.NODE_ENV === 'development') {
    console.log(logMessage)
  }
  
  fs.appendFile(logFilePath, logMessage + '\n', (err) => {
    if (err) console.error('写入日志失败:', err)
  })
}

// 清理旧日志文件
export function cleanupOldLogs(): void {
  try {
    const files = fs.readdirSync(logDir)
    const cutoffDate = dayjs().subtract(7, 'day')
    
    files.forEach(file => {
      const filePath = path.join(logDir, file)
      const stats = fs.statSync(filePath)
      if (dayjs(stats.mtime).isBefore(cutoffDate)) {
        fs.unlinkSync(filePath)
      }
    })
  } catch (error) {
    writeToLog('error', '清理旧日志文件失败:', error)
  }
}
