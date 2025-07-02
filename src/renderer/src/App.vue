<template>
  <el-config-provider :locale="zhCn">
    <div id="app">
      <el-container>
        <el-main class="custom-main-content">
          <div class="content-wrapper">
            <template v-if="!copying">
              <el-form :model="form" label-position="top">
                <!-- 图片目标目录 -->
                <el-form-item :class="{ 'is-error': errors.imageTargetDir }">
                  <template #label>
                    <span class="custom-label">
                      <el-icon><Picture /></el-icon>图片目标目录
                    </span>
                  </template>
                  <div class="custom-input-group">
                    <el-input v-model="form.imageTargetDir" placeholder="选择图片目标目录" class="custom-input" />
                    <el-button @click="selectImageDir" class="custom-date-action-button">
                      <el-icon><FolderOpened /></el-icon>选择目录
                    </el-button>
                  </div>
                  <div v-if="errors.imageTargetDir" class="custom-error-text">
                    <el-icon><WarningFilled /></el-icon>{{ errors.imageTargetDir }}
                  </div>
                </el-form-item>

                <!-- 视频目标目录 -->
                <el-form-item :class="{ 'is-error': errors.videoTargetDir }">
                  <template #label>
                    <span class="custom-label">
                      <el-icon><Film /></el-icon>视频目标目录
                    </span>
                  </template>
                  <div class="custom-input-group">
                    <el-input v-model="form.videoTargetDir" placeholder="选择视频目标目录" class="custom-input" />
                    <el-button @click="selectVideoDir" class="custom-date-action-button">
                      <el-icon><FolderOpened /></el-icon>选择目录
                    </el-button>
                  </div>
                  <div v-if="errors.videoTargetDir" class="custom-error-text">
                    <el-icon><WarningFilled /></el-icon>{{ errors.videoTargetDir }}
                  </div>
                </el-form-item>

                <!-- 移动磁盘目录 -->
                <el-form-item :class="{ 'is-error': !form.sdCardDir && sdDirTouched }">
                  <template #label>
                    <span class="custom-label">
                       <el-icon><CreditCard /></el-icon>移动磁盘目录
                    </span>
                  </template>
                  <div class="custom-input-group">
                    <el-input 
                      v-model="form.sdCardDir" 
                      placeholder="请选择移动磁盘目录" 
                      class="custom-input"
                      @blur="sdDirTouched = true"
                      clearable
                      @clear="onSdCardDirClear"
                    />
                    <!-- 当没有移动磁盘或不是可移动驱动器时显示选择目录按钮 -->
                    <el-button 
                      v-if="shouldShowSelectDir"
                      @click="selectSdCardDir" 
                      class="custom-date-action-button">
                      <el-icon><FolderOpened /></el-icon>选择目录
                    </el-button>
                    <!-- 只有自动检测到的移动磁盘路径才显示推出按钮 -->
                    <el-button 
                      v-if="shouldShowEject"
                      @click="ejectSDCard" 
                      :loading="ejectingSDCard"
                      :disabled="copying || scanningDates"
                      class="custom-eject-button"
                      type="warning">
                      <el-icon><RemoveFilled /></el-icon>
                      推出磁盘
                    </el-button>
                  </div>
                  <div v-if="!form.sdCardDir && sdDirTouched" class="custom-error-text">
                    <el-icon><WarningFilled /></el-icon>错误：未选择移动磁盘目录
                  </div>
                  <div v-if="messages.sdCard" class="custom-message-text" :class="`is-${messages.sdCardType}`">
                    <el-icon v-if="messages.sdCardType === 'success'"><SuccessFilled /></el-icon>
                    <el-icon v-else-if="messages.sdCardType === 'error'"><WarningFilled /></el-icon>
                    <el-icon v-else><InfoFilled /></el-icon>
                    {{ messages.sdCard }}
                  </div>
                </el-form-item>

                <!-- 拍摄活动名称 -->
                <el-form-item>
                  <template #label>
                    <span class="custom-label">
                      <el-icon><PriceTag /></el-icon>拍摄活动名称
                    </span>
                  </template>
                  <el-input v-model="form.activityName" placeholder="请输入活动名称（不填默认为：媒体文件）" class="custom-input">
                     <template #suffix>
                      <el-icon><EditPen /></el-icon>
                    </template>
                  </el-input>
                </el-form-item>

                <!-- 选择拍摄日期 -->
                <el-form-item :class="{ 'is-error': errors.selectedDates }">
                   <template #label>
                    <span class="custom-label">
                      <el-icon><Calendar /></el-icon>选择拍摄日期
                    </span>
                  </template>
                  <div class="custom-input-group">
                    <el-select 
                      v-model="form.selectedDates" 
                      multiple
                      placeholder="获取日期成功后，点击下拉选择拷贝日期" 
                      class="custom-select" 
                    >
                      <el-option label="全部日期" value="all"></el-option>
                      <el-option
                        v-for="date in availableDates"
                        :key="date"
                        :label="date"
                        :value="date">
                      </el-option>
                    </el-select>
                    <el-button @click="scanDates" :loading="scanningDates" class="custom-date-action-button">
                      <el-icon><RefreshRight /></el-icon>
                      获取日期
                    </el-button>
                  </div>
                  <div v-if="errors.selectedDates" class="custom-error-text">
                    <el-icon><WarningFilled /></el-icon>{{ errors.selectedDates }}
                  </div>
                  <div v-if="messages.dates" class="custom-message-text" :class="`is-${messages.datesType}`">
                    <el-icon v-if="messages.datesType === 'success'"><SuccessFilled /></el-icon>
                    <el-icon v-else-if="messages.datesType === 'error'"><WarningFilled /></el-icon>
                    <el-icon v-else><InfoFilled /></el-icon>
                    {{ messages.dates }}
                  </div>
                </el-form-item>

                <!-- RAW和JPG分开保存、拷贝照片、拷贝视频三个勾选项同一行 -->
                <el-form-item>
                  <div class="copy-options-row">
                    <el-checkbox v-model="form.separateRawJpg" class="custom-checkbox">
                      RAW和JPG分开保存
                    </el-checkbox>
                    <el-checkbox v-model="form.copyImages" class="custom-checkbox">
                      拷贝照片
                    </el-checkbox>
                    <el-checkbox v-model="form.copyVideos" class="custom-checkbox">
                      拷贝视频
                    </el-checkbox>
                  </div>
                  <div v-if="!form.copyImages && !form.copyVideos" class="custom-error-text">
                    <el-icon><WarningFilled /></el-icon>请至少选择"拷贝照片"或"拷贝视频"
                  </div>
                  <div v-else-if="errors.general" class="custom-error-text">
                    <el-icon><WarningFilled /></el-icon>{{ errors.general }}
                  </div>
                  <div v-if="messages.copyResult" class="custom-message-text" :class="`is-${messages.copyResultType}`">
                    <el-icon v-if="messages.copyResultType === 'success'"><SuccessFilled /></el-icon>
                    <el-icon v-else-if="messages.copyResultType === 'error'"><WarningFilled /></el-icon>
                    <el-icon v-else><InfoFilled /></el-icon>
                    {{ messages.copyResult }}
                  </div>
                </el-form-item>
              </el-form>
              <!-- 主操作卡片 -->
              <div class="main-action-card">
                <div class="action-button-container">
                  <el-button
                    type="primary"
                    @click="startCopy"
                    :loading="scanningDates"
                    class="main-action-button"
                    key="main-action-btn"
                  >
                    <el-icon><VideoPlay /></el-icon>
                    开始拷贝
                  </el-button>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="copy-progress-fullscreen">
                <div class="main-progress-content">
                  <div class="custom-progress-icon-large">
                    <el-icon class="custom-progress-icon"><Loading /></el-icon>
                  </div>
                  <div class="custom-progress-title">
                    正在拷贝文件
                  </div>
                  <div class="custom-progress-percentage">{{ copyProgress }}%</div>
                  <el-progress
                    :percentage="copyProgress"
                    :stroke-width="8"
                    :show-text="false"
                    :class="['custom-progress-bar', { completed: copyProgress === 100 }]"
                  />
                  <div class="custom-progress-details">
                    <p class="custom-progress-message">{{ statusMessage }}</p>
                    <p class="custom-progress-stats" v-if="totalFiles > 0">
                      已处理 {{ processedFiles }}/{{ totalFiles }} 个文件
                    </p>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </el-main>
      </el-container>
      <!-- 页脚移动到这里 -->
      <footer class="custom-app-footer">
        <!-- 使用说明链接 -->
        <a href="#" @click.prevent="showHelpDialog = true" class="custom-footer-link">
          <el-icon><InfoFilled /></el-icon>
          使用说明
        </a>
        <div class="footer-links">
          <a href="#" @click.prevent="openGithub" class="custom-footer-link">
            <svg class="github-icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            GitHub
          </a>
        </div>
      </footer>
      <!-- 使用说明弹窗 (保持原位，因为它不是布局的一部分) -->
      <el-dialog v-model="showHelpDialog" title="使用说明" width="80%" class="custom-dialog">
        <div class="help-sections">
          <div class="help-section">
            <h4>🚀 快速开始</h4>
                         <ol>
               <li>插入移动磁盘，应用会自动检测并填充移动磁盘路径</li>
               <li>设置图片和视频的目标存储目录</li>
               <li>点击"获取日期"扫描移动磁盘中的文件日期</li>
               <li>选择要拷贝的日期或选择"全部日期"</li>
               <li>点击"开始拷贝"</li>
               <li>拷贝完成后，点击"推出移动磁盘"安全移除</li>
             </ol>
          </div>

          <div class="help-section">
            <h4>⚙️ 详细设置</h4>
            <ul>
                             <li><strong>目标目录：</strong>分别设置图片和视频的存储位置</li>
               <li><strong>移动磁盘选择：</strong>自动检测时显示"推出磁盘"，手动选择时显示"选择目录"</li>
               <li><strong>活动名称：</strong>可选，用于文件夹命名（如"旅行照片"），默认为"媒体文件"</li>
               <li><strong>日期选择：</strong>支持多选特定日期或选择全部，日期按最新优先排序</li>
               <li><strong>RAW+JPG分离：</strong>勾选后会自动创建RAW和JPG子文件夹</li>
            </ul>
          </div>

          <div class="help-section">
            <h4>📁 文件组织</h4>
            <p>拷贝后的文件夹结构：<code>日期_活动名称</code></p>
            <ul>
              <li>示例：<code>20231225_家庭聚会</code></li>
              <li>启用RAW+JPG分离时：<code>20231225_家庭聚会/RAW/</code> 和 <code>20231225_家庭聚会/JPG/</code></li>
            </ul>
          </div>

          <div class="help-section">
            <h4>🔒 安全功能</h4>
            <ul>
              <li><strong>文件完整性校验：</strong>拷贝完成后自动验证文件哈希值</li>
              <li><strong>安全推出：</strong>拷贝完成后可点击"推出磁盘"按钮安全移除</li>
              <li><strong>重复检测：</strong>自动跳过已存在的相同文件</li>
              <li><strong>错误恢复：</strong>详细的错误提示和日志记录</li>
            </ul>
          </div>
        </div>
        <template #footer>
          <span class="dialog-footer">
            <el-button type="primary" @click="showHelpDialog = false">明白了</el-button>
          </span>
        </template>
      </el-dialog>
    </div>
  </el-config-provider>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
// Updated icons based on usage
import { 
  FolderOpened, Calendar, InfoFilled, SuccessFilled,
  Picture, Film, CreditCard, EditPen, RefreshRight, VideoPlay, WarningFilled, RemoveFilled, PriceTag, Loading
} from '@element-plus/icons-vue'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import type { FileCopyRequest, FileCopyProgress } from '../../preload'

const sdDirTouched = ref(false); // 仅在失焦后显示移动磁盘错误

// 错误和消息状态管理
const errors = reactive({
  imageTargetDir: '',
  videoTargetDir: '',
  selectedDates: '',
  general: '' // 通用错误信息
})

// 各区域的提示消息
const messages = reactive({
  sdCard: '', // 移动磁盘相关提示
  dates: '', // 日期相关提示
  copyResult: '', // 拷贝结果提示
  sdCardType: 'info' as 'info' | 'success' | 'error', // 移动磁盘消息类型
  datesType: 'info' as 'info' | 'success' | 'error', // 日期消息类型
  copyResultType: 'info' as 'info' | 'success' | 'error' // 拷贝结果消息类型
})

const form = reactive<Omit<FileCopyRequest, 'selectedDates'> & { selectedDates: string[], copyImages: boolean, copyVideos: boolean }>({
  imageTargetDir: '', // 将在onMounted中设置
  videoTargetDir: '', // 将在onMounted中设置
  sdCardDir: '',
  activityName: '',
  selectedDates: [],
  separateRawJpg: false,
  copyImages: true,
  copyVideos: true
})

const copying = ref(false)
const copyProgress = ref(0)
const statusMessage = ref('')
const totalFiles = ref(0)
const processedFiles = ref(0)
const availableDates = ref<string[]>([])
const scanningDates = ref(false)
const showHelpDialog = ref(false)
const ejectingSDCard = ref(false)

const removableDrives = ref<Array<{ path: string, label: string }>>([])

let unsubscribeFileCopyProgress: (() => void) | null = null;
let unsubscribeSDCardInserted: (() => void) | null = null;
let unsubscribeSDCardRemoved: (() => void) | null = null;

// 刷新可移动驱动器列表
const refreshRemovableDrives = async () => {
  removableDrives.value = await window.electron.getRemovableDrives()
}

// 自动检测移动磁盘
const autoDetectSDCard = async () => {
  await refreshRemovableDrives()
  try {
    const drives = removableDrives.value
    if (drives && drives.length > 0) {
      form.sdCardDir = drives[0].path
      sdDirTouched.value = false
      messages.sdCard = `检测到移动磁盘：${drives[0].label} (${drives[0].path})`;
      messages.sdCardType = 'success'
      setTimeout(() => {
        if (messages.sdCard && messages.sdCard.includes('检测到移动磁盘')) {
          messages.sdCard = ''
        }
      }, 5000)
      // 自动检测到移动磁盘后自动获取日期
      scanDates();
    }
  } catch (error: any) {
    // 自动检测移动磁盘失败，静默处理
  }
}

onMounted(async () => {
  if (!window.electron) {
    errors.general = '应用程序初始化失败：无法访问 Electron API';
    return;
  }
  
  // 设置默认目录
  try {
    const defaultDirs = await window.electron.getDefaultDirs();
    if (defaultDirs.pictures) form.imageTargetDir = defaultDirs.pictures;
    if (defaultDirs.videos) form.videoTargetDir = defaultDirs.videos;
  } catch (error) {
    // 获取默认目录失败，使用空字符串
  }
  
  const progressHandler = (progress: FileCopyProgress) => {
    if (progress) {
      copyProgress.value = progress.percentage || 0;
      statusMessage.value = progress.message || '';
      totalFiles.value = progress.totalFiles || 0;
      processedFiles.value = progress.processedFiles || 0;

      if (progress.error) {
        errors.general = progress.error;
      }
      
      if (progress.percentage === 100) {
        setTimeout(() => {
          copying.value = false;
        }, 1000);
      }
    }
  };

  unsubscribeFileCopyProgress = window.electron.onFileCopyProgress(progressHandler);
  
  // 设置移动磁盘事件监听
  unsubscribeSDCardInserted = window.electron.onSDCardInserted((drive) => {
    form.sdCardDir = drive.path;
    sdDirTouched.value = false;
    refreshRemovableDrives()
    messages.sdCard = `检测到移动磁盘插入：${drive.label} (${drive.path})`;
    messages.sdCardType = 'success'
    setTimeout(() => {
      if (messages.sdCard && messages.sdCard.includes('检测到移动磁盘插入')) {
        messages.sdCard = ''
      }
    }, 5000)
  });

  unsubscribeSDCardRemoved = window.electron.onSDCardRemoved((removedPaths) => {
    if (form.sdCardDir && removedPaths.includes(form.sdCardDir)) {
      form.sdCardDir = '';
      sdDirTouched.value = true;
      refreshRemovableDrives()
      messages.sdCard = '移动磁盘已被移除，请重新选择源目录';
      messages.sdCardType = 'error'
      setTimeout(() => {
        if (messages.sdCard === '移动磁盘已被移除，请重新选择源目录') {
          messages.sdCard = ''
        }
      }, 5000)
    }
  });
  
  // 自动检测移动磁盘（初始检测）
  autoDetectSDCard();
});

onUnmounted(() => {
  if (unsubscribeFileCopyProgress) {
    unsubscribeFileCopyProgress()
  }
  if (unsubscribeSDCardInserted) {
    unsubscribeSDCardInserted()
  }
  if (unsubscribeSDCardRemoved) {
    unsubscribeSDCardRemoved()
  }
})

const selectDirectory = async (): Promise<string | null> => {
  try {
    const result = await window.electron.selectDirectory()
    if (!result) return null
    return result
  } catch (error: any) {
    errors.general = '选择目录失败: ' + error.message
    return null
  }
}

const selectImageDir = async () => { 
  const dir = await selectDirectory(); 
  if (dir) {
    form.imageTargetDir = dir;
    errors.imageTargetDir = ''; // 清除错误
  }
}
const selectVideoDir = async () => { 
  const dir = await selectDirectory(); 
  if (dir) {
    form.videoTargetDir = dir; 
    errors.videoTargetDir = ''; // 清除错误
  }
}
const selectSdCardDir = async () => { 
  const dir = await selectDirectory(); 
  if (dir) {
    form.sdCardDir = dir; 
    messages.sdCard = '';
    await refreshRemovableDrives()
  }
  sdDirTouched.value = true;
}

const scanDates = async () => {
  // 清除之前的错误信息
  clearErrors()
  clearMessages()
  sdDirTouched.value = true; // 如果尝试扫描但未选择，也标记为已触碰
  
  if (!form.sdCardDir) {
    // 移动磁盘错误已经通过现有的逻辑处理
    return;
  }
  
  scanningDates.value = true;
  statusMessage.value = '正在扫描文件日期...';
  try {
    window.electron.logMessage('info', 'Requesting media file dates for:', form.sdCardDir);
    const dates = await window.electron.scanMediaFileDates(form.sdCardDir);
    if (dates.length === 0) {
      messages.dates = '在选定目录中未找到符合条件的图片或视频文件';
      messages.datesType = 'error'
      availableDates.value = [];
    } else {
      availableDates.value = dates;
      messages.dates = `扫描完成！共找到 ${dates.length} 个不同日期。请在下拉框中选择。`
      messages.datesType = 'success'
      // 3秒后清除成功消息
      setTimeout(() => {
        if (messages.dates.includes('扫描完成')) {
          messages.dates = ''
        }
      }, 3000)
    }
    form.selectedDates = [];
  } catch (error: any) {
    window.electron.logMessage('error', '扫描日期失败:', form.sdCardDir, error.message);
    messages.dates = '扫描日期失败: ' + error.message;
    messages.datesType = 'error'
  } finally {
    scanningDates.value = false;
    statusMessage.value = '';
  }
}

const startCopy = async () => {
  // 清除之前的错误信息
  clearErrors()
  clearMessages()
  sdDirTouched.value = true; // 尝试拷贝时标记为已触碰
  
  // 验证表单并设置错误信息
  let hasErrors = false
  
  if (!form.imageTargetDir) { 
    errors.imageTargetDir = '请选择图片存储目录'
    hasErrors = true
  }
  if (!form.videoTargetDir) { 
    errors.videoTargetDir = '请选择视频存储目录'
    hasErrors = true
  }
  if (!form.sdCardDir) { 
    // 移动磁盘错误已经通过现有的逻辑处理
    hasErrors = true
  }
  if (form.selectedDates.length === 0) { 
    errors.selectedDates = '请至少选择一个日期或"全部日期"'
    hasErrors = true
  }
  if (!form.copyImages && !form.copyVideos) {
    errors.general = '请至少选择"拷贝照片"或"拷贝视频"';
    hasErrors = true;
  }
  
  if (hasErrors) return;

  copying.value = true;
  copyProgress.value = 0;
  statusMessage.value = '正在初始化拷贝...';

  window.electron.logMessage('debug', '[App.vue] form.selectedDates before sending:', JSON.parse(JSON.stringify(form.selectedDates)));

  // 如果活动名称为空，使用默认名称
  const activityName = form.activityName.trim() || '媒体文件';

  const request: FileCopyRequest = {
    sdCardDir: form.sdCardDir,
    imageTargetDir: form.imageTargetDir,
    videoTargetDir: form.videoTargetDir,
    activityName: activityName,
    selectedDates: [...form.selectedDates],
    separateRawJpg: form.separateRawJpg,
    copyImages: form.copyImages,
    copyVideos: form.copyVideos
  };

  try {
    window.electron.logMessage('info', 'Starting file copy with request:', request);
    const result = await window.electron.startFileCopy(request);
    window.electron.logMessage('info', 'File copy process finished. Result:', result);

    if (result.success) {
      messages.copyResult = result.message || '文件拷贝成功完成！';
      messages.copyResultType = 'success';
      // 10秒后清除成功消息
      setTimeout(() => {
        if (messages.copyResult && (messages.copyResult.includes('成功') || messages.copyResult.includes('完成'))) {
          messages.copyResult = ''
        }
      }, 10000)
    } else {
      messages.copyResult = result.message || '文件拷贝过程中发生错误。';
      messages.copyResultType = 'error';
      if (result.errors && result.errors.length > 0) {
        // 将详细错误也显示在界面上
        messages.copyResult += `\n拷贝过程中出现 ${result.errors.length} 个文件错误：\n${result.errors.slice(0, 3).join('\n')}${result.errors.length > 3 ? '\n...' : ''}`;
        window.electron.logMessage('error', '文件拷贝完成但有错误:', result.errors);
      }
    }
  } catch (error: any) {
    window.electron.logMessage('error', '调用 startFileCopy 时发生严重错误:', error.message);
    messages.copyResult = '拷贝启动失败: ' + error.message;
    messages.copyResultType = 'error';
    statusMessage.value = '拷贝启动失败！';
  } finally {
     if (copyProgress.value !== 100) {
        copying.value = false;
     }
  }
}

const openGithub = () => {
  window.electron.logMessage('info', '打开 GitHub 链接');
  window.electron.openExternalLink('https://github.com/demi611/SD-Copy-Assistant');
}

const ejectSDCard = async () => {
  // 清除之前的错误信息
  clearErrors()
  clearMessages()
  
  if (!form.sdCardDir) {
    messages.sdCard = '没有选择移动磁盘';
    messages.sdCardType = 'error'
    return;
  }
  
  ejectingSDCard.value = true;
  
  try {
    window.electron.logMessage('info', '尝试推出移动磁盘:', form.sdCardDir);
    const result = await window.electron.ejectSDCard(form.sdCardDir);
    
    if (result.success) {
      messages.sdCard = result.message;
      messages.sdCardType = 'success'
      // 清空移动磁盘路径，因为已经推出
      clearSDCardData();
      // 3秒后清除成功消息
      setTimeout(() => {
        if (messages.sdCard === result.message) {
          messages.sdCard = ''
        }
      }, 3000)
    } else {
      messages.sdCard = result.message;
      messages.sdCardType = 'error'
    }
  } catch (error: any) {
    window.electron.logMessage('error', '推出移动磁盘时发生错误:', error.message);
    messages.sdCard = '推出移动磁盘失败: ' + error.message;
    messages.sdCardType = 'error'
  } finally {
    ejectingSDCard.value = false;
  }
}

// 清空移动磁盘相关数据的统一函数
const clearSDCardData = () => {
  form.sdCardDir = '';
  availableDates.value = [];
  form.selectedDates = [];
  sdDirTouched.value = false; // 重置触碰状态，避免显示错误提示
}

// 处理输入框清空事件
const onSdCardDirClear = () => {
  clearSDCardData();
}

// 清除所有错误信息
const clearErrors = () => {
  errors.imageTargetDir = ''
  errors.videoTargetDir = ''
  errors.selectedDates = ''
  errors.general = ''
}

// 清除所有提示消息
const clearMessages = () => {
  messages.sdCard = ''
  messages.dates = ''
  messages.copyResult = ''
}

const isRemovableDrive = (dir: string) => {
  return removableDrives.value.some((d) => d.path === dir);
};
const shouldShowSelectDir = computed(() => !form.sdCardDir || !isRemovableDrive(form.sdCardDir));
const shouldShowEject = computed(() => form.sdCardDir && isRemovableDrive(form.sdCardDir));

</script>

<style>
/* HTML、Body 和 Vue 应用挂载点的全局重置 */
html, body, #app {
  height: 100vh; 
  width: 100vw;  
  margin: 0;
  padding: 0;
  overflow: hidden; 
  box-sizing: border-box;
  background-color: #EFEFF4; /* 确保全局背景颜色一致 */
}

#app .el-container {
  height: calc(100vh - 40px); /* 100vh 减去页脚高度 */
}

/* 移动磁盘检测消息样式 */
.sd-card-message {
  padding: 4px 0;
}

.sd-card-title {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
}

.sd-card-details {
  display: flex;
  flex-direction: column;
  font-size: 12px;
  color: #606266;
  margin-left: 28px;
}

.sd-card-label {
  font-weight: 500;
  margin-bottom: 2px;
}

.sd-card-path {
  color: #909399;
  font-family: monospace;
}

/* 通用应用样式 */
.container.custom-style-container {
  display: flex; 
  align-items: center; 
  justify-content: center; 
  height: 100%; 
  width: 100%; 
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  overflow: hidden; 
  background-color: #EFEFF4; /* 整体窗口背景颜色，与html/body保持一致 */
  padding: 20px; /* 统一的 20px 灰色边框 */
}

.custom-main-content {
  width: 100%;
  max-width: 700px;
  margin: 0;
  background: #F9F9F9;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow-y: visible;
  display: flex;
  flex-direction: column;
  padding: 0;
  box-sizing: border-box;
  height: 100%;
}

.content-wrapper {
  padding-bottom: 72px;
  padding-top: 24px;
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
}

.form-header {
  padding: 24px 24px 12px 24px; 
  border-bottom: 1px solid #EAEAEA;
  margin-bottom: 18px;
}

.form-title {
  font-size: 1.5em; 
  font-weight: 600;
  color: #1d1d1f; 
  margin: 0 0 4px 0;
}

.form-description {
  font-size: 0.9em;
  color: #6e6e73; 
  margin: 0;
}

.el-form-item {
  margin-bottom: 20px; 
  padding: 0 24px; 
  transition: all 0.2s ease;
}

.el-form-item:hover {
  transform: translateY(-1px);
}

/* 有通知信息的表单项减少底部间距 */
.el-form-item:has(.custom-error-text),
.el-form-item:has(.custom-message-text) {
  margin-bottom: 16px;
}

.custom-label {
  display: flex;
  align-items: center;
  font-size: 1em;
  color: #333;
  font-weight: 500;
}
.custom-label .el-icon {
  margin-right: 8px;
  color: #0071E3; 
  font-size: 1.1em;
}

/* 恢复Element Plus原生输入框风格，仅微调圆角和边框色 */
.el-input__wrapper {
  border-radius: 8px !important;
  border: 1.2px solid #e0e7ef !important;
  box-shadow: none !important;
  background: #fff !important;
  padding: 0 12px !important;
}
.el-input__wrapper.is-focus {
  border: 1.2px solid #60a5fa !important;
  background: #fff !important;
  box-shadow: none !important;
}

/* 错误状态 */
.el-form-item.is-error .custom-input .el-input__wrapper {
  border-color: #FF3B30 !important; 
}

.custom-error-text {
  color: #FF3B30; 
  font-size: 0.75em;
  margin-top: 2px;
  margin-bottom: 0;
  display: flex;
  align-items: center;
  line-height: 1.2;
}

.custom-error-text .el-icon {
  margin-right: 3px;
  font-size: 0.9em;
}

/* 消息文本样式 - 与错误文本保持一致的字体大小 */
.custom-message-text {
  font-size: 0.75em;
  margin-top: 2px;
  margin-bottom: 0;
  display: flex;
  align-items: center;
  line-height: 1.2;
}

.custom-message-text .el-icon {
  margin-right: 3px;
  font-size: 0.9em;
}

.custom-message-text.is-success {
  color: #67C23A;
}

.custom-message-text.is-error {
  color: #FF3B30;
}

.custom-message-text.is-info {
  color: #409EFF;
}

/* 日期部分样式已移动到 custom-input-group */

/* 针对"获取日期"按钮的新样式，使其与"选择目录"按钮风格一致 */
.custom-date-action-button {
  border-radius: 6px !important;
  background-color: #f5f5f7 !important;
  border-color: #e0e0e0 !important; /* 更明显的边框 */
  color: #333 !important;
  padding: 8px 15px !important; /* 标准 Element Plus 小按钮的内边距 */
  font-size: 0.9em !important; /* 调整字体大小 */
  font-weight: 500;
  height: auto !important;
  flex-shrink: 0; /* 防止按钮收缩 */
  transition: all 0.15s ease !important;
  min-width: 100px;
}

.custom-date-action-button:hover,
.custom-date-action-button:focus {
  background-color: #e8e8ed !important; /* 匹配选择目录按钮的hover色 */
  border-color: #c0c4cc !important; /* 悬停时边框颜色更深 */
  transform: translateY(-0.5px) !important;
}

/* 推出移动磁盘按钮样式 */
.custom-eject-button {
  border-radius: 6px !important;
  padding: 8px 15px !important;
  font-size: 0.9em !important;
  font-weight: 500;
  height: auto !important;
  flex-shrink: 0;
  background-color: #f56c6c !important;
  border-color: #f56c6c !important;
  color: white !important;
  transition: all 0.15s ease !important;
  min-width: 100px;
}

.custom-eject-button:hover:not(:disabled),
.custom-eject-button:focus:not(:disabled) {
  background-color: #f23030 !important;
  border-color: #f23030 !important;
}

.custom-eject-button:disabled {
  background-color: #c0c4cc !important;
  border-color: #c0c4cc !important;
  color: #a8abb2 !important;
  cursor: not-allowed !important;
}

.custom-checkbox .el-checkbox__label .custom-label { 
  font-weight: normal; 
  font-size: 0.9em; 
}
.custom-checkbox .el-checkbox__input.is-checked .el-checkbox__inner {
  background-color: #0071E3;
  border-color: #0071E3;
}

.action-buttons, .custom-action-buttons-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 48px;
  margin-bottom: 48px;
  padding: 0;
  gap: 0;
}

.custom-action-button {
  border-radius: 6px !important;
  padding: 10px 20px !important;
  font-size: 0.95em !important;
  font-weight: 500;
  height: auto !important; 
}
.custom-action-button .el-icon {
  font-size: 1.1em;
}

.custom-primary-button {
  background-color: #0071E3 !important;
  border-color: #0071E3 !important;
  color: white !important;
  transition: all 0.2s ease !important;
}
.custom-primary-button:hover, .custom-primary-button:focus {
  background-color: #005bb5 !important;
  border-color: #005bb5 !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 4px 12px rgba(0, 113, 227, 0.3) !important;
}
.custom-primary-button:active {
  transform: translateY(0) !important;
  box-shadow: 0 2px 6px rgba(0, 113, 227, 0.2) !important;
}

.custom-secondary-button {
  background-color: #e9e9eb !important;
  border-color: #e0e0e0 !important; /* 添加边框 */
  color: #1d1d1f !important;
}
.custom-secondary-button:hover, .custom-secondary-button:focus {
  background-color: #dcdce0 !important;
  border-color: #c0c4cc !important; /* 悬停时边框颜色更深 */
}

/* 自定义进度容器样式 */
.custom-progress-container {
  width: 100%;
  padding: 20px 24px;
  background: linear-gradient(-225deg,#FFFEFF 0%, #D7FFFE 100%);
  border-radius: 12px;
  border: 1px solid #e1e8ed;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  margin-top: 0px;
}

.custom-progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.custom-progress-title {
  display: flex;
  align-items: center;
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.custom-progress-icon {
  margin-right: 8px;
  color: #0071E3;
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.custom-progress-percentage {
  font-size: 15px;
  font-weight: 600;
  color: #0071E3;
  background: rgba(0, 113, 227, 0.08);
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid rgba(0, 113, 227, 0.12);
}

.custom-progress-bar {
  margin: 8px 0;
}

.custom-progress-bar .el-progress-bar__outer {
  background-color: rgba(255, 255, 255, 0.8) !important;
  border-radius: 10px !important;
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.custom-progress-bar .el-progress-bar__inner {
  background: linear-gradient(90deg, #0071E3 0%, #005bb5 50%, #0071E3 100%) !important;
  border-radius: 10px !important;
  transition: width 0.3s ease;
}

/* 进度完成时的绿色样式 */
.custom-progress-bar.completed .el-progress-bar__inner {
  background: linear-gradient(90deg, #4CAF50 0%, #45a049 50%, #4CAF50 100%) !important;
}

.custom-progress-details {
  margin-top: 4px;
}

.custom-progress-message {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #5a6c7d;
  font-weight: 400;
}

.custom-progress-stats {
  margin: 0;
  font-size: 14px;
  color: #0071E3;
  font-weight: 500;
  background: none;
  padding: 0;
  border-radius: 0;
  border-left: none;
}

/* 页脚样式 */
.custom-app-footer {
  position: fixed; /* 固定定位 */
  bottom: 0; /* 距离底部0 */
  left: 0; /* 距离左侧0 */
  width: 100%; /* 宽度100% */
  height: 48px; /* 增加高度 */
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px; /* 增加左右内边距 */
  background: linear-gradient(180deg, rgba(239, 239, 244, 0.95) 0%, rgba(239, 239, 244, 1) 100%); /* 渐变背景 */
  border-top: 1px solid #d1d1d6; /* 稍微深一点的边框 */
  box-sizing: border-box; /* 包含padding和border在内的宽度计算 */
  z-index: 100; /* 确保在其他内容之上 */
  backdrop-filter: blur(10px); /* 毛玻璃效果 */
}

/* 确保链接样式保持一致 */
.footer-links {
  display: flex;
  align-items: center;
}

.custom-footer-link {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: #409EFF;
  font-size: 12px;
  /* margin-left: 15px; */ /* 这个 margin 应该只对 footer-links 内部的链接有效，或根据实际需求调整 */
}

.footer-links .custom-footer-link {
  margin-left: 15px;
}

.custom-footer-link .el-icon {
  margin-right: 5px;
}

.custom-footer-link .github-icon {
  margin-right: 5px;
  vertical-align: middle;
}

/* 使用说明弹窗样式 */
.el-dialog {
 border-radius: 10px !important;
}

.help-sections {
  max-height: 60vh;
  overflow-y: auto;
}

.help-section {
  margin-bottom: 24px;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #409EFF;
}

.help-section:last-child {
  margin-bottom: 0;
}

.help-section h4 {
  margin: 0 0 12px 0;
  font-size: 1.1em;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
}

.help-section ol,
.help-section ul {
  margin: 0;
  padding-left: 20px;
}

.help-section li {
  margin-bottom: 8px;
  line-height: 1.6;
  font-size: 0.9em;
  color: #606266;
}

.help-section p {
  margin: 8px 0;
  font-size: 0.9em;
  color: #606266;
}

.help-section code {
  background-color: #f1f2f3;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.85em;
  color: #e6a23c;
}

.help-section strong {
  color: #303133;
  font-weight: 600;
}

.el-form {
  padding-bottom: 120px; /* 为固定按钮留出空间 */
}

/* 针对输入框和按钮组合的新样式 */
.custom-input-group {
  display: flex;
  align-items: center;
  gap: 10px; /* 间距与日期选择器一致 */
  width: 100%;
  flex-wrap: nowrap; /* 不允许换行，保持在同一行 */
}

.custom-input-group .custom-input {
  flex: 1; /* 输入框占据剩余空间 */
  min-width: 0; /* 允许输入框收缩 */
}

.custom-input-group .custom-select {
  flex: 1; /* 选择器占据剩余空间 */
  min-width: 200px; /* 设置最小宽度 */
}

/* 日期选择器下拉选项居中显示 */
.custom-select .el-select-dropdown__item {
  text-align: center !important;
  justify-content: center !important;
}

/* 确保下拉框选项的文字居中 - 使用更具体的选择器 */
.el-select-dropdown .el-select-dropdown__item {
  text-align: center !important;
  justify-content: center !important;
}

/* 全局样式确保所有日期选择器的选项都居中 */
.el-select-dropdown__item {
  text-align: center !important;
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
}

/* 特别针对我们的日期选择器 */
.el-popper[data-popper-placement] .el-select-dropdown__item {
  text-align: center !important;
  justify-content: center !important;
}

/* 当移动磁盘输入框区域有推出按钮时的特殊样式 */
.custom-input-group .custom-date-action-button,
.custom-input-group .custom-eject-button {
  flex-shrink: 0; /* 防止按钮被压缩 */
  white-space: nowrap; /* 防止按钮文字换行 */
}

html, body {
  height: 100%;
  overflow: hidden;
}

.el-main {
  overflow: visible !important;
}

/* 主操作卡片样式 - 固定定位 */
.main-action-card {
  position: fixed;
  bottom: 68px; /* 页脚高度48px + 20px间距 */
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 520px;
  background: transparent;
  height: 80px;
  box-sizing: border-box;
  z-index: 50;
}

.action-button-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.main-action-card .main-action-button {
  margin-top: 0;
  margin-bottom: 0;
  min-width: 150px;
}

.main-action-card .custom-message-text {
  margin-bottom: 16px;
}

.main-progress-content {
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: fadeIn 0.5s;
  overflow: visible;
  padding: 0;
}

/* 淡入淡出动画 */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: none; }
}

.copy-progress-fullscreen {
  width: 100%;
  flex: 1;
  min-height: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: transparent;
  margin: 16px auto 0 auto;
  padding: 32px 24px;
  box-sizing: border-box;
}

.custom-progress-icon-large {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  margin-bottom: 8px;
}
.custom-progress-icon-large .custom-progress-icon {
  font-size: 40px !important;
  color: #0071E3;
  margin: 0;
  animation: spin 2s linear infinite;
}
.custom-progress-title {
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.copy-options-row {
  display: flex;
  align-items: center;
  gap: 32px;
}

.copy-options-row .el-checkbox__label {
  font-size: 13px;
  font-weight: 400;
  line-height: 1.2;
}

/* 全局样式 */
body {
  background: linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%);
}
.content-wrapper {
  background: rgba(255,255,255,0.7);
  border-radius: 22px;
  box-shadow: 0 8px 32px rgba(60, 60, 120, 0.18);
  padding: 36px 30px 18px 30px;
  backdrop-filter: blur(12px) saturate(180%);
  border: 1.5px solid rgba(255,255,255,0.18);
}
.custom-label {
  color: #2563eb !important;
  font-weight: 600;
}
.custom-input, .custom-select {
  border-radius: 14px !important;
  background: rgba(255,255,255,0.6) !important;
  border: 1.5px solid #e0e7ef !important;
  color: #2563eb !important;
  font-size: 13px !important;
  backdrop-filter: blur(2px);
}
.custom-date-action-button, .main-action-button, .custom-eject-button {
  border-radius: 14px !important;
  background: linear-gradient(90deg, #60a5fa 0%, #38bdf8 100%) !important;
  color: #fff !important;
  font-weight: 600 !important;
  border: none !important;
  box-shadow: 0 2px 8px rgba(96,165,250,0.10) !important;
}
.custom-date-action-button:hover, .main-action-button:hover {
  background: linear-gradient(90deg, #2563eb 0%, #38bdf8 100%) !important;
}
.custom-eject-button {
  background: linear-gradient(90deg, #fbbf24 0%, #f87171 100%) !important;
}
.custom-eject-button:hover {
  background: linear-gradient(90deg, #f87171 0%, #fbbf24 100%) !important;
}
.copy-options-row {
  gap: 16px !important;
}
.custom-checkbox {
  color: #2563eb !important;
}

</style> 