# 光影拷卡助手

一款专为摄影师设计的跨平台桌面工具，用于将相机存储卡中的照片和视频高效、安全地拷贝到电脑，并自动按日期和活动名称整理归档。

![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows%20%7C%20Linux-blue)
![Version](https://img.shields.io/badge/Version-1.0.3-green)
![Tech](https://img.shields.io/badge/Tech-Electron%20%7C%20Vue3%20%7C%20TypeScript-orange)

## 核心功能

### 智能磁盘识别
- **自动检测可移动磁盘**：实时扫描插入的U盘、SD卡、移动硬盘，自动识别相机存储卡（通过DCIM等典型目录判断）
- **插拔状态监控**：1秒间隔轮询，磁盘插入或移除时自动通知界面
- **一键安全推出**：支持macOS（diskutil）、Windows（Shell.Application）、Linux（umount）安全卸载

### 灵活的拷贝策略
- **按日期筛选**：自动提取文件日期，支持单选、多选或全选日期进行拷贝。JPG/JPEG优先读取EXIF拍摄日期，其他文件使用修改时间
- **活动命名**：自定义活动名称，文件夹自动命名为 `YYYYMMDD_活动名称` 格式
- **分类存储**：图片和视频可分别设置不同的目标目录
- **RAW+JPG分离**：开启后，RAW文件和JPG文件自动存入同日期文件夹下的 `RAW/` 和 `JPG/` 子目录
- **照片/视频开关**：可独立选择只拷贝照片、只拷贝视频，或两者都拷贝

### 数据安全与校验
- **SHA256哈希校验**：拷贝后逐文件对比源文件与目标文件的SHA256哈希值，确保数据完整
- **智能重复处理**：目标位置已存在同名文件时，对比哈希值——内容相同则跳过，内容不同则自动重命名保存（如 `IMG_001_1.jpg`）
- **磁盘空间预检**：拷贝前自动计算所需空间，若目标磁盘空间不足（含512MB缓冲）提前报错，避免拷贝到一半失败
- **取消拷贝**：拷贝过程中可随时取消，已拷贝文件保留，未拷贝文件中止

### 用户体验
- **实时进度反馈**：可视化进度条，显示当前处理文件名、百分比、剩余时间估算
- **结果统计**：拷贝完成后展示成功、重命名、跳过、失败的数量明细
- **完整日志**：操作日志自动写入用户目录，按天切分，保留最近7天
- **中文界面**：基于 Element Plus 的现代化中文界面

## 支持格式

| 类型 | 格式 |
|------|------|
| 图片 | JPG、JPEG、PNG、RAW、NEF、CR2、CR3、ARW、DNG、RAF、ORF、PEF、SRW、X3F |
| 视频 | MP4、AVI、MOV、INSV |

## 快速开始

### 安装要求
- **操作系统**：macOS 10.14+ / Windows 10+ / Linux
- **存储空间**：至少 100 MB 可用空间

### 使用步骤

1. **启动应用**：双击应用图标启动
2. **设置目标目录**：选择图片和视频的默认保存目录
3. **连接存储卡**：插入SD卡或U盘，应用会自动检测并显示在列表中
4. **扫描日期**：点击"获取日期"，扫描媒体文件并提取日期列表
5. **配置拷贝选项**：
   - 选择要拷贝的日期（可多选或"全部日期"）
   - 填写活动名称（可选）
   - 选择是否开启 RAW+JPG 分离
   - 选择拷贝照片和/或视频
6. **开始拷贝**：点击"开始拷贝"，观察实时进度
7. **安全推出**：拷贝完成后，点击"推出磁盘"安全移除

### 拷贝后的文件结构

```
图片目标目录/
├── 20231225_圣诞聚会/
│   ├── IMG_001.jpg
│   ├── IMG_002.CR3
│   └── VID_001.mp4
├── 20231226_家庭旅行/
│   ├── RAW/
│   │   ├── IMG_003.CR3
│   │   └── IMG_004.NEF
│   ├── JPG/
│   │   ├── IMG_003.jpg
│   │   └── IMG_004.jpg
│   └── VID_002.mov
```

## 技术架构

### 核心技术栈
- **[Electron 30](https://www.electronjs.org/)** — 跨平台桌面应用框架
- **[Vue 3](https://vuejs.org/)** — 渐进式前端框架，Composition API
- **[TypeScript](https://www.typescriptlang.org/)** — 类型安全
- **[Vite](https://vitejs.dev/)** — 前端构建工具
- **[Element Plus](https://element-plus.org/)** — Vue 3 组件库
- **[dayjs](https://day.js.org/)** — 日期处理
- **[fs-extra](https://github.com/jprichardson/node-fs-extra)** — 增强文件系统操作

### 项目结构
```
src/
├── main/                       # Electron 主进程
│   ├── index.ts                # 主进程入口（窗口管理、IPC注册）
│   ├── constants.ts            # 文件扩展名、应用配置常量
│   ├── types.ts                # TypeScript 类型定义
│   ├── services/               # 核心业务服务
│   │   ├── copyService.ts      # 文件拷贝、取消、进度上报
│   │   ├── driveService.ts     # 可移动磁盘检测与插拔监控
│   │   ├── ejectService.ts     # 跨平台安全推出磁盘
│   │   └── mediaService.ts     # 媒体文件日期扫描
│   └── utils/
│       ├── fileOperations.ts   # 文件拷贝、哈希校验、EXIF读取、空间检查
│       └── logger.ts           # 日志管理与清理
├── preload/
│   └── index.ts                # 安全的 IPC 桥接（contextIsolation）
└── renderer/src/
    ├── App.vue                 # 主界面
    ├── main.ts                 # Vue 应用入口
    └── types/                  # 渲染进程类型定义
```

## 开发指南

### 环境准备
```bash
git clone <repository-url>
cd SD-Copy-Assistant
npm install
```

### 常用命令
```bash
# 开发调试
npm run dev

# 构建前端 + 打包应用（含 dmg/nsis/appimage）
npm run build

# 仅打包（需先执行 vite build）
npm run build:electron
```

### 图标自定义
```bash
# 将 PNG 图片放到 build/custom-icon.png，然后执行：
npm run setup-icon-with-padding   # 推荐，自动添加边距
npm run clear-icon-cache          # 清除系统图标缓存
```

### 打包配置
应用使用 `electron-builder` 打包：
- **macOS**：`光影拷卡助手-Mac-${version}-Installer.dmg`
- **Windows**：`PhotoCopyAssistant-Windows-${version}-Setup.exe`（NSIS，可选安装目录）
- **Linux**：`光影拷卡助手-Linux-${version}.AppImage`

## 系统要求

| 项目 | 最低配置 | 推荐配置 |
|------|----------|----------|
| CPU | 双核处理器 | 四核及以上 |
| 内存 | 4 GB | 8 GB |
| 磁盘 | 100 MB 可用空间 | 1 GB |
| 系统 | macOS 10.14 / Windows 10 / Linux | — |

## 故障排除

**Q: 磁盘没有被自动检测到？**
A: 请确认磁盘已正确连接。Windows 用户若使用特殊读卡器，可尝试手动选择目录。应用会过滤掉系统卷和 DMG 挂载点。

**Q: 拷贝前提示磁盘空间不足？**
A: 应用会预留 512 MB 缓冲空间。请确保目标目录所在磁盘有足够剩余空间，或选择其他目录。

**Q: 同名文件如何处理？**
A: 若目标目录已存在同名文件，应用会自动对比 SHA256 哈希。内容完全一致则跳过，内容不同则自动重命名保存，不会覆盖原文件。

**Q: 拷贝失败或校验不通过？**
A: 可能是源磁盘接触不良或文件损坏。建议重新插拔存储卡后重试。详细错误信息可在日志中查看。

**Q: 自定义图标没有生效？**
A: 执行 `npm run clear-icon-cache` 清除缓存后重启应用。macOS 可能需要重启 Dock。

### 日志位置
- **macOS/Linux**：`~/logs/app-YYYY-MM-DD.log`
- **Windows**：`%APPDATA%/logs/app-YYYY-MM-DD.log`

## 致谢

感谢以下开源项目的支持：
- [Electron](https://www.electronjs.org/)
- [Vue.js](https://vuejs.org/)
- [Element Plus](https://element-plus.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)

---

**光影拷卡助手** — 让每一次拍摄都安心归档
