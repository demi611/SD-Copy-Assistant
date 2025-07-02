import fs from 'fs-extra'
import path from 'path'
import crypto from 'crypto-js'
import dayjs from 'dayjs'
import { 
  IMAGE_EXTENSIONS, 
  VIDEO_EXTENSIONS, 
  RAW_EXTENSIONS, 
  JPG_EXTENSIONS,
  SYSTEM_DIRS 
} from '../constants'
import type { FileCopyResult } from '../types'
import { writeToLog } from './logger'

// 获取文件修改日期
export function getFileModifiedDate(filePath: string): string {
  try {
    const stats = fs.statSync(filePath)
    return dayjs(stats.mtime).format('YYYYMMDD')
  } catch (error) {
    writeToLog('error', `获取文件修改日期失败: ${filePath}`, error)
    return '00000000'
  }
}

// 计算文件哈希值（优化版本）
export async function calculateFileHash(filePath: string): Promise<string> {
  try {
    const buffer = await fs.readFile(filePath)
    const wordArray = crypto.lib.WordArray.create(buffer as any)
    return crypto.SHA256(wordArray).toString()
  } catch (error) {
    writeToLog('error', `计算文件哈希失败: ${filePath}`, error)
    throw error
  }
}

// 扫描媒体文件（优化版本）
export async function scanMediaFiles(dirPath: string): Promise<string[]> {
  const allFiles: string[] = []
  const validExtensions = [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS]
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      
      if (entry.isDirectory()) {
        // 跳过系统目录
        if (entry.name.startsWith('.') || SYSTEM_DIRS.EXCLUDED_DIRS.includes(entry.name as any)) {
          continue
        }
        allFiles.push(...(await scanMediaFiles(fullPath)))
      } else if (entry.isFile() && validExtensions.includes(path.extname(entry.name).toLowerCase())) {
        allFiles.push(fullPath)
      }
    }
  } catch (error) {
    writeToLog('error', `扫描目录失败: ${dirPath}`, error)
  }
  
  return allFiles
}

// 创建目标目录
export async function createTargetDir(baseDir: string, date: string, activityName: string): Promise<string> {
  const dirName = `${date}_${activityName}`
  const targetDir = path.join(baseDir, dirName)
  
  try {
    await fs.ensureDir(targetDir)
    return targetDir
  } catch (error) {
    writeToLog('error', `创建目标目录失败: ${targetDir}`, error)
    throw error
  }
}

// 优化的文件拷贝和验证
export async function copyAndVerifyFile(
  sourcePath: string,
  targetDir: string,
  separateRawJpg: boolean
): Promise<FileCopyResult> {
  try {
    const fileName = path.basename(sourcePath)
    const extension = path.extname(fileName).toLowerCase()
    let actualTargetDir = targetDir

    // 处理RAW/JPG分离
    if (separateRawJpg) {
      if (RAW_EXTENSIONS.includes(extension)) {
        actualTargetDir = path.join(targetDir, 'RAW')
      } else if (JPG_EXTENSIONS.includes(extension)) {
        actualTargetDir = path.join(targetDir, 'JPG')
      }
      await fs.ensureDir(actualTargetDir)
    }

    const targetPath = path.join(actualTargetDir, fileName)
    
    // 检查文件是否已存在
    if (await fs.pathExists(targetPath)) {
      const sourceHash = await calculateFileHash(sourcePath)
      const targetHash = await calculateFileHash(targetPath)
      
      if (sourceHash === targetHash) {
        writeToLog('info', `文件已存在且内容相同，跳过: ${fileName}`)
        return { status: 'skipped' }
      }
    }

    // 拷贝文件
    await fs.copy(sourcePath, targetPath, { overwrite: true })
    
    // 验证拷贝结果（只计算一次哈希）
    const sourceHash = await calculateFileHash(sourcePath)
    const targetHash = await calculateFileHash(targetPath)
    
    if (sourceHash !== targetHash) {
      writeToLog('error', `文件哈希不匹配: ${sourcePath} 和 ${targetPath}`)
      return { status: 'failed', error: `哈希不匹配: ${fileName}` }
    }
    
    return { status: 'copied' }
  } catch (error: any) {
    writeToLog('error', `拷贝或校验文件失败: ${sourcePath}`, error)
    return { status: 'failed', error: error.message }
  }
}

// 获取文件类型
export function getFileType(filePath: string): 'image' | 'video' | 'unknown' {
  const extension = path.extname(filePath).toLowerCase()
  
  if (IMAGE_EXTENSIONS.includes(extension)) {
    return 'image'
  } else if (VIDEO_EXTENSIONS.includes(extension)) {
    return 'video'
  }
  
  return 'unknown'
}

// 检查是否为RAW文件
export function isRawFile(filePath: string): boolean {
  const extension = path.extname(filePath).toLowerCase()
  return RAW_EXTENSIONS.includes(extension)
}

// 检查是否为JPG文件
export function isJpgFile(filePath: string): boolean {
  const extension = path.extname(filePath).toLowerCase()
  return JPG_EXTENSIONS.includes(extension)
} 