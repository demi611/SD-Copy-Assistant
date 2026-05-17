import { getFileModifiedDate, scanMediaFiles } from '../utils/fileOperations'
import { writeToLog } from '../utils/logger'

export async function scanMediaFileDates(dirPath: string): Promise<string[]> {
  const files = await scanMediaFiles(dirPath)
  const dates = new Set<string>()

  for (const filePath of files) {
    const date = getFileModifiedDate(filePath)
    if (date !== '00000000') {
      dates.add(date)
    }
  }

  const sortedDates = Array.from(dates).sort().reverse()
  writeToLog('info', `扫描完成，找到 ${sortedDates.length} 个不同日期: ${sortedDates.join(', ')}`)
  return sortedDates
}
