import fs from 'fs-extra'
import path from 'path'
import dayjs from 'dayjs'
import type { LogLevel } from '../types'

let logDir: string
let logFilePath: string

// 初始化日志系统
export function initializeLogging(): void {
  logDir = path.join(process.env.APPDATA || process.env.HOME || '', 'logs')
  fs.ensureDirSync(logDir)
  logFilePath = path.join(logDir, `app-${dayjs().format('YYYY-MM-DD')}.log`)
}

// 格式化日志消息
function formatLogMessage(level: LogLevel, message: string, args: any[]): string {
  const timestamp = dayjs().format('YYYY-MM-DD HH:mm:ss')
  let logMessage = `${timestamp} [${level.toUpperCase()}] - ${message}`

  if (args.length > 0) {
    const processedArgs = args.map(arg => {
      if (arg instanceof Error) {
        return `Error: ${arg.message}\nStack: ${arg.stack}`
      } else if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg, (_, value) => {
            if (typeof value === 'object' && value !== null) {
              const cache = new Set()
              return JSON.stringify(value, (_, v) => {
                if (typeof v === 'object' && v !== null) {
                  if (cache.has(v)) return
                  cache.add(v)
                }
                return v
              })
            }
            return value
          })
        } catch (e) {
          return '[Circular or complex object]'
        }
      } else {
        return String(arg)
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