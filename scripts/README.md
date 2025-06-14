# 🛠️ 图标设置脚本说明

本目录包含用于设置应用图标的脚本工具。

## 📋 可用脚本

### 1. `generate-icons.cjs`
**用途**: 从SVG源文件生成所有平台的图标格式
**命令**: `npm run generate-icons`
**说明**: 基于 `build/icon.svg` 生成 PNG、ICO、ICNS 格式

### 2. `setup-custom-icon.cjs`
**用途**: 使用自定义PNG图片设置图标
**命令**: `npm run setup-icon`
**步骤**:
1. 将PNG图片复制到 `build/custom-icon.png`
2. 运行脚本自动处理

### 3. `setup-custom-icon-with-padding.cjs`
**用途**: 使用自定义PNG图片设置图标（带智能边距优化）
**命令**: `npm run setup-icon-with-padding`
**特点**: 
- 自动添加15%边距
- 解决Dock图标大小不一致问题
- 推荐使用

### 4. `setup-rounded-icon.cjs`
**用途**: 设置带圆角的自定义图标
**命令**: `npm run setup-rounded-icon`
**特点**:
- 添加80px超大圆角
- 现代化设计风格
- 包含边距优化

### 5. `clear-icon-cache.cjs`
**用途**: 清除macOS系统图标缓存
**命令**: `npm run clear-icon-cache`
**说明**: 图标更新后如果没有生效，运行此脚本

## 🚀 推荐使用流程

### 方案A: 标准设置
```bash
# 1. 复制您的图片
cp /path/to/your/image.png build/custom-icon.png

# 2. 设置图标（带边距优化）
npm run setup-icon-with-padding

# 3. 清除缓存
npm run clear-icon-cache

# 4. 重启应用
npm run dev
```

### 方案B: 圆角设计
```bash
# 1. 复制您的图片
cp /path/to/your/image.png build/custom-icon.png

# 2. 设置圆角图标
npm run setup-rounded-icon

# 3. 清除缓存
npm run clear-icon-cache

# 4. 重启应用
npm run dev
```

## 💡 注意事项

- 所有脚本都需要安装 ImageMagick
- 推荐使用512x512或更高分辨率的PNG图片
- 图标设置完成后记得清除系统缓存
- 保留 `custom-icon.png` 作为源文件备份