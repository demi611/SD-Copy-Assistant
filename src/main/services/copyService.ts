import path from 'path'
import { IMAGE_EXTENSIONS, VIDEO_EXTENSIONS } from '../constants'
import type { CopyOperationResult, FileCopyProgress, FileCopyRequest } from '../types'
import {
  copyAndVerifyFile,
  createTargetDir,
  ensureEnoughSpace,
  formatBytes,
  getFileDateFromStats,
  getFileSize,
  getFileModifiedDate,
  scanMediaFiles
} from '../utils/fileOperations'
import { writeToLog } from '../utils/logger'

type ProgressReporter = (progress: FileCopyProgress) => void
let shouldCancelCopy = false

export function cancelMediaCopy(): void {
  shouldCancelCopy = true
}

function shouldCopyFile(filePath: string, request: FileCopyRequest): boolean {
  const ext = path.extname(filePath).toLowerCase()

  if (IMAGE_EXTENSIONS.includes(ext)) {
    return !!request.copyImages
  }

  if (VIDEO_EXTENSIONS.includes(ext)) {
    return !!request.copyVideos
  }

  return false
}

function getBaseTargetDir(filePath: string, request: FileCopyRequest): string | null {
  const fileExtension = path.extname(filePath).toLowerCase()

  if (IMAGE_EXTENSIONS.includes(fileExtension)) {
    return request.imageTargetDir
  }

  if (VIDEO_EXTENSIONS.includes(fileExtension)) {
    return request.videoTargetDir
  }

  return null
}

async function filterFilesByDate(files: string[], selectedDates: string[]): Promise<string[]> {
  if (selectedDates.includes('all')) {
    writeToLog('info', '用户选择了全部日期，将拷贝所有文件。')
    return files
  }

  const filtered: string[] = []
  for (const filePath of files) {
    const fileDate = await getFileDateFromStats(filePath)
    if (selectedDates.includes(fileDate)) {
      filtered.push(filePath)
    }
  }
  writeToLog('info', `根据选择的日期 [${selectedDates.join(', ')}] 过滤后，需要拷贝 ${filtered.length} 个文件。`)
  return filtered
}

async function getRequiredSpaceByTargetDir(files: string[], request: FileCopyRequest): Promise<Map<string, number>> {
  const spaceByTargetDir = new Map<string, number>()

  for (const filePath of files) {
    const baseTargetDir = getBaseTargetDir(filePath, request)
    if (!baseTargetDir) {
      continue
    }

    const currentSize = spaceByTargetDir.get(baseTargetDir) || 0
    spaceByTargetDir.set(baseTargetDir, currentSize + await getFileSize(filePath))
  }

  return spaceByTargetDir
}

export async function copyMediaFiles(
  request: FileCopyRequest,
  reportProgress: ProgressReporter
): Promise<CopyOperationResult> {
  shouldCancelCopy = false
  const { sdCardDir, activityName, selectedDates, separateRawJpg } = request
  let totalFiles = 0
  let filesProcessed = 0
  let filesRenamed = 0
  let filesSkipped = 0
  const errors: string[] = []

  try {
    writeToLog('info', `正在扫描源目录: ${sdCardDir}`)
    const allFiles = await scanMediaFiles(sdCardDir)
    writeToLog('info', `扫描完成，发现 ${allFiles.length} 个媒体文件。`)

    let filesToCopy = await filterFilesByDate(allFiles, selectedDates)
    filesToCopy = filesToCopy.filter(filePath => shouldCopyFile(filePath, request))
    writeToLog('info', `根据照片/视频开关过滤后，最终需要拷贝 ${filesToCopy.length} 个文件。`)

    totalFiles = filesToCopy.length
    const emptyMessage = selectedDates.includes('all')
      ? '没有找到要拷贝的文件。'
      : '在选择的日期中没有找到要拷贝的文件。'

    reportProgress({
      percentage: 0,
      message: totalFiles > 0 ? `准备拷贝 ${totalFiles} 个文件...` : emptyMessage,
      fileProcessed: '',
      totalFiles,
      processedFiles: 0
    })

    if (totalFiles === 0) {
      reportProgress({
        percentage: 100,
        message: emptyMessage,
        fileProcessed: ''
      })
      return { success: false, message: emptyMessage, errors: [] }
    }

    const requiredSpaceByTargetDir = await getRequiredSpaceByTargetDir(filesToCopy, request)
    for (const [targetDir, requiredBytes] of requiredSpaceByTargetDir) {
      await ensureEnoughSpace([targetDir], requiredBytes)
      writeToLog('info', `目标目录空间检查通过: ${targetDir}, 预计需要 ${formatBytes(requiredBytes)}`)
    }

    for (const sourcePath of filesToCopy) {
      if (shouldCancelCopy) {
        const cancelMessage = '已取消拷贝'
        reportProgress({
          percentage: Math.round(((filesProcessed + filesRenamed + filesSkipped + errors.length) / totalFiles) * 100),
          message: cancelMessage,
          fileProcessed: '',
          totalFiles,
          processedFiles: filesProcessed + filesRenamed + filesSkipped + errors.length
        })

        return {
          success: false,
          message: cancelMessage,
          errors,
          summary: {
            copied: filesProcessed,
            renamed: filesRenamed,
            skipped: filesSkipped,
            failed: errors.length,
            total: totalFiles
          }
        }
      }

      const fileDate = getFileModifiedDate(sourcePath)
      const baseTargetDir = getBaseTargetDir(sourcePath, request)

      if (!baseTargetDir) {
        writeToLog('warn', `未知文件类型，跳过拷贝: ${sourcePath}`)
        continue
      }

      const targetDirForFile = await createTargetDir(baseTargetDir, fileDate, activityName)
      const result = await copyAndVerifyFile(sourcePath, targetDirForFile, separateRawJpg)
      const processedCount = () => filesProcessed + filesRenamed + filesSkipped + errors.length
      const percentage = () => Math.round((processedCount() / totalFiles) * 100)

      if (result.status === 'copied') {
        filesProcessed++
        reportProgress({
          percentage: percentage(),
          message: `正在拷贝: ${path.basename(sourcePath)}`,
          fileProcessed: sourcePath,
          totalFiles,
          processedFiles: processedCount()
        })
      } else if (result.status === 'renamed') {
        filesRenamed++
        reportProgress({
          percentage: percentage(),
          message: `同名文件已改名保存: ${path.basename(result.targetPath || sourcePath)}`,
          fileProcessed: sourcePath,
          totalFiles,
          processedFiles: processedCount()
        })
      } else if (result.status === 'skipped') {
        filesSkipped++
        reportProgress({
          percentage: percentage(),
          message: `已跳过: ${path.basename(sourcePath)}`,
          fileProcessed: sourcePath,
          totalFiles,
          processedFiles: processedCount()
        })
      } else {
        errors.push(`文件拷贝失败或校验不通过: ${path.basename(sourcePath)}`)
        reportProgress({
          percentage: percentage(),
          message: `拷贝失败: ${path.basename(sourcePath)}`,
          fileProcessed: sourcePath,
          error: result.error || `拷贝失败或校验不通过: ${path.basename(sourcePath)}`,
          totalFiles,
          processedFiles: processedCount()
        })
      }
    }

    const finalMessage = [
      errors.length > 0 ? '拷贝完成，但有文件失败' : '拷贝完成',
      `成功 ${filesProcessed} 个`,
      filesRenamed > 0 ? `改名保存 ${filesRenamed} 个` : '',
      filesSkipped > 0 ? `跳过重复 ${filesSkipped} 个` : '',
      errors.length > 0 ? `失败 ${errors.length} 个` : ''
    ].filter(Boolean).join('，')

    reportProgress({
      percentage: 100,
      message: finalMessage,
      fileProcessed: '',
      error: errors.length > 0 ? '部分文件拷贝失败' : undefined
    })

    writeToLog('info', finalMessage, '错误详情:', errors)
    return {
      success: errors.length === 0,
      message: finalMessage,
      errors,
      summary: {
        copied: filesProcessed,
        renamed: filesRenamed,
        skipped: filesSkipped,
        failed: errors.length,
        total: totalFiles
      }
    }
  } catch (error: any) {
    const errorMessage = `文件拷贝过程中的致命错误: ${error.message}`
    writeToLog('error', errorMessage, error.stack)
    reportProgress({
      percentage: totalFiles > 0 ? Math.round(((filesProcessed + filesRenamed + filesSkipped + errors.length) / totalFiles) * 100) : 0,
      message: errorMessage,
      fileProcessed: '',
      error: errorMessage
    })
    return { success: false, message: errorMessage, errors: [errorMessage] }
  }
}
