# 光影拷卡助手 📸

一款专为摄影师和摄影爱好者设计的智能SD卡文件拷贝工具，让您的照片和视频管理变得简单高效。

![应用截图](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows%20%7C%20Linux-blue)
![版本](https://img.shields.io/badge/Version-1.0.0-green)
![技术栈](https://img.shields.io/badge/Tech-Electron%20%7C%20Vue3%20%7C%20TypeScript-orange)

## ✨ 核心特性

### 🔌 智能SD卡管理
- **自动检测插入**：应用启动时自动识别SD卡，无需手动选择
- **实时监控**：实时监控SD卡插拔状态，自动更新界面
- **安全推出**：一键安全推出SD卡，保护数据完整性
- **多平台支持**：完美支持 macOS、Windows 和 Linux 系统

### 📁 智能文件组织
- **按日期分类**：自动扫描文件修改日期，支持按日期选择性拷贝
- **活动命名**：自定义活动名称，文件夹自动命名为 `日期_活动名称` 格式
- **RAW+JPG分离**：可选择将RAW文件和JPG文件分别存储到不同子文件夹
- **分类存储**：图片和视频可设置不同的目标目录

### 🎯 精准文件筛选
- **多格式支持**：
  - **图片格式**：JPG、JPEG、PNG、RAW、NEF、CR2、CR3、ARW、DNG、RAF、ORF、PEF、SRW、X3F
  - **视频格式**：MP4、AVI、MOV
- **选择性拷贝**：可单独选择拷贝照片或视频，或两者同时拷贝
- **日期筛选**：支持选择特定日期或全部日期进行拷贝

### 🔒 数据安全保障
- **文件完整性校验**：使用SHA256哈希算法验证文件完整性
- **重复文件检测**：自动跳过已存在的相同文件，避免重复拷贝
- **错误恢复机制**：详细的错误提示和日志记录，便于问题排查
- **实时进度显示**：可视化进度条和状态信息，实时了解拷贝进展

### 📊 用户体验优化
- **现代化界面**：基于Element Plus的美观界面设计
- **中文本地化**：完整的中文界面和提示信息
- **实时反馈**：操作状态实时反馈，用户体验流畅
- **详细日志**：完整的操作日志记录，便于调试和维护
- **自定义图标**：支持设置个性化应用图标，包含圆角和边距优化

## 🚀 快速开始

### 安装要求
- **操作系统**：macOS 10.14+、Windows 10+ 或 Linux
- **存储空间**：至少100MB可用空间
- **权限**：文件系统读写权限

### 使用步骤

1. **启动应用**
   - 双击应用图标启动光影拷卡助手

2. **设置目标目录**
   - 选择图片存储目录（默认为系统图片文件夹）
   - 选择视频存储目录（默认为系统视频文件夹）

3. **连接SD卡**
   - 插入SD卡，应用会自动检测并显示SD卡信息
   - 如未自动检测，可手动选择SD卡目录

4. **扫描文件日期**
   - 点击"获取日期"按钮扫描SD卡中的文件
   - 系统会自动提取所有不重复的文件日期

5. **选择拷贝选项**
   - 选择要拷贝的日期（可多选或选择"全部日期"）
   - 设置活动名称（可选，默认为"媒体文件"）
   - 选择是否启用RAW+JPG分离存储
   - 选择拷贝照片和/或视频

6. **开始拷贝**
   - 点击"开始拷贝"按钮
   - 观察实时进度和状态信息
   - 等待拷贝完成

7. **安全推出**
   - 拷贝完成后，点击"推出SD卡"按钮
   - 等待系统确认后安全移除SD卡

## 📂 文件组织结构

拷贝后的文件将按以下结构组织：

```
目标目录/
├── 20231225_圣诞聚会/
│   ├── IMG_001.jpg
│   ├── IMG_002.CR3
│   └── VID_001.mp4
├── 20231226_家庭旅行/
│   ├── RAW/                 # 启用RAW+JPG分离时
│   │   ├── IMG_003.CR3
│   │   └── IMG_004.NEF
│   ├── JPG/                 # 启用RAW+JPG分离时
│   │   ├── IMG_003.jpg
│   │   └── IMG_004.jpg
│   └── VID_002.mov
```

## 🛠️ 技术架构

### 核心技术栈
- **[Electron](https://www.electronjs.org/)** - 跨平台桌面应用框架
- **[Vue 3](https://vuejs.org/)** - 渐进式JavaScript框架，使用Composition API
- **[TypeScript](https://www.typescriptlang.org/)** - 类型安全的JavaScript超集
- **[Vite](https://vitejs.dev/)** - 极速前端构建工具
- **[Element Plus](https://element-plus.org/)** - Vue 3组件库

### 关键依赖
- **[fs-extra](https://github.com/jprichardson/node-fs-extra)** - 增强的文件系统操作
- **[crypto-js](https://github.com/brix/crypto-js)** - JavaScript加密库，用于文件哈希校验
- **[dayjs](https://day.js.org/)** - 轻量级日期处理库
- **[@electron-toolkit/utils](https://github.com/alex8088/electron-toolkit)** - Electron实用工具
- **[ImageMagick](https://imagemagick.org/)** - 图像处理工具（用于图标生成）

### 项目结构
```
photo-copy-app/
├── src/                      # 源代码目录
│   ├── main/                 # Electron主进程
│   │   └── index.ts          # 主进程逻辑、IPC通信、文件操作
│   ├── renderer/             # Vue渲染进程
│   │   ├── src/
│   │   │   ├── App.vue       # 主界面组件
│   │   │   └── main.ts       # Vue应用入口
│   │   └── index.html        # HTML模板
│   └── preload/              # 预加载脚本
│       └── index.ts          # 安全的IPC接口定义
├── electron/                 # Electron配置文件
│   ├── preload.ts            # 预加载脚本源文件
│   └── electron-env.d.ts     # Electron类型定义
├── public/                   # 公共资源目录
│   └── vite.svg              # 应用图标（favicon）
├── build/                    # 构建资源目录
│   ├── icon.svg              # 图标源文件
│   ├── icon.png              # Linux图标
│   ├── icon.ico              # Windows图标
│   ├── icon.icns             # macOS图标
│   └── custom-icon.png       # 自定义图标源文件
├── scripts/                  # 构建和工具脚本
│   ├── generate-icons.cjs    # 图标生成脚本
│   ├── setup-custom-icon.cjs # 自定义图标设置
│   ├── setup-custom-icon-with-padding.cjs # 带边距优化
│   ├── setup-rounded-icon.cjs # 圆角图标设置
│   ├── clear-icon-cache.cjs  # 清除图标缓存
│   └── README.md             # 脚本使用说明
├── node_modules/             # 项目依赖包（npm install生成）
├── dist-electron/            # Electron构建输出目录
├── dist/                     # 前端构建输出目录（构建时生成）
├── release/                  # 应用打包输出目录
├── logs/                     # 应用运行日志目录
├── index.html                # 应用入口HTML文件
├── package.json              # 项目配置和依赖
├── package-lock.json         # 依赖版本锁定文件
├── vite.config.ts            # Vite构建配置
├── tsconfig.json             # TypeScript配置
├── electron-builder.json5    # 应用打包配置
├── CUSTOM_ICON_GUIDE.md      # 自定义图标指南
└── README.md                 # 项目说明文档
```

## 🔧 开发指南

### 环境准备
```bash
# 克隆项目
git clone <repository-url>
cd photo-copy-app

# 安装依赖
npm install
```

### 开发命令
```bash
# 启动开发服务器
npm run dev

# 构建应用
npm run build

# 仅构建Electron应用
npm run build:electron

# 预览构建结果
npm run preview
```

### 图标自定义
应用支持自定义图标功能，提供多种设置选项：

```bash
# 生成默认图标（从SVG源文件）
npm run generate-icons

# 设置自定义图标（基础版本）
npm run setup-icon

# 设置自定义图标（带边距优化，推荐）
npm run setup-icon-with-padding

# 设置圆角图标（现代化设计）
npm run setup-rounded-icon

# 清除系统图标缓存
npm run clear-icon-cache
```

**使用步骤**：
1. 将您的PNG图片复制到 `build/custom-icon.png`
2. 运行相应的图标设置命令
3. 清除系统缓存：`npm run clear-icon-cache`
4. 重新启动应用查看效果

详细说明请参考 [自定义图标指南](CUSTOM_ICON_GUIDE.md) 和 [脚本说明](scripts/README.md)。

### 构建配置
应用使用 `electron-builder` 进行打包，支持：
- **macOS**: DMG安装包
- **Windows**: NSIS安装程序
- **Linux**: AppImage便携应用

## 📋 系统要求

### 最低配置
- **CPU**: 双核处理器
- **内存**: 4GB RAM
- **存储**: 100MB可用空间
- **操作系统**: 
  - macOS 10.14 (Mojave) 或更高版本
  - Windows 10 或更高版本
  - Ubuntu 18.04 或其他主流Linux发行版

### 推荐配置
- **CPU**: 四核处理器或更高
- **内存**: 8GB RAM或更高
- **存储**: 1GB可用空间（用于日志和临时文件）

## 🐛 故障排除

### 常见问题

**Q: SD卡无法自动检测？**
A: 请检查SD卡是否正确插入，或尝试手动选择SD卡目录。某些读卡器可能需要手动选择。

**Q: 拷贝过程中出现错误？**
A: 请检查目标目录是否有足够空间，以及是否有写入权限。详细错误信息可在日志文件中查看。

**Q: 文件哈希校验失败？**
A: 这可能表示文件在拷贝过程中损坏。请重新尝试拷贝，或检查SD卡是否有物理损坏。

**Q: 应用启动失败？**
A: 请确保系统满足最低要求，并检查是否有杀毒软件阻止应用运行。

**Q: 自定义图标没有生效？**
A: 请运行 `npm run clear-icon-cache` 清除系统图标缓存，然后重新启动应用。在macOS上可能需要重启Dock。

**Q: 图标在Dock中显示大小不一致？**
A: 使用 `npm run setup-icon-with-padding` 命令，它会自动添加适当的边距，确保图标大小与其他应用一致。

### 日志文件
应用会在 `logs/` 目录下生成详细的日志文件，文件名格式为 `app-YYYY-MM-DD.log`。如遇问题，请查看相应日期的日志文件。

## 🤝 贡献指南

我们欢迎社区贡献！如果您想为项目做出贡献：

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

感谢以下开源项目的支持：
- [Electron](https://www.electronjs.org/) - 跨平台桌面应用开发框架
- [Vue.js](https://vuejs.org/) - 渐进式JavaScript框架
- [Element Plus](https://element-plus.org/) - Vue 3组件库
- [TypeScript](https://www.typescriptlang.org/) - JavaScript类型安全解决方案

---

**光影拷卡助手** - 让每一张照片都安全到达目的地 📸✨ 