import path from 'path'
import { IMAGE_EXTENSIONS, VIDEO_EXTENSIONS } from '../constants'
import type { CopyOperationResult, FileCopyProgress, FileCopyRequest } from '../types'
import {
  copyAndVerifyFile,
  createTargetDir,
  getFileModifiedDate,
  scanMediaFiles
} from '../utils/fileOperations'
import { writeToLog } from '../utils/logger'

type ProgressReporter = (progress: FileCopyProgress) => void

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

function filterFilesByDate(files: string[], selectedDates: string[]): string[] {
  if (selectedDates.includes('all')) {
    writeToLog('info', '用户选择了全部日期，将拷贝所有文件。')
    return files
  }

  const filtered = files.filter(filePath => selectedDates.includes(getFileModifiedDate(filePath)))
  writeToLog('info', `根据选择的日期 [${selectedDates.join(', ')}] 过滤后，需要拷贝 ${filtered.length} 个文件。`)
  return filtered
}

export async function copyMediaFiles(
  request: FileCopyRequest,
  reportProgress: ProgressReporter
): Promise<CopyOperationResult> {
  const { sdCardDir, activityName, selectedDates, separateRawJpg } = request
  let totalFiles = 0
  let filesProcessed = 0
  let filesSkipped = 0
  const errors: string[] = []

  try {
    writeToLog('info', `正在扫描源目录: ${sdCardDir}`)
    const allFiles = await scanMediaFiles(sdCardDir)
    writeToLog('info', `扫描完成，发现 ${allFiles.length} 个媒体文件。`)

    let filesToCopy = filterFilesByDate(allFiles, selectedDates)
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

    for (const sourcePath of filesToCopy) {
      const fileDate = getFileModifiedDate(sourcePath)
      const baseTargetDir = getBaseTargetDir(sourcePath, request)

      if (!baseTargetDir) {
        writeToLog('warn', `未知文件类型，跳过拷贝: ${sourcePath}`)
        continue
      }

      const targetDirForFile = await createTargetDir(baseTargetDir, fileDate, activityName)
      const result = await copyAndVerifyFile(sourcePath, targetDirForFile, separateRawJpg)
      const processedCount = () => filesProcessed + filesSkipped
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

    let finalMessage = errors.length > 0
      ? `拷贝完成，但有 ${errors.length} 个文件拷贝失败。`
      : `所有 ${filesProcessed} 个文件拷贝成功！`

    if (filesSkipped > 0) {
      finalMessage += ` 已跳过 ${filesSkipped} 个重复文件。`
    }

    reportProgress({
      percentage: 100,
      message: finalMessage,
      fileProcessed: '',
      error: errors.length > 0 ? '部分文件拷贝失败' : undefined
    })

    writeToLog('info', finalMessage, '错误详情:', errors)
    return { success: errors.length === 0, message: finalMessage, errors }
  } catch (error: any) {
    const errorMessage = `文件拷贝过程中的致命错误: ${error.message}`
    writeToLog('error', errorMessage, error.stack)
    reportProgress({
      percentage: totalFiles > 0 ? Math.round(((filesProcessed + filesSkipped) / totalFiles) * 100) : 0,
      message: errorMessage,
      fileProcessed: '',
      error: errorMessage
    })
    return { success: false, message: errorMessage, errors: [errorMessage] }
  }
}
