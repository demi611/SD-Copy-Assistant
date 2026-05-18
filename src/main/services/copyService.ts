import path from 'path'
import { IMAGE_EXTENSIONS, VIDEO_EXTENSIONS } from '../constants'
import type { CopyOperationResult, FileCopyProgress, FileCopyRequest } from '../types'
import {
  copyAndVerifyFile,
  createTargetDir,
  ensureEnoughSpace,
  formatBytes,
  getFileStatInfo,
  scanMediaFiles
} from '../utils/fileOperations'
import { writeToLog } from '../utils/logger'

type ProgressReporter = (progress: FileCopyProgress) => void
type FileWorkItem = {
  path: string;
  size: number;
  date: string;
}
const QUICK_COPY_CONCURRENCY = 1
const FULL_VERIFY_COPY_CONCURRENCY = 1

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

async function prepareFileWorkItems(files: string[], request: FileCopyRequest): Promise<{
  workItems: FileWorkItem[];
  requiredSpaceByTargetDir: Map<string, number>;
  totalBytes: number;
}> {
  const workItems: FileWorkItem[] = []
  const spaceByTargetDir = new Map<string, number>()
  let totalBytes = 0
  const includeAllDates = request.selectedDates.includes('all')

  for (const filePath of files) {
    const baseTargetDir = getBaseTargetDir(filePath, request)
    if (!baseTargetDir || !shouldCopyFile(filePath, request)) {
      continue
    }

    const fileInfo = await getFileStatInfo(filePath)
    if (!includeAllDates && !request.selectedDates.includes(fileInfo.date)) {
      continue
    }

    workItems.push({ path: filePath, size: fileInfo.size, date: fileInfo.date })
    totalBytes += fileInfo.size
    const currentSize = spaceByTargetDir.get(baseTargetDir) || 0
    spaceByTargetDir.set(baseTargetDir, currentSize + fileInfo.size)
  }

  writeToLog(
    'info',
    `根据日期和照片/视频开关过滤后，最终需要拷贝 ${workItems.length} 个文件。`
  )

  return { workItems, requiredSpaceByTargetDir: spaceByTargetDir, totalBytes }
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
  let processedBytes = 0
  let totalBytes = 0
  const errors: string[] = []
  let copyStartTime = Date.now()

  const getBytesPerSecond = (): number => {
    const elapsedSeconds = (Date.now() - copyStartTime) / 1000
    if (elapsedSeconds <= 0) {
      return 0
    }

    return Math.round(processedBytes / elapsedSeconds)
  }

  const processedCount = () => filesProcessed + filesRenamed + filesSkipped + errors.length
  const percentage = () => totalBytes > 0
    ? Math.min(100, Math.round((processedBytes / totalBytes) * 100))
    : 0

  const createProgress = (message: string, fileProcessed = '', error?: string): FileCopyProgress => ({
    percentage: percentage(),
    message,
    fileProcessed,
    error,
    totalFiles,
    processedFiles: processedCount(),
    totalBytes,
    processedBytes,
    bytesPerSecond: getBytesPerSecond()
  })

  try {
    writeToLog('info', `正在扫描源目录: ${sdCardDir}`)
    const allFiles = await scanMediaFiles(sdCardDir)
    writeToLog('info', `扫描完成，发现 ${allFiles.length} 个媒体文件。`)

    const preparedFiles = await prepareFileWorkItems(allFiles, request)
    const filesToProcess = preparedFiles.workItems
    const requiredSpaceByTargetDir = preparedFiles.requiredSpaceByTargetDir
    totalBytes = preparedFiles.totalBytes
    totalFiles = filesToProcess.length
    const emptyMessage = selectedDates.includes('all')
      ? '没有找到要拷贝的文件。'
      : '在选择的日期中没有找到要拷贝的文件。'

    reportProgress(createProgress(totalFiles > 0
      ? `准备拷贝 ${totalFiles} 个文件，约 ${formatBytes(totalBytes)}...`
      : emptyMessage
    ))

    if (totalFiles === 0) {
      reportProgress({
        percentage: 100,
        message: emptyMessage,
        fileProcessed: ''
      })
      return { success: false, message: emptyMessage, errors: [] }
    }

    for (const [targetDir, requiredBytes] of requiredSpaceByTargetDir) {
      await ensureEnoughSpace([targetDir], requiredBytes)
      writeToLog('info', `目标目录空间检查通过: ${targetDir}, 预计需要 ${formatBytes(requiredBytes)}`)
    }

    copyStartTime = Date.now()

    const targetDirCache = new Map<string, Promise<string>>()
    const getTargetDirForFile = (baseTargetDir: string, date: string) => {
      const cacheKey = `${baseTargetDir}\n${date}\n${activityName}`
      let cachedTargetDir = targetDirCache.get(cacheKey)
      if (!cachedTargetDir) {
        cachedTargetDir = createTargetDir(baseTargetDir, date, activityName)
        targetDirCache.set(cacheKey, cachedTargetDir)
      }

      return cachedTargetDir
    }

    const processFileItem = async (fileItem: FileWorkItem): Promise<void> => {
      if (shouldCancelCopy) {
        return
      }

      const sourcePath = fileItem.path
      const baseTargetDir = getBaseTargetDir(sourcePath, request)

      if (!baseTargetDir) {
        writeToLog('warn', `未知文件类型，跳过拷贝: ${sourcePath}`)
        return
      }

      const targetDirForFile = await getTargetDirForFile(baseTargetDir, fileItem.date)
      const result = await copyAndVerifyFile(
        sourcePath,
        targetDirForFile,
        separateRawJpg,
        request.verificationMode || 'quick'
      )

      if (result.status === 'copied') {
        filesProcessed++
      } else if (result.status === 'renamed') {
        filesRenamed++
      } else if (result.status === 'skipped') {
        filesSkipped++
      } else {
        errors.push(`文件拷贝失败或校验不通过: ${path.basename(sourcePath)}`)
      }

      processedBytes += fileItem.size
      const messageByStatus = {
        copied: `已拷贝: ${path.basename(sourcePath)}`,
        renamed: `同名文件已改名保存: ${path.basename(result.targetPath || sourcePath)}`,
        skipped: `已跳过: ${path.basename(sourcePath)}`,
        failed: `拷贝失败: ${path.basename(sourcePath)}`
      }
      reportProgress(createProgress(
        messageByStatus[result.status],
        sourcePath,
        result.status === 'failed' ? (result.error || `拷贝失败或校验不通过: ${path.basename(sourcePath)}`) : undefined
      ))
    }

    let nextFileIndex = 0
    const workerCount = Math.min(
      filesToProcess.length,
      request.verificationMode === 'full' ? FULL_VERIFY_COPY_CONCURRENCY : QUICK_COPY_CONCURRENCY
    )

    const runCopyWorker = async () => {
      while (!shouldCancelCopy) {
        const currentIndex = nextFileIndex
        nextFileIndex++

        if (currentIndex >= filesToProcess.length) {
          return
        }

        await processFileItem(filesToProcess[currentIndex])
      }
    }

    await Promise.all(Array.from({ length: workerCount }, runCopyWorker))

    if (shouldCancelCopy) {
      const cancelMessage = '已取消拷贝'
      reportProgress(createProgress(cancelMessage))

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

    const finalMessage = errors.length > 0 ? '拷贝完成，但有文件失败' : '拷贝完成'

    processedBytes = totalBytes
    reportProgress(createProgress(finalMessage, '', errors.length > 0 ? '部分文件拷贝失败' : undefined))

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
      percentage: percentage(),
      message: errorMessage,
      fileProcessed: '',
      error: errorMessage,
      totalFiles,
      processedFiles: processedCount(),
      totalBytes,
      processedBytes,
      bytesPerSecond: getBytesPerSecond()
    })
    return { success: false, message: errorMessage, errors: [errorMessage] }
  }
}
