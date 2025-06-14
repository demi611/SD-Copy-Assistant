const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 修复圆角图标工具');
console.log('====================');

const buildDir = path.join(__dirname, '..', 'build');
const customIconPath = path.join(buildDir, 'custom-icon.png');

if (!fs.existsSync(customIconPath)) {
  console.log('❌ 找不到 build/custom-icon.png 文件');
  console.log('请先将您的图片复制到该位置');
  process.exit(1);
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
  process.exit(1);
}

// 改进的圆角处理函数
function createRoundedIcon(inputPath, outputPath, size, cornerRadius, paddingPercent = 15) {
  console.log(`🎨 处理 ${size}x${size} 图标，圆角 ${cornerRadius}px...`);
  
  try {
    const contentSize = Math.round(size * (100 - paddingPercent) / 100);
    
    // 步骤1: 先创建内容区域的图标
    const tempContentPath = path.join(buildDir, `temp_content_${size}_${Date.now()}.png`);
    execSync(`${magickCmd} "${inputPath}" -resize ${contentSize}x${contentSize} -background transparent "${tempContentPath}"`);
    
    // 步骤2: 创建圆角遮罩 - 使用更简单的方法
    const tempRoundedPath = path.join(buildDir, `temp_rounded_${size}_${Date.now()}.png`);
    
    // 直接使用ImageMagick的圆角功能
    const actualRadius = Math.min(cornerRadius, contentSize / 4); // 确保圆角不会太大
    execSync(`${magickCmd} "${tempContentPath}" \\( +clone -alpha extract -draw "fill black polygon 0,0 0,${actualRadius} ${actualRadius},0 fill white circle ${actualRadius},${actualRadius} ${actualRadius},0" \\( +clone -flip \\) -compose Multiply -composite \\( +clone -flop \\) -compose Multiply -composite \\) -alpha off -compose CopyOpacity -composite "${tempRoundedPath}"`);
    
    // 如果上面的方法失败，使用更简单的方法
    if (!fs.existsSync(tempRoundedPath) || fs.statSync(tempRoundedPath).size < 1000) {
      console.log(`⚠️  使用备用圆角方法处理 ${size}x${size}...`);
      // 使用更简单但有效的圆角方法
      execSync(`${magickCmd} "${tempContentPath}" -alpha set \\( +clone -distort DePolar 0 -virtual-pixel HorizontalTile -background None -distort Polar 0 \\) -compose Dst_In -composite "${tempRoundedPath}"`);
      
      // 如果还是失败，直接复制原图
      if (!fs.existsSync(tempRoundedPath) || fs.statSync(tempRoundedPath).size < 1000) {
        console.log(`⚠️  圆角处理失败，使用原图: ${size}x${size}`);
        fs.copyFileSync(tempContentPath, tempRoundedPath);
      }
    }
    
    // 步骤3: 添加边距
    execSync(`${magickCmd} "${tempRoundedPath}" -background transparent -gravity center -extent ${size}x${size} "${outputPath}"`);
    
    // 清理临时文件
    [tempContentPath, tempRoundedPath].forEach(file => {
      if (fs.existsSync(file)) {
        try {
          fs.unlinkSync(file);
        } catch (e) {
          console.log(`⚠️  无法删除临时文件: ${file}`);
        }
      }
    });
    
    // 验证输出文件
    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 1000) {
      console.log(`❌ 生成失败: ${outputPath}`);
      // 作为备用，直接处理原图
      execSync(`${magickCmd} "${inputPath}" -resize ${contentSize}x${contentSize} -background transparent -gravity center -extent ${size}x${size} "${outputPath}"`);
    }
    
  } catch (error) {
    console.log(`❌ 处理 ${size}x${size} 时出错: ${error.message}`);
    // 备用方案：直接缩放原图
    try {
      const contentSize = Math.round(size * (100 - paddingPercent) / 100);
      execSync(`${magickCmd} "${inputPath}" -resize ${contentSize}x${contentSize} -background transparent -gravity center -extent ${size}x${size} "${outputPath}"`);
      console.log(`✅ 使用备用方案生成: ${size}x${size}`);
    } catch (backupError) {
      console.log(`❌ 备用方案也失败: ${backupError.message}`);
    }
  }
}

try {
  console.log('🔧 开始修复圆角图标...');
  
  // 获取原始图片信息
  const identify = execSync(`${magickCmd} identify "${customIconPath}"`, { encoding: 'utf8' });
  console.log('📏 原始图片信息:', identify.trim());
  
  // 使用较大的圆角 (80px)
  const cornerRadius = 80;
  console.log(`🎨 使用超大圆角 (${cornerRadius}px) 重新处理图标...`);
  
  // 生成PNG (Linux用)
  console.log('📱 生成圆角 PNG 图标...');
  createRoundedIcon(customIconPath, path.join(buildDir, 'icon.png'), 512, cornerRadius, 15);
  
  // 验证PNG文件
  const pngPath = path.join(buildDir, 'icon.png');
  if (fs.existsSync(pngPath) && fs.statSync(pngPath).size > 1000) {
    console.log('✅ PNG 图标生成成功');
  } else {
    console.log('❌ PNG 图标生成失败，使用简单缩放');
    execSync(`${magickCmd} "${customIconPath}" -resize 435x435 -background transparent -gravity center -extent 512x512 "${pngPath}"`);
  }
  
  // 创建SVG版本
  console.log('🎨 创建SVG版本...');
  const svgPath = path.join(buildDir, 'icon.svg');
  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <image x="0" y="0" width="512" height="512" xlink:href="data:image/png;base64,${fs.readFileSync(pngPath).toString('base64')}" />
</svg>`;
  
  fs.writeFileSync(svgPath, svgContent);
  
  // 生成ICO (Windows用)
  console.log('🪟 生成 ICO 图标...');
  const icoSizes = [16, 24, 32, 48, 64, 128, 256];
  const tempPngs = [];
  
  for (const size of icoSizes) {
    const tempPng = path.join(buildDir, `temp_ico_${size}_${Date.now()}.png`);
    const adjustedRadius = Math.max(2, Math.round(cornerRadius * size / 512));
    createRoundedIcon(customIconPath, tempPng, size, adjustedRadius, 15);
    tempPngs.push(tempPng);
  }
  
  execSync(`${magickCmd} ${tempPngs.join(' ')} "${path.join(buildDir, 'icon.ico')}"`);
  tempPngs.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
      } catch (e) {
        console.log(`⚠️  无法删除临时文件: ${file}`);
      }
    }
  });
  
  // 生成ICNS (macOS用)
  console.log('🍎 生成 ICNS 图标...');
  const icnsDir = path.join(buildDir, 'icon.iconset');
  
  if (fs.existsSync(icnsDir)) {
    fs.rmSync(icnsDir, { recursive: true });
  }
  fs.mkdirSync(icnsDir);
  
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
    const adjustedRadius = Math.max(2, Math.round(cornerRadius * size / 512));
    let adjustedPadding = 15;
    if (size <= 32) {
      adjustedPadding = 10;
    }
    
    createRoundedIcon(customIconPath, path.join(icnsDir, name), size, adjustedRadius, adjustedPadding);
  }
  
  // 转换为ICNS
  execSync(`iconutil -c icns "${icnsDir}" -o "${path.join(buildDir, 'icon.icns')}"`);
  fs.rmSync(icnsDir, { recursive: true });
  
  console.log('✅ 修复完成！');
  console.log('');
  console.log('📁 生成的文件:');
  console.log(`- ${path.join(buildDir, 'icon.svg')} (源文件)`);
  console.log(`- ${path.join(buildDir, 'icon.png')} (Linux)`);
  console.log(`- ${path.join(buildDir, 'icon.ico')} (Windows)`);
  console.log(`- ${path.join(buildDir, 'icon.icns')} (macOS)`);
  console.log('');
  console.log(`🎯 使用了超大圆角 (${cornerRadius}px)，边距15%`);
  console.log('🔄 请重新启动应用程序以查看修复后的图标');
  
  // 验证最终文件
  console.log('');
  console.log('🔍 验证生成的文件:');
  ['icon.png', 'icon.ico', 'icon.icns'].forEach(filename => {
    const filepath = path.join(buildDir, filename);
    if (fs.existsSync(filepath)) {
      const stats = fs.statSync(filepath);
      console.log(`✅ ${filename}: ${stats.size} bytes`);
    } else {
      console.log(`❌ ${filename}: 文件不存在`);
    }
  });
  
} catch (error) {
  console.error('❌ 修复失败:', error.message);
  console.log('');
  console.log('💡 尝试简单的备用方案...');
  
  try {
    // 最简单的备用方案
    const simpleIconPath = path.join(buildDir, 'icon.png');
    execSync(`${magickCmd} "${customIconPath}" -resize 435x435 -background transparent -gravity center -extent 512x512 "${simpleIconPath}"`);
    console.log('✅ 使用简单缩放生成了基本图标');
  } catch (backupError) {
    console.log('❌ 备用方案也失败了:', backupError.message);
  }
} 