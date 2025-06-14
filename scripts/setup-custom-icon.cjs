const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🎨 自定义图标设置助手');
console.log('=====================================');

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
  console.log('npm run setup-icon');
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
console.log('🔧 开始处理图标...');

try {
  // 获取原始图片信息
  const identify = execSync(`${magickCmd} identify "${customIconPath}"`, { encoding: 'utf8' });
  console.log('📏 原始图片信息:', identify.trim());

  // 创建优化的SVG版本（保持高质量）
  const svgPath = path.join(buildDir, 'icon.svg');
  console.log('🎨 创建SVG版本...');
  
  // 先创建一个高质量的512x512 PNG作为中间文件
  const tempPngPath = path.join(buildDir, 'temp_512.png');
  execSync(`${magickCmd} "${customIconPath}" -resize 512x512 -quality 100 -background transparent "${tempPngPath}"`);
  
  // 创建SVG包装器
  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <image x="0" y="0" width="512" height="512" xlink:href="data:image/png;base64,${fs.readFileSync(tempPngPath).toString('base64')}" />
</svg>`;
  
  fs.writeFileSync(svgPath, svgContent);
  fs.unlinkSync(tempPngPath); // 删除临时文件
  
  // 生成PNG (Linux用) - 优化大小和质量
  console.log('📱 生成优化的 PNG 图标...');
  execSync(`${magickCmd} "${customIconPath}" -resize 512x512 -quality 95 -background transparent -gravity center -extent 512x512 "${path.join(buildDir, 'icon.png')}"`);
  
  // 生成ICO (Windows用) - 包含多个尺寸
  console.log('🪟 生成 ICO 图标...');
  const icoSizes = [16, 24, 32, 48, 64, 128, 256];
  const tempPngs = [];
  
  for (const size of icoSizes) {
    const tempPng = path.join(buildDir, `temp_${size}.png`);
    execSync(`${magickCmd} "${customIconPath}" -resize ${size}x${size} -quality 95 -background transparent -gravity center -extent ${size}x${size} "${tempPng}"`);
    tempPngs.push(tempPng);
  }
  
  execSync(`${magickCmd} ${tempPngs.join(' ')} "${path.join(buildDir, 'icon.ico')}"`);
  tempPngs.forEach(file => fs.unlinkSync(file));
  
  // 生成ICNS (macOS用) - 特别优化Dock显示
  console.log('🍎 生成优化的 ICNS 图标...');
  const icnsDir = path.join(buildDir, 'icon.iconset');
  
  if (fs.existsSync(icnsDir)) {
    fs.rmSync(icnsDir, { recursive: true });
  }
  fs.mkdirSync(icnsDir);
  
  // macOS iconset 需要的尺寸 - 添加更多尺寸以确保在不同Dock大小下都清晰
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
    // 使用更好的缩放算法和质量设置
    execSync(`${magickCmd} "${customIconPath}" -resize ${size}x${size} -quality 95 -background transparent -gravity center -extent ${size}x${size} -filter Lanczos "${path.join(icnsDir, name)}"`);
  }
  
  // 转换为ICNS
  execSync(`iconutil -c icns "${icnsDir}" -o "${path.join(buildDir, 'icon.icns')}"`);
  fs.rmSync(icnsDir, { recursive: true });
  
  console.log('✅ 自定义图标设置完成！');
  console.log('');
  console.log('📁 生成的文件:');
  console.log(`- ${path.join(buildDir, 'icon.svg')} (源文件)`);
  console.log(`- ${path.join(buildDir, 'icon.png')} (Linux)`);
  console.log(`- ${path.join(buildDir, 'icon.ico')} (Windows)`);
  console.log(`- ${path.join(buildDir, 'icon.icns')} (macOS - 优化Dock显示)`);
  console.log('');
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