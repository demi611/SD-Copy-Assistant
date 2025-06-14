const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🎨 开始生成应用图标...');

const buildDir = path.join(__dirname, '..', 'build');
const svgPath = path.join(buildDir, 'icon.svg');

// 确保build目录存在
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// 检查SVG文件是否存在
if (!fs.existsSync(svgPath)) {
  console.error('❌ 错误: 找不到 build/icon.svg 文件');
  console.log('请确保在 build/ 目录下有 icon.svg 文件');
  process.exit(1);
}

// 检查是否安装了ImageMagick或其他转换工具
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
  console.log('⚠️  未检测到 ImageMagick，将提供手动转换指南');
  console.log('\n📋 手动转换指南:');
  console.log('1. 安装 ImageMagick: https://imagemagick.org/script/download.php');
  console.log('2. 或使用在线转换工具:');
  console.log('   - PNG: https://convertio.co/svg-png/');
  console.log('   - ICO: https://convertio.co/svg-ico/');
  console.log('   - ICNS: https://iconverticons.com/online/');
  console.log('\n需要生成的文件:');
  console.log('- build/icon.png (512x512) - Linux用');
  console.log('- build/icon.ico (包含多尺寸) - Windows用');
  console.log('- build/icon.icns (包含多尺寸) - macOS用');
  process.exit(0);
}

console.log(`✅ 检测到 ${magickCmd}，开始自动转换...`);

try {
  // 生成PNG (Linux用)
  console.log('📱 生成 PNG 图标...');
  execSync(`${magickCmd} "${svgPath}" -resize 512x512 "${path.join(buildDir, 'icon.png')}"`);
  
  // 生成ICO (Windows用) - 包含多个尺寸
  console.log('🪟 生成 ICO 图标...');
  const icoSizes = [16, 24, 32, 48, 64, 128, 256];
  const tempPngs = [];
  
  // 先生成各种尺寸的PNG
  for (const size of icoSizes) {
    const tempPng = path.join(buildDir, `temp_${size}.png`);
    execSync(`${magickCmd} "${svgPath}" -resize ${size}x${size} "${tempPng}"`);
    tempPngs.push(tempPng);
  }
  
  // 合并为ICO
  execSync(`${magickCmd} ${tempPngs.join(' ')} "${path.join(buildDir, 'icon.ico')}"`);
  
  // 清理临时文件
  tempPngs.forEach(file => fs.unlinkSync(file));
  
  // 生成ICNS (macOS用)
  console.log('🍎 生成 ICNS 图标...');
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
    execSync(`${magickCmd} "${svgPath}" -resize ${size}x${size} "${path.join(icnsDir, name)}"`);
  }
  
  // 转换为ICNS
  execSync(`iconutil -c icns "${icnsDir}" -o "${path.join(buildDir, 'icon.icns')}"`);
  
  // 清理iconset目录
  fs.rmSync(icnsDir, { recursive: true });
  
  console.log('✅ 图标生成完成！');
  console.log('\n📁 生成的文件:');
  console.log(`- ${path.join(buildDir, 'icon.png')} (Linux)`);
  console.log(`- ${path.join(buildDir, 'icon.ico')} (Windows)`);
  console.log(`- ${path.join(buildDir, 'icon.icns')} (macOS)`);
  
} catch (error) {
  console.error('❌ 图标生成失败:', error.message);
  console.log('\n💡 建议:');
  console.log('1. 检查 ImageMagick 是否正确安装');
  console.log('2. 在 macOS 上确保有 iconutil 命令');
  console.log('3. 或使用在线工具手动转换');
} 