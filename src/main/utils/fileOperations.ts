import fs from 'fs-extra'
import path from 'path'
import { createHash } from 'crypto'
import { statfs } from 'fs/promises'
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

const COPY_SPACE_BUFFER_BYTES = 512 * 1024 * 1024

function parseExifDate(rawValue: string): string | null {
  const match = rawValue.match(/(\d{4}):(\d{2}):(\d{2})\s+\d{2}:\d{2}:\d{2}/)
  if (!match) {
    return null
  }

  return `${match[1]}${match[2]}${match[3]}`
}

function readUInt16(buffer: Buffer, offset: number, littleEndian: boolean): number {
  return littleEndian ? buffer.readUInt16LE(offset) : buffer.readUInt16BE(offset)
}

function readUInt32(buffer: Buffer, offset: number, littleEndian: boolean): number {
  return littleEndian ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset)
}

function readExifAscii(buffer: Buffer, tiffStart: number, valueOffset: number, byteCount: number): string | null {
  const start = tiffStart + valueOffset
  const end = start + byteCount

  if (start < 0 || end > buffer.length) {
    return null
  }

  return buffer.subarray(start, end).toString('ascii').replace(/\0/g, '').trim()
}

function readExifDateFromIfd(buffer: Buffer, tiffStart: number, ifdOffset: number, littleEndian: boolean): {
  date: string | null;
  exifIfdOffset: number | null;
} {
  const ifdStart = tiffStart + ifdOffset
  if (ifdStart < 0 || ifdStart + 2 > buffer.length) {
    return { date: null, exifIfdOffset: null }
  }

  const entryCount = readUInt16(buffer, ifdStart, littleEndian)
  let exifIfdOffset: number | null = null
  let fallbackDate: string | null = null

  for (let index = 0; index < entryCount; index++) {
    const entryOffset = ifdStart + 2 + index * 12
    if (entryOffset + 12 > buffer.length) {
      break
    }

    const tag = readUInt16(buffer, entryOffset, littleEndian)
    const type = readUInt16(buffer, entryOffset + 2, littleEndian)
    const count = readUInt32(buffer, entryOffset + 4, littleEndian)
    const rawValueOffset = entryOffset + 8
    const valueOffset = readUInt32(buffer, rawValueOffset, littleEndian)

    if (tag === 0x8769) {
      exifIfdOffset = valueOffset
      continue
    }

    if ((tag === 0x9003 || tag === 0x0132) && type === 2) {
      const rawValue = count <= 4
        ? buffer.subarray(rawValueOffset, rawValueOffset + count).toString('ascii')
        : readExifAscii(buffer, tiffStart, valueOffset, count)
      const parsedDate = rawValue ? parseExifDate(rawValue) : null

      if (tag === 0x9003 && parsedDate) {
        return { date: parsedDate, exifIfdOffset }
      }

      if (tag === 0x0132 && parsedDate) {
        fallbackDate = parsedDate
      }
    }
  }

  return { date: fallbackDate, exifIfdOffset }
}

function getJpegExifDate(filePath: string): string | null {
  const extension = path.extname(filePath).toLowerCase()
  if (!JPG_EXTENSIONS.includes(extension)) {
    return null
  }

  try {
    const fd = fs.openSync(filePath, 'r')
    let buffer: Buffer

    try {
      const stats = fs.fstatSync(fd)
      const bytesToRead = Math.min(stats.size, 512 * 1024)
      buffer = Buffer.alloc(bytesToRead)
      fs.readSync(fd, buffer, 0, bytesToRead, 0)
    } finally {
      fs.closeSync(fd)
    }

    let offset = 2

    while (offset + 4 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        break
      }

      const marker = buffer[offset + 1]
      const segmentLength = buffer.readUInt16BE(offset + 2)
      const segmentStart = offset + 4
      const segmentEnd = offset + 2 + segmentLength

      if (marker === 0xe1 && buffer.subarray(segmentStart, segmentStart + 6).toString('ascii') === 'Exif\0\0') {
        const tiffStart = segmentStart + 6
        const endian = buffer.subarray(tiffStart, tiffStart + 2).toString('ascii')
        const littleEndian = endian === 'II'

        if (!littleEndian && endian !== 'MM') {
          return null
        }

        const firstIfdOffset = readUInt32(buffer, tiffStart + 4, littleEndian)
        const firstIfd = readExifDateFromIfd(buffer, tiffStart, firstIfdOffset, littleEndian)

        if (firstIfd.exifIfdOffset !== null) {
          const exifIfd = readExifDateFromIfd(buffer, tiffStart, firstIfd.exifIfdOffset, littleEndian)
          if (exifIfd.date) {
            return exifIfd.date
          }
        }

        return firstIfd.date
      }

      offset = segmentEnd
    }

    return null
  } catch (error) {
    writeToLog('warn', `读取照片拍摄时间失败，将使用文件修改时间: ${filePath}`, error)
    return null
  }
}

// 获取文件修改日期
export function getFileModifiedDate(filePath: string): string {
  const exifDate = getJpegExifDate(filePath)
  if (exifDate) {
    return exifDate
  }

  try {
    const stats = fs.statSync(filePath)
    return dayjs(stats.mtime).format('YYYYMMDD')
  } catch (error) {
    writeToLog('error', `获取文件修改日期失败: ${filePath}`, error)
    return '00000000'
  }
}

export async function getFileDateFromStats(filePath: string): Promise<string> {
  try {
    const stats = await fs.stat(filePath)
    return dayjs(stats.mtime).format('YYYYMMDD')
  } catch (error) {
    writeToLog('error', `获取文件日期失败: ${filePath}`, error)
    return '00000000'
  }
}

// 计算文件哈希值（优化版本）
export async function calculateFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = fs.createReadStream(filePath)

    stream.on('data', chunk => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', error => {
      writeToLog('error', `计算文件哈希失败: ${filePath}`, error)
      reject(error)
    })
  })
}

// 扫描媒体文件（优化版本）
export async function scanMediaFiles(dirPath: string, isRoot = true): Promise<string[]> {
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
        allFiles.push(...(await scanMediaFiles(fullPath, false)))
      } else if (entry.isFile() && validExtensions.includes(path.extname(entry.name).toLowerCase())) {
        allFiles.push(fullPath)
      }
    }
  } catch (error: any) {
    writeToLog('error', `扫描目录失败: ${dirPath}`, error)
    if (isRoot) {
      throw new Error(`无法读取目录：${dirPath}。请确认磁盘已连接，并且应用有访问权限。`)
    }
  }
  
  return allFiles
}

export async function getFileSize(filePath: string): Promise<number> {
  const stats = await fs.stat(filePath)
  return stats.size
}

export async function getAvailableSpace(dirPath: string): Promise<number | null> {
  try {
    await fs.ensureDir(dirPath)
    const stats = await statfs(dirPath)
    return stats.bavail * stats.bsize
  } catch (error) {
    writeToLog('warn', `获取磁盘剩余空间失败: ${dirPath}`, error)
    return null
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }

  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unitIndex]}`
}

export async function ensureEnoughSpace(targetDirs: string[], requiredBytes: number): Promise<void> {
  const uniqueDirs = Array.from(new Set(targetDirs))

  for (const targetDir of uniqueDirs) {
    const availableBytes = await getAvailableSpace(targetDir)
    if (availableBytes === null) {
      continue
    }

    if (availableBytes < requiredBytes + COPY_SPACE_BUFFER_BYTES) {
      throw new Error(
        `目标磁盘空间不足。需要约 ${formatBytes(requiredBytes)}，当前可用约 ${formatBytes(availableBytes)}。`
      )
    }
  }
}

function sanitizeDirNamePart(value: string): string {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
}

// 创建目标目录
export async function createTargetDir(baseDir: string, date: string, activityName: string): Promise<string> {
  const safeActivityName = sanitizeDirNamePart(activityName) || '媒体文件'
  const dirName = `${date}_${safeActivityName}`
  const targetDir = path.join(baseDir, dirName)
  
  try {
    await fs.ensureDir(targetDir)
    return targetDir
  } catch (error) {
    writeToLog('error', `创建目标目录失败: ${targetDir}`, error)
    throw error
  }
}

async function getNonConflictingTargetPath(targetPath: string): Promise<string> {
  const parsedPath = path.parse(targetPath)

  for (let index = 1; index < 10000; index++) {
    const candidate = path.join(parsedPath.dir, `${parsedPath.name}_${index}${parsedPath.ext}`)
    if (!(await fs.pathExists(candidate))) {
      return candidate
    }
  }

  throw new Error(`无法为同名文件生成新文件名: ${parsedPath.base}`)
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
    let finalTargetPath = targetPath
    let renamed = false
    
    // 检查文件是否已存在
    if (await fs.pathExists(targetPath)) {
      const sourceHash = await calculateFileHash(sourcePath)
      const targetHash = await calculateFileHash(targetPath)
      
      if (sourceHash === targetHash) {
        writeToLog('info', `文件已存在且内容相同，跳过: ${fileName}`)
        return { status: 'skipped', targetPath }
      }

      finalTargetPath = await getNonConflictingTargetPath(targetPath)
      renamed = true
      writeToLog('warn', `目标位置已有同名但内容不同的文件，改名保存: ${finalTargetPath}`)
    }

    // 拷贝文件
    await fs.copy(sourcePath, finalTargetPath, { overwrite: false })
    
    // 验证拷贝结果（只计算一次哈希）
    const sourceHash = await calculateFileHash(sourcePath)
    const targetHash = await calculateFileHash(finalTargetPath)
    
    if (sourceHash !== targetHash) {
      writeToLog('error', `文件哈希不匹配: ${sourcePath} 和 ${finalTargetPath}`)
      return { status: 'failed', error: `哈希不匹配: ${fileName}` }
    }
    
    return { status: renamed ? 'renamed' : 'copied', targetPath: finalTargetPath }
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
