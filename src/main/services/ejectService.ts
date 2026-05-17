import { exec, execFile } from 'child_process'
import { promisify } from 'util'
import type { EjectResult } from '../types'
import { writeToLog } from '../utils/logger'

const execAsync = promisify(exec)
const execFileAsync = promisify(execFile)

export async function ejectSDCard(sdCardPath: string): Promise<EjectResult> {
  try {
    writeToLog('info', `尝试推出SD卡: ${sdCardPath}`)

    if (process.platform === 'darwin') {
      const { stderr } = await execFileAsync('diskutil', ['eject', sdCardPath])

      if (stderr && !stderr.toLowerCase().includes('warning')) {
        throw new Error(stderr)
      }

      writeToLog('info', `SD卡推出成功: ${sdCardPath}`)
      return { success: true, message: 'SD卡已安全推出' }
    }

    if (process.platform === 'win32') {
      const driveLetter = sdCardPath.substring(0, 2)
      const { stderr } = await execAsync(
        `powershell -Command "(New-Object -comObject Shell.Application).Namespace(17).ParseName('${driveLetter}').InvokeVerb('Eject')"`
      )

      if (stderr) {
        throw new Error(stderr)
      }

      writeToLog('info', `SD卡推出成功: ${sdCardPath}`)
      return { success: true, message: 'SD卡已安全推出' }
    }

    if (process.platform === 'linux') {
      const { stderr } = await execFileAsync('umount', [sdCardPath])

      if (stderr && !stderr.toLowerCase().includes('warning')) {
        throw new Error(stderr)
      }

      writeToLog('info', `SD卡推出成功: ${sdCardPath}`)
      return { success: true, message: 'SD卡已安全推出' }
    }

    throw new Error('不支持的操作系统')
  } catch (error: any) {
    writeToLog('error', `推出SD卡失败: ${sdCardPath}`, error.message)
    return {
      success: false,
      message: `推出失败: ${error.message}`
    }
  }
}
