const { execSync } = require('child_process');

console.log('🧹 清除macOS图标缓存');
console.log('====================');

try {
  console.log('🔄 清除系统图标缓存...');
  
  // 清除系统图标服务缓存
  execSync('sudo rm -rf /Library/Caches/com.apple.iconservices.store', { stdio: 'inherit' });
  console.log('✅ 已清除系统图标服务缓存');
  
  // 清除用户图标缓存
  execSync('rm -rf ~/Library/Caches/com.apple.iconservices.store', { stdio: 'inherit' });
  console.log('✅ 已清除用户图标缓存');
  
  // 重启Dock
  console.log('🔄 重启Dock...');
  execSync('killall Dock', { stdio: 'inherit' });
  console.log('✅ Dock已重启');
  
  // 重启Finder（可选）
  console.log('🔄 重启Finder...');
  execSync('killall Finder', { stdio: 'inherit' });
  console.log('✅ Finder已重启');
  
  console.log('');
  console.log('🎉 图标缓存清除完成！');
  console.log('💡 现在重新启动您的应用程序，图标应该会更新');
  
} catch (error) {
  console.error('❌ 清除缓存时出错:', error.message);
  console.log('');
  console.log('💡 您可以手动执行以下命令:');
  console.log('sudo rm -rf /Library/Caches/com.apple.iconservices.store');
  console.log('rm -rf ~/Library/Caches/com.apple.iconservices.store');
  console.log('killall Dock');
  console.log('killall Finder');
} 