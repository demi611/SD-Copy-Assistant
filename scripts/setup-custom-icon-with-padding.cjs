const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🎨 智能图标设置助手 (带边距优化)');
console.log('==========================================');

const buildDir = path.join(__dirname, '..', 'build');
const customIconPath = path.join(buildDir, 'custom-icon.png');

// 检查自定义图标文件
if (!fs.existsSync(customIconPath)) {
  console.log('📋 使用说明:');
  console.log('1. 将您的PNG图片复制到 build/ 目录');
  console.log('2. 重命名为 custom-icon.png');
  console.log('3. 再次运行此脚本');
  console.log('');
  console.log('示例命令:');
  console.log('cp /path/to/your/image.png build/custom-icon.png');
  console.log('npm run setup-icon-with-padding');
  return;
}

// 检查ImageMagick
function checkImageMagick() {
  try {
    execSync('magick -version', { stdio: 'ignore' });
    return 'magick';
  } catch {
    try {
      execSync('convert -version', { stdio: 'ignore' });
      return 'convert';
    } catch {
      return null;
    }
  }
}

const magickCmd = checkImageMagick();

if (!magickCmd) {
  console.error('❌ 错误: 未检测到 ImageMagick');
  console.log('请先安装 ImageMagick: https://imagemagick.org/script/download.php');
  console.log('macOS: brew install imagemagick');
  process.exit(1);
}

console.log('✅ 找到自定义图标文件');
console.log('🔧 开始智能处理图标...');

// 创建带边距的图标处理函数
function createIconWithPadding(inputPath, outputPath, size, paddingPercent = 15) {
  // 计算内容区域大小 (减去边距)
  const contentSize = Math.round(size * (100 - paddingPercent) / 100);
  const padding = Math.round((size - contentSize) / 2);
  
  // 先将图标缩放到内容区域大小
  const tempPath = path.join(buildDir, `temp_content_${size}.png`);
  execSync(`${magickCmd} "${inputPath}" -resize ${contentSize}x${contentSize} -quality 95 -background transparent "${tempPath}"`);
  
  // 然后添加边距，创建最终尺寸
  execSync(`${magickCmd} "${tempPath}" -background transparent -gravity center -extent ${size}x${size} "${outputPath}"`);
  
  // 清理临时文件
  fs.unlinkSync(tempPath);
}

try {
  // 获取原始图片信息
  const identify = execSync(`${magickCmd} identify "${customIconPath}"`, { encoding: 'utf8' });
  console.log('📏 原始图片信息:', identify.trim());

  // 询问用户边距偏好
  console.log('');
  console.log('🎯 边距设置选项:');
  console.log('1. 紧凑型 (5% 边距) - 图标较大，适合简单图形');
  console.log('2. 标准型 (15% 边距) - 平衡大小，推荐选择');
  console.log('3. 宽松型 (25% 边距) - 图标较小，适合复杂图形');
  console.log('');
  
  // 默认使用标准边距
  const paddingPercent = 15;
  console.log(`🎨 使用标准边距 (${paddingPercent}%) 处理图标...`);

  // 创建优化的SVG版本
  const svgPath = path.join(buildDir, 'icon.svg');
  console.log('🎨 创建SVG版本...');
  
  // 创建带边距的512x512版本
  const tempPngPath = path.join(buildDir, 'temp_512_padded.png');
  createIconWithPadding(customIconPath, tempPngPath, 512, paddingPercent);
  
  // 创建SVG包装器
  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <image x="0" y="0" width="512" height="512" xlink:href="data:image/png;base64,${fs.readFileSync(tempPngPath).toString('base64')}" />
</svg>`;
  
  fs.writeFileSync(svgPath, svgContent);
  fs.unlinkSync(tempPngPath);
  
  // 生成PNG (Linux用) - 带边距
  console.log('📱 生成优化的 PNG 图标 (带边距)...');
  createIconWithPadding(customIconPath, path.join(buildDir, 'icon.png'), 512, paddingPercent);
  
  // 生成ICO (Windows用) - 包含多个尺寸，都带边距
  console.log('🪟 生成 ICO 图标 (带边距)...');
  const icoSizes = [16, 24, 32, 48, 64, 128, 256];
  const tempPngs = [];
  
  for (const size of icoSizes) {
    const tempPng = path.join(buildDir, `temp_ico_${size}.png`);
    createIconWithPadding(customIconPath, tempPng, size, paddingPercent);
    tempPngs.push(tempPng);
  }
  
  execSync(`${magickCmd} ${tempPngs.join(' ')} "${path.join(buildDir, 'icon.ico')}"`);
  tempPngs.forEach(file => fs.unlinkSync(file));
  
  // 生成ICNS (macOS用) - 特别优化Dock显示，带边距
  console.log('🍎 生成优化的 ICNS 图标 (Dock专用边距)...');
  const icnsDir = path.join(buildDir, 'icon.iconset');
  
  if (fs.existsSync(icnsDir)) {
    fs.rmSync(icnsDir, { recursive: true });
  }
  fs.mkdirSync(icnsDir);
  
  // macOS iconset 需要的尺寸
  const icnsSizes = [
    { size: 16, name: 'icon_16x16.png' },
    { size: 32, name: 'icon_16x16@2x.png' },
    { size: 32, name: 'icon_32x32.png' },
    { size: 64, name: 'icon_32x32@2x.png' },
    { size: 128, name: 'icon_128x128.png' },
    { size: 256, name: 'icon_128x128@2x.png' },
    { size: 256, name: 'icon_256x256.png' },
    { size: 512, name: 'icon_256x256@2x.png' },
    { size: 512, name: 'icon_512x512.png' },
    { size: 1024, name: 'icon_512x512@2x.png' }
  ];
  
  for (const { size, name } of icnsSizes) {
    // 为不同尺寸调整边距 - 小尺寸用更少边距
    let adjustedPadding = paddingPercent;
    if (size <= 32) {
      adjustedPadding = Math.max(5, paddingPercent - 5); // 小图标减少边距
    }
    
    createIconWithPadding(customIconPath, path.join(icnsDir, name), size, adjustedPadding);
  }
  
  // 转换为ICNS
  execSync(`iconutil -c icns "${icnsDir}" -o "${path.join(buildDir, 'icon.icns')}"`);
  fs.rmSync(icnsDir, { recursive: true });
  
  console.log('✅ 智能图标设置完成！');
  console.log('');
  console.log('📁 生成的文件 (已优化边距):');
  console.log(`- ${path.join(buildDir, 'icon.svg')} (源文件)`);
  console.log(`- ${path.join(buildDir, 'icon.png')} (Linux)`);
  console.log(`- ${path.join(buildDir, 'icon.ico')} (Windows)`);
  console.log(`- ${path.join(buildDir, 'icon.icns')} (macOS - Dock优化)`);
  console.log('');
  console.log(`🎯 使用了 ${paddingPercent}% 边距，确保与其他Dock图标大小一致`);
  console.log('🔄 请重新启动应用程序以查看新图标');
  console.log('💡 如果图标未更新，请运行: npm run clear-icon-cache');
  
} catch (error) {
  console.error('❌ 处理失败:', error.message);
  console.log('');
  console.log('💡 建议:');
  console.log('1. 确保图片文件格式正确 (PNG)');
  console.log('2. 检查图片文件是否损坏');
  console.log('3. 尝试使用其他图片');
} 