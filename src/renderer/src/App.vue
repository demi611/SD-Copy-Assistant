<template>
  <el-config-provider :locale="zhCn">
    <div id="app">
      <el-container>
        <el-main class="custom-main-content">
          <div class="content-wrapper">
            <Transition name="view-fade" mode="out-in">
              <div v-if="!copying" key="form" class="form-view">
                <div v-if="errorSummary" class="summary-alert">
                  <el-icon><WarningFilled /></el-icon>
                  {{ errorSummary }}
                </div>

                <el-form :model="form" label-position="top" class="settings-form">
                  <section class="settings-section destination-section">
                    <div class="section-heading">
                      <div>
                        <h3>保存位置</h3>
                        <p>先选择要拷贝的类型，再设置对应保存目录</p>
                      </div>
                    </div>

                    <el-form-item>
                      <div class="copy-options-row">
                        <el-checkbox
                          v-model="form.copyImages"
                          class="custom-checkbox"
                          @change="onCopyImagesChange">
                          拷贝照片
                        </el-checkbox>
                        <el-checkbox
                          v-model="form.copyVideos"
                          class="custom-checkbox"
                          @change="onCopyVideosChange">
                          拷贝视频
                        </el-checkbox>
                      </div>
                      <div v-if="!form.copyImages && !form.copyVideos" class="custom-error-text">
                        <el-icon><WarningFilled /></el-icon>请至少选择"拷贝照片"或"拷贝视频"
                      </div>
                      <div v-else-if="errors.general" class="custom-error-text">
                        <el-icon><WarningFilled /></el-icon>{{ errors.general }}
                      </div>
                      <div v-if="form.copyImages" class="nested-option-row">
                        <span class="nested-option-guide">照片选项</span>
                        <el-checkbox
                          v-model="form.separateRawJpg"
                          class="custom-checkbox nested-checkbox">
                          RAW和JPG分开保存
                        </el-checkbox>
                      </div>
                    </el-form-item>

                    <el-form-item v-if="form.copyImages" :class="{ 'is-error': errors.imageTargetDir }">
                      <template #label>
                        <span class="custom-label">
                          <el-icon><Picture /></el-icon>图片目标目录
                        </span>
                      </template>
                      <div class="custom-input-group">
                        <el-input
                          v-model="form.imageTargetDir"
                          placeholder="选择图片目标目录"
                          class="custom-input path-input"
                          :title="form.imageTargetDir"
                          readonly
                          spellcheck="false"
                        />
                        <el-button @click="selectImageDir" class="custom-date-action-button secondary-button">
                          <el-icon><FolderOpened /></el-icon>选择目录
                        </el-button>
                      </div>
                      <div v-if="errors.imageTargetDir" class="custom-error-text">
                        <el-icon><WarningFilled /></el-icon>{{ errors.imageTargetDir }}
                      </div>
                    </el-form-item>

                    <el-form-item v-if="form.copyVideos" :class="{ 'is-error': errors.videoTargetDir }">
                      <template #label>
                        <span class="custom-label">
                          <el-icon><Film /></el-icon>视频目标目录
                        </span>
                      </template>
                      <div class="custom-input-group">
                        <el-input
                          v-model="form.videoTargetDir"
                          placeholder="选择视频目标目录"
                          class="custom-input path-input"
                          :title="form.videoTargetDir"
                          readonly
                          spellcheck="false"
                        />
                        <el-button @click="selectVideoDir" class="custom-date-action-button secondary-button">
                          <el-icon><FolderOpened /></el-icon>选择目录
                        </el-button>
                      </div>
                      <div v-if="errors.videoTargetDir" class="custom-error-text">
                        <el-icon><WarningFilled /></el-icon>{{ errors.videoTargetDir }}
                      </div>
                    </el-form-item>

                    <div v-if="!form.copyImages && !form.copyVideos" class="target-placeholder-row">
                      选择照片或视频后，这里会显示对应的保存目录。
                    </div>
                    <div v-else-if="form.copyImages && !form.copyVideos" class="target-placeholder-row">
                      如需同时拷贝视频，可勾选“拷贝视频”后设置视频目录。
                    </div>
                    <div v-else-if="!form.copyImages && form.copyVideos" class="target-placeholder-row">
                      如需同时拷贝照片，可勾选“拷贝照片”后设置图片目录。
                    </div>
                  </section>

                  <section class="settings-section">
                    <div class="section-heading">
                      <div>
                        <h3>来源磁盘</h3>
                        <p>插入移动磁盘后会自动识别，也可以手动选择</p>
                      </div>
                    </div>
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
                          class="custom-input path-input"
                          :title="form.sdCardDir"
                          readonly
                          spellcheck="false"
                          @blur="sdDirTouched = true"
                          clearable
                          @clear="onSdCardDirClear"
                        />
                        <el-button
                          v-if="shouldShowSelectDir"
                          @click="selectSdCardDir"
                          class="custom-date-action-button secondary-button">
                          <el-icon><FolderOpened /></el-icon>选择目录
                        </el-button>
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
                      <div v-else-if="!form.sdCardDir" class="source-empty-state">
                        <el-icon><InfoFilled /></el-icon>
                        未检测到移动磁盘，可插入后等待自动识别，或手动选择目录。
                      </div>
                      <div v-if="messages.sdCard" class="custom-message-text" :class="`is-${messages.sdCardType}`">
                        <el-icon v-if="messages.sdCardType === 'success'"><SuccessFilled /></el-icon>
                        <el-icon v-else-if="messages.sdCardType === 'error'"><WarningFilled /></el-icon>
                        <el-icon v-else><InfoFilled /></el-icon>
                        {{ messages.sdCard }}
                      </div>
                    </el-form-item>
                  </section>

                  <section class="settings-section">
                    <div class="section-heading">
                      <div>
                        <h3>拷贝设置</h3>
                        <p>填写拍摄主题并选择要拷贝的日期</p>
                      </div>
                    </div>
                    <el-form-item>
                      <template #label>
                        <span class="custom-label optional-label">
                          <el-icon><PriceTag /></el-icon>拍摄主题（可选）
                        </span>
                      </template>
                      <div class="custom-input-group">
                        <el-input
                          v-model="form.activityName"
                          placeholder="不填默认为：媒体文件"
                          class="custom-input"
                          spellcheck="false"
                          clearable
                          @clear="onActivityNameClear"
                        >
                          <template #suffix>
                            <el-icon><EditPen /></el-icon>
                          </template>
                        </el-input>
                      </div>
                    </el-form-item>

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
                          collapse-tags
                          collapse-tags-tooltip
                          :max-collapse-tags="3"
                          :placeholder="dateSelectPlaceholder"
                          class="custom-select"
                          :disabled="!canSelectDates"
                          @change="onDateSelectionChange"
                        >
                          <el-option label="全部日期" :value="ALL_DATES_VALUE"></el-option>
                          <el-option
                            v-for="date in availableDates"
                            :key="date"
                            :label="date"
                            :value="date">
                          </el-option>
                        </el-select>
                        <el-button
                          @click="scanDates"
                          :loading="scanningDates"
                          :disabled="!form.sdCardDir || scanningDates"
                          class="custom-date-action-button secondary-button date-scan-button">
                          <el-icon><RefreshRight /></el-icon>
                          {{ dateScanButtonText }}
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
                    <div v-if="copyResult" class="copy-result-card" :class="{ 'is-error': !copyResult.success }">
                      <div class="copy-result-title">
                        <el-icon v-if="copyResult.success"><SuccessFilled /></el-icon>
                        <el-icon v-else><WarningFilled /></el-icon>
                        {{ copyResult.message || (copyResult.success ? '拷贝完成' : '拷贝未完成') }}
                      </div>
                      <div v-if="copyResult.summary" class="copy-result-grid">
                        <div>
                          <span>总数</span>
                          <strong>{{ copyResult.summary.total }}</strong>
                        </div>
                        <div>
                          <span>成功</span>
                          <strong>{{ copyResult.summary.copied }}</strong>
                        </div>
                        <div>
                          <span>跳过</span>
                          <strong>{{ copyResult.summary.skipped }}</strong>
                        </div>
                        <div>
                          <span>失败</span>
                          <strong>{{ copyResult.summary.failed }}</strong>
                        </div>
                        <div v-if="copyResult.summary.renamed > 0">
                          <span>改名保存</span>
                          <strong>{{ copyResult.summary.renamed }}</strong>
                        </div>
                      </div>
                      <div v-if="copyResult.errors && copyResult.errors.length > 0" class="copy-result-errors">
                        {{ copyResult.errors.slice(0, 2).join('；') }}{{ copyResult.errors.length > 2 ? '；...' : '' }}
                      </div>
                    </div>
                  </section>
                </el-form>

                <div class="main-action-card">
                  <div v-if="startCopyHint" class="main-action-hint">{{ startCopyHint }}</div>
                  <div class="main-action-error" v-if="errors.general">
                    <el-icon><WarningFilled /></el-icon>{{ errors.general }}
                  </div>
                  <div class="action-button-container">
                    <el-button
                      type="primary"
                      @click="startCopy"
                      :disabled="!canStartCopy"
                      :title="startCopyHint"
                      class="main-action-button"
                      key="main-action-btn"
                    >
                      <el-icon><VideoPlay /></el-icon>
                      开始拷贝
                    </el-button>
                  </div>
                </div>
              </div>
              <div v-else key="progress" class="copy-progress-fullscreen">
                <div class="main-progress-content">
                  <div class="custom-progress-icon-large">
                    <el-icon v-if="copyFinished" class="custom-progress-icon is-complete"><SuccessFilled /></el-icon>
                    <el-icon v-else class="custom-progress-icon"><Loading /></el-icon>
                  </div>
                  <div class="custom-progress-title">
                    {{ progressTitle }}
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
                    <p class="custom-progress-stats" v-if="estimatedTimeLeft">
                      预计剩余时间：{{ estimatedTimeLeft }}
                    </p>
                    <el-button
                      v-if="!copyFinished"
                      class="cancel-copy-button"
                      :loading="cancelingCopy"
                      :disabled="cancelingCopy"
                      @click="cancelCopy"
                    >
                      取消拷贝
                    </el-button>
                  </div>
                </div>
              </div>
            </Transition>
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
               <li><strong>拍摄主题：</strong>可选，用于文件夹命名（如"旅行照片"），默认为"媒体文件"</li>
               <li><strong>日期选择：</strong>支持多选特定日期或选择全部，日期按最新优先排序</li>
               <li><strong>RAW+JPG分离：</strong>勾选后会自动创建RAW和JPG子文件夹</li>
            </ul>
          </div>

          <div class="help-section">
            <h4>📁 文件组织</h4>
            <p>拷贝后的文件夹结构：<code>日期_拍摄主题</code></p>
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
import type { CopyOperationResult, FileCopyRequest, FileCopyProgress } from '../../preload'

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
  copyVideos: false
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
const cancelingCopy = ref(false)
const copyStartTime = ref<number | null>(null)
const estimatedTimeLeft = ref('')
const copyResult = ref<CopyOperationResult | null>(null)
const hasSubmitted = ref(false)

const removableDrives = ref<Array<{ path: string, label: string }>>([])
const ALL_DATES_VALUE = 'all'
let scanDatesRequestId = 0
let previousSelectedDates: string[] = []

const dateScanButtonText = computed(() => {
  if (scanningDates.value) {
    return '扫描中'
  }

  if (availableDates.value.length > 0 || form.selectedDates.length > 0) {
    return '重新扫描'
  }

  return '获取日期'
})

const canSelectDates = computed(() => form.sdCardDir && availableDates.value.length > 0)

const dateSelectPlaceholder = computed(() => {
  if (!form.sdCardDir) {
    return '先选择移动磁盘目录'
  }

  if (availableDates.value.length === 0) {
    return '获取日期后选择要拷贝的日期'
  }

  return '选择要拷贝的日期'
})

const validationIssues = computed(() => {
  const issues: Array<{ field: keyof typeof errors | 'sdCardDir' | 'copyTypes'; message: string }> = []

  if (!form.copyImages && !form.copyVideos) {
    issues.push({ field: 'copyTypes', message: '请至少选择照片或视频' })
  }

  if (form.copyImages && !form.imageTargetDir) {
    issues.push({ field: 'imageTargetDir', message: '请选择图片存储目录' })
  }

  if (form.copyVideos && !form.videoTargetDir) {
    issues.push({ field: 'videoTargetDir', message: '请选择视频存储目录' })
  }

  if (!form.sdCardDir) {
    issues.push({ field: 'sdCardDir', message: '请选择移动磁盘目录' })
  }

  if (form.selectedDates.length === 0) {
    issues.push({ field: 'selectedDates', message: '请至少选择一个日期或"全部日期"' })
  }

  return issues
})

const startCopyHint = computed(() => {
  const firstIssue = validationIssues.value[0]
  if (!firstIssue) {
    return ''
  }

  if (firstIssue.field === 'imageTargetDir' || firstIssue.field === 'videoTargetDir') {
    return '请先选择保存目录'
  }

  if (firstIssue.field === 'selectedDates') {
    return '请先获取并选择拍摄日期'
  }

  return firstIssue.message
})

const canStartCopy = computed(() => !scanningDates.value && !startCopyHint.value)

const copyFinished = computed(() => copyProgress.value >= 100)

const progressTitle = computed(() => {
  if (copyFinished.value) {
    return errors.general ? '拷贝完成，但有问题' : '拷贝完成'
  }

  if (cancelingCopy.value) {
    return '正在取消拷贝'
  }

  return '正在拷贝文件'
})

const errorSummary = computed(() => {
  if (!hasSubmitted.value) {
    return ''
  }

  const errorList = [
    errors.imageTargetDir,
    errors.videoTargetDir,
    !form.sdCardDir && sdDirTouched.value ? '请选择移动磁盘目录' : '',
    errors.selectedDates,
    errors.general
  ].filter(Boolean)

  if (errorList.length <= 1) {
    return ''
  }

  return `请先处理 ${errorList.length} 项问题：${errorList[0]}`
})

const applyValidationErrors = () => {
  clearErrors()

  for (const issue of validationIssues.value) {
    if (issue.field === 'imageTargetDir') {
      errors.imageTargetDir = issue.message
    } else if (issue.field === 'videoTargetDir') {
      errors.videoTargetDir = issue.message
    } else if (issue.field === 'selectedDates') {
      errors.selectedDates = issue.message
    } else if (issue.field === 'copyTypes') {
      errors.general = issue.message
    }
  }

  return validationIssues.value.length > 0
}

const onCopyImagesChange = () => {
  errors.general = ''
  errors.imageTargetDir = ''

  if (!form.copyImages) {
    form.separateRawJpg = false
  }
}

const onCopyVideosChange = () => {
  errors.general = ''
  errors.videoTargetDir = ''
}

const resetSelectedDates = () => {
  form.selectedDates = []
  previousSelectedDates = []
}

const setSelectedDates = (dates: string[]) => {
  form.selectedDates = dates
  previousSelectedDates = [...dates]
}

const getAllDateSelection = () => [ALL_DATES_VALUE, ...availableDates.value]

const onDateSelectionChange = (selection: string[]) => {
  const hadAll = previousSelectedDates.includes(ALL_DATES_VALUE)
  const hasAll = selection.includes(ALL_DATES_VALUE)
  const selectedDatesOnly = selection.filter((date) => date !== ALL_DATES_VALUE)
  const allRealDatesSelected = availableDates.value.length > 0
    && availableDates.value.every((date) => selectedDatesOnly.includes(date))

  errors.selectedDates = ''

  if (hasAll && !hadAll) {
    setSelectedDates(getAllDateSelection())
    return
  }

  if (!hasAll && hadAll) {
    resetSelectedDates()
    return
  }

  if (hasAll && !allRealDatesSelected) {
    setSelectedDates(selectedDatesOnly)
    return
  }

  if (!hasAll && allRealDatesSelected) {
    setSelectedDates(getAllDateSelection())
    return
  }

  setSelectedDates(selection)
}

const withTimeout = async <T,>(promise: Promise<T>, ms: number, message: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

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
      messages.sdCard = `检测到移动磁盘：${drives[0].label}。请点击“获取日期”。`;
      messages.sdCardType = 'success'
      setTimeout(() => {
        if (messages.sdCard && messages.sdCard.includes('检测到移动磁盘')) {
          messages.sdCard = ''
        }
      }, 5000)
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

      // 计算预计剩余时间
      if (copyStartTime.value && processedFiles.value > 0 && totalFiles.value > 0 && copyProgress.value < 100) {
        const elapsed = (Date.now() - copyStartTime.value) / 1000; // 秒
        const avgPerFile = elapsed / processedFiles.value;
        const leftFiles = totalFiles.value - processedFiles.value;
        const leftSec = Math.round(leftFiles * avgPerFile);
        estimatedTimeLeft.value = formatSeconds(leftSec);
      } else if (copyProgress.value === 100) {
        estimatedTimeLeft.value = '';
      }

      if (progress.error) {
        errors.general = progress.error;
      }

      if (progress.percentage === 100) {
        setTimeout(() => {
          copying.value = false;
        }, 500);
      }
    }
  };

  unsubscribeFileCopyProgress = window.electron.onFileCopyProgress(progressHandler);

  // 设置移动磁盘事件监听
  unsubscribeSDCardInserted = window.electron.onSDCardInserted((drive) => {
    form.sdCardDir = drive.path;
    sdDirTouched.value = false;
    availableDates.value = [];
    resetSelectedDates()
    refreshRemovableDrives()
    messages.sdCard = `检测到移动磁盘插入：${drive.label}。请点击“获取日期”。`;
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
    hasSubmitted.value = false
    form.imageTargetDir = dir;
    errors.imageTargetDir = ''; // 清除错误
  }
}
const selectVideoDir = async () => {
  const dir = await selectDirectory();
  if (dir) {
    hasSubmitted.value = false
    form.videoTargetDir = dir;
    errors.videoTargetDir = ''; // 清除错误
  }
}
const selectSdCardDir = async () => {
  const dir = await selectDirectory();
  if (dir) {
    hasSubmitted.value = false
    form.sdCardDir = dir;
    availableDates.value = [];
    resetSelectedDates()
    messages.sdCard = '已选择移动磁盘目录，请点击“获取日期”。';
    messages.sdCardType = 'success'
    await refreshRemovableDrives()
  }
  sdDirTouched.value = true;
}

const scanDates = async () => {
  if (scanningDates.value) {
    return
  }

  // 清除之前的错误信息
  clearErrors()
  clearMessages()
  sdDirTouched.value = true; // 如果尝试扫描但未选择，也标记为已触碰

  if (!form.sdCardDir) {
    // 移动磁盘错误已经通过现有的逻辑处理
    return;
  }

  const currentRequestId = ++scanDatesRequestId
  scanningDates.value = true;
  statusMessage.value = '正在扫描文件日期...';
  try {
    window.electron.logMessage('info', 'Requesting media file dates for:', form.sdCardDir);
    const dates = await withTimeout(
      window.electron.scanMediaFileDates(form.sdCardDir),
      120000,
      '扫描超过 2 分钟，请确认磁盘可正常读取，或手动选择相机照片目录后重试。'
    );

    if (currentRequestId !== scanDatesRequestId) {
      return
    }

    if (dates.length === 0) {
      messages.dates = '在选定目录中未找到符合条件的图片或视频文件';
      messages.datesType = 'error'
      availableDates.value = [];
    } else {
      availableDates.value = dates;
      messages.dates = `扫描完成！共找到 ${dates.length} 个不同日期。请在下拉框中选择。`
      messages.datesType = 'success'
      // 成功提示短暂停留，避免长期挤占表单空间。
      setTimeout(() => {
        if (messages.dates.includes('扫描完成')) {
          messages.dates = ''
        }
      }, 5000)
    }
    resetSelectedDates()
  } catch (error: any) {
    if (currentRequestId !== scanDatesRequestId) {
      return
    }

    window.electron.logMessage('error', '扫描日期失败:', form.sdCardDir, error.message);
    messages.dates = error.message || '扫描日期失败，请确认磁盘可正常读取。';
    messages.datesType = 'error'
  } finally {
    if (currentRequestId === scanDatesRequestId) {
      scanningDates.value = false;
      statusMessage.value = '';
    }
  }
}

const startCopy = async () => {
  // 清除之前的错误信息
  clearMessages()
  hasSubmitted.value = true
  sdDirTouched.value = true; // 尝试拷贝时标记为已触碰

  if (applyValidationErrors()) return;

  copying.value = true;
  copyProgress.value = 0;
  statusMessage.value = '正在初始化拷贝...';
  copyStartTime.value = Date.now();
  estimatedTimeLeft.value = '';

  window.electron.logMessage('debug', '[App.vue] form.selectedDates before sending:', JSON.parse(JSON.stringify(form.selectedDates)));

  // 如果拍摄主题为空，使用默认名称
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

    copyResult.value = result;
    messages.copyResult = formatCopyResult(result);
    messages.copyResultType = result.success ? 'success' : 'error';

    if (result.errors && result.errors.length > 0) {
      window.electron.logMessage('error', '文件拷贝完成但有错误:', result.errors);
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
     cancelingCopy.value = false;
  }
}

const cancelCopy = async () => {
  cancelingCopy.value = true;
  statusMessage.value = '正在取消拷贝，当前文件处理完后会停止...';

  try {
    await window.electron.cancelFileCopy();
  } catch (error: any) {
    cancelingCopy.value = false;
    statusMessage.value = '取消拷贝失败：' + error.message;
  }
}

const formatCopyResult = (result: CopyOperationResult): string => {
  const summary = result.summary;
  const lines = [result.message || (result.success ? '拷贝完成' : '拷贝过程中发生错误')];

  if (summary) {
    lines.push(`总数：${summary.total} 个`);
    lines.push(`成功：${summary.copied} 个`);
    if (summary.renamed > 0) lines.push(`同名改名保存：${summary.renamed} 个`);
    if (summary.skipped > 0) lines.push(`跳过重复：${summary.skipped} 个`);
    if (summary.failed > 0) lines.push(`失败：${summary.failed} 个`);
  }

  if (result.errors && result.errors.length > 0) {
    lines.push(`错误示例：${result.errors.slice(0, 3).join('；')}${result.errors.length > 3 ? '；...' : ''}`);
  }

  return lines.join('\n');
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
  scanDatesRequestId++
  scanningDates.value = false
  hasSubmitted.value = false
  form.sdCardDir = '';
  availableDates.value = [];
  resetSelectedDates()
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
  copyResult.value = null
}

// 处理拍摄主题输入框清空事件
const onActivityNameClear = () => {
  form.activityName = ''
}

const isRemovableDrive = (dir: string) => {
  return removableDrives.value.some((d) => d.path === dir);
};
const shouldShowSelectDir = computed(() => !form.sdCardDir || !isRemovableDrive(form.sdCardDir));
const shouldShowEject = computed(() => form.sdCardDir && isRemovableDrive(form.sdCardDir));

function formatSeconds(sec: number) {
  if (isNaN(sec) || sec < 0) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m > 0) return `${m}分${s.toString().padStart(2, '0')}秒`;
  return `${s}秒`;
}

</script>

<style>
/* 基础重置 */
html, body, #app {
  height: 100vh;
  width: 100vw;
  margin: 0;
  padding: 0;
  overflow: hidden;
  box-sizing: border-box;
}

#app {
  display: flex;
  flex-direction: column;
}

body {
  background: #eef2f7;
}

#app .el-container {
  flex: 1;
  min-height: 0;
  height: auto;
}

.el-main {
  overflow: auto;
}

/* 布局容器 */
.custom-main-content {
  max-width: 760px;
  background: #f7f9fc;
  box-shadow: none;
  padding: 0 !important;
  min-height: 0;
}

.content-wrapper {
  background: #f7f9fc;
  padding: 18px 24px 0;
  min-height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.form-view {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  min-height: 0;
  box-sizing: border-box;
}

/* 表单 */
.settings-form {
  padding-bottom: 0;
  flex: 0 0 auto;
}

.settings-section {
  padding: 10px 0 8px;
  border-top: 1px solid #e4e9f2;
}

.settings-section:first-of-type {
  border-top: none;
  padding-top: 0;
}

.destination-section {
  min-height: 180px;
  box-sizing: border-box;
}

.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin: 0 0 6px;
  padding: 0 6px;
}

.section-heading > div {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.section-heading h3 {
  margin: 0;
  color: #162033;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.section-heading p {
  margin: 0;
  color: #788397;
  font-size: 11px;
  line-height: 1.35;
}

.summary-alert {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
  padding: 9px 12px;
  border: 1px solid #ffd7a6;
  border-radius: 8px;
  background: #fff8ed;
  color: #9a5a00;
  font-size: 13px;
  line-height: 1.35;
}

.summary-alert .el-icon {
  flex-shrink: 0;
}

.el-form-item {
  margin-bottom: 6px;
  padding: 0 6px;
}

.el-form-item:has(.custom-error-text),
.el-form-item:has(.custom-message-text) {
  margin-bottom: 6px;
}

.el-form-item__label {
  line-height: 18px !important;
  margin-bottom: 4px !important;
  padding: 0 !important;
}

/* 标签和输入 */
.custom-label {
  color: #2f5fb8 !important;
  font-size: 12px;
  font-weight: 650;
}

.custom-label .el-icon {
  color: #4c7edb;
  font-size: 1em;
}

.optional-label {
  opacity: 0.82;
}

.custom-input-group {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.custom-input,
.custom-select {
  color: #2d3748 !important;
  flex: 1;
  min-width: 0;
}

.custom-input .el-input__wrapper,
.custom-select .el-select__wrapper {
  height: 32px;
  min-height: 32px;
  max-height: 32px;
  border-radius: 8px !important;
  background: #fff !important;
  border: 1px solid #dbe3ee !important;
  box-shadow: none !important;
  overflow: hidden;
  padding: 0 12px !important;
}

.custom-input .el-input__inner,
.custom-select .el-select__placeholder,
.custom-select .el-select__selected-item {
  height: 30px !important;
  line-height: 30px !important;
  font-size: 12px !important;
}

.custom-input .el-input__suffix,
.custom-select .el-select__suffix {
  height: 30px !important;
  line-height: 30px !important;
}

.custom-select .el-select__selection {
  flex-wrap: nowrap !important;
  overflow: hidden;
}

.custom-select .el-tag {
  max-width: 96px;
}

.custom-select .el-tag__content {
  overflow: hidden;
  text-overflow: ellipsis;
}

.path-input .el-input__inner {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.custom-input .el-input__wrapper.is-focus,
.custom-select .el-select__wrapper.is-focused {
  border-color: #3478f6 !important;
}

.el-form-item.is-error .custom-input .el-input__wrapper,
.el-form-item.is-error .custom-input .el-input__wrapper.is-focus,
.el-form-item.is-error .custom-select .el-select__wrapper,
.el-form-item.is-error .custom-select .el-select__wrapper.is-focused {
  border-color: #ff3b30 !important;
}

.source-empty-state {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
  color: #8490a3;
  font-size: 11px;
  line-height: 1.3;
}

/* 按钮 */
.custom-date-action-button,
.secondary-button {
  min-width: 104px;
  width: 104px;
  height: 32px !important;
  border-radius: 8px !important;
  background: #fff !important;
  border: 1px solid #d6deea !important;
  color: #2f5fb8 !important;
  box-shadow: none !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  transform: none !important;
}

.custom-date-action-button:hover,
.secondary-button:hover {
  background: #f3f7ff !important;
  border-color: #9db7e8 !important;
}

.custom-date-action-button.is-disabled,
.custom-date-action-button.is-disabled:hover,
.secondary-button.is-disabled,
.secondary-button.is-disabled:hover {
  color: #a8b2c3 !important;
  background: #f6f8fb !important;
  border-color: #e1e7f0 !important;
}

.date-scan-button {
  width: 112px;
  min-width: 112px;
}

.custom-eject-button {
  min-width: 104px;
  width: 104px;
  height: 32px !important;
  border-radius: 8px !important;
  background: #fff !important;
  border: 1px solid #d6deea !important;
  color: #b45309 !important;
  box-shadow: none !important;
  font-size: 12px !important;
  font-weight: 600 !important;
}

.custom-eject-button:hover {
  background: #fff7ed !important;
  border-color: #fdba74 !important;
}

/* 复选框 */
.copy-options-row {
  display: flex;
  justify-content: flex-start;
  gap: 32px;
  flex-wrap: nowrap;
}

.copy-options-row .el-checkbox {
  margin-right: 0 !important;
  flex: 0 0 auto;
  white-space: nowrap;
}

.copy-options-row .el-checkbox__label {
  color: #2f5fb8;
  font-size: 12px !important;
}

.custom-checkbox {
  color: #2f5fb8 !important;
}

.custom-checkbox .el-checkbox__input.is-checked .el-checkbox__inner {
  background-color: #1769e0;
  border-color: #1769e0;
}

.nested-option-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  margin-left: 26px;
  padding-left: 12px;
  border-left: 2px solid #d7e3f5;
}

.nested-option-guide {
  color: #7b8798;
  font-size: 11px;
  line-height: 1;
}

.nested-checkbox .el-checkbox__label {
  color: #4c6f9f !important;
  font-size: 12px !important;
  font-weight: 600 !important;
}

.nested-checkbox .el-checkbox__inner {
  width: 14px;
  height: 14px;
}

.target-placeholder-row {
  margin: 0 6px 0;
  padding: 7px 12px;
  border: 1px dashed #d7e3f1;
  border-radius: 8px;
  color: #7c8798;
  font-size: 11px;
  line-height: 1.35;
  background: rgba(255, 255, 255, 0.42);
}

/* 主操作区 */
.main-action-card {
  position: relative;
  margin: 12px 0 14px;
  width: 100%;
  padding: 0;
  background: transparent;
  border-top: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 56px;
}

.action-button-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

.main-action-card .main-action-button {
  min-width: 170px;
  height: 35px !important;
  border-radius: 10px !important;
  background: #1769e0 !important;
  border-color: #1769e0 !important;
  color: #fff !important;
  box-shadow: 0 8px 18px rgba(23, 105, 224, 0.18) !important;
  font-size: 13px !important;
  font-weight: 700 !important;
}

.main-action-card .main-action-button:hover {
  background: #0f5dca !important;
}

.main-action-card .main-action-button.is-disabled,
.main-action-card .main-action-button.is-disabled:hover {
  background: #d9e2f1 !important;
  border-color: #d9e2f1 !important;
  color: #8796ad !important;
  box-shadow: none !important;
}

.main-action-hint {
  margin-bottom: 1px;
  color: #7b8798;
  font-size: 11px;
  line-height: 1.2;
}

.main-action-error {
  position: absolute;
  top: -46px;
  left: 50%;
  transform: translateX(-50%);
  color: #FF3B30;
  font-size: 0.95em;
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 6px;
  padding: 6px 16px;
  box-shadow: 0 2px 8px rgba(255,59,48,0.08);
  border: 1px solid #ffd4d4;
  white-space: nowrap;
}

.copy-result-card {
  margin: 4px 6px 0;
  padding: 8px 12px;
  border: 1px solid #cfe7d2;
  border-radius: 9px;
  background: #f4fbf5;
  color: #246b2f;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 14px;
  min-height: 42px;
  box-sizing: border-box;
}

.copy-result-card.is-error {
  border-color: #ffd4d4;
  background: #fff7f7;
  color: #a92f2f;
}

.copy-result-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.3;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.copy-result-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-top: 0;
  justify-content: flex-end;
}

.copy-result-grid div {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.copy-result-grid span {
  color: #6f7c8f;
  font-size: 11px;
}

.copy-result-grid strong {
  color: inherit;
  font-size: 13px;
}

.copy-result-errors {
  grid-column: 1 / -1;
  margin-top: 6px;
  font-size: 11px;
  line-height: 1.35;
}

/* 错误和消息文本 */
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

.custom-message-text {
  font-size: 0.75em;
  margin-top: 2px;
  margin-bottom: 0;
  display: flex;
  align-items: center;
  line-height: 1.2;
  white-space: pre-line;
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

/* 页脚 */
.custom-app-footer {
  position: static;
  flex-shrink: 0;
  width: 100%;
  height: 48px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  background: #f3f6fb;
  border-top: 1px solid #dfe5ee;
  box-sizing: border-box;
}

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

/* 弹窗 */
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

/* 下拉选项居中 */
.custom-select .el-select-dropdown__item {
  text-align: center !important;
  justify-content: center !important;
}

.el-select-dropdown .el-select-dropdown__item {
  text-align: center !important;
  justify-content: center !important;
}

.el-select-dropdown__item {
  text-align: center !important;
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
}

.el-popper[data-popper-placement] .el-select-dropdown__item {
  text-align: center !important;
  justify-content: center !important;
}

/* 进度页面 */
.copy-progress-fullscreen {
  width: 100%;
  flex: 1;
  min-height: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: transparent;
  margin: 0 auto;
  padding: 32px 24px;
  box-sizing: border-box;
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

.custom-progress-icon-large {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  margin-bottom: 8px;
}

.custom-progress-icon-large .custom-progress-icon {
  font-size: 40px !important;
  color: #1769e0;
  margin: 0;
  animation: spin 2s linear infinite;
}

.custom-progress-icon-large .custom-progress-icon.is-complete {
  color: #237a3b;
  animation: none;
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

.custom-progress-percentage {
  font-size: 15px;
  font-weight: 600;
  color: #1769e0;
  background: rgba(23, 105, 224, 0.08);
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid rgba(23, 105, 224, 0.12);
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
  background: linear-gradient(90deg, #1769e0 0%, #4c9aff 50%, #1769e0 100%) !important;
  border-radius: 10px !important;
  transition: width 0.3s ease;
}

.custom-progress-bar.completed .el-progress-bar__inner {
  background: linear-gradient(90deg, #4CAF50 0%, #45a049 50%, #4CAF50 100%) !important;
}

.custom-progress-details {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.custom-progress-message {
  margin: 0 0 8px 0;
  max-width: 340px;
  font-size: 14px;
  color: #5a6c7d;
  font-weight: 400;
  line-height: 1.45;
  word-break: break-all;
}

.custom-progress-stats {
  margin: 0 0 4px;
  font-size: 14px;
  color: #1769e0;
  font-weight: 500;
  line-height: 1.35;
}

.cancel-copy-button {
  margin-top: 14px !important;
  min-width: 116px;
  border-radius: 10px !important;
}

/* 移动磁盘消息 */
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

/* 动画 */
.view-fade-enter-active,
.view-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.view-fade-enter-from,
.view-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: none; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 响应式 */
@media (max-width: 720px) {
  .custom-input-group {
    align-items: center;
    flex-direction: row;
  }

  .custom-date-action-button,
  .custom-eject-button {
    width: 104px;
  }
}
</style>
