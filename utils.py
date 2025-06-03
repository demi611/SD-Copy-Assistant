import os
from pathlib import Path

def get_user_pictures_folder():
    if os.name == 'nt':  # Windows 系统
        return os.path.join(os.environ['USERPROFILE'], 'Pictures')
    elif os.name == 'posix':  # macOS 或 Linux 系统
        return os.path.join(str(Path.home()), 'Pictures')
    return None

def get_user_videos_folder():
    if os.name == 'nt':  # Windows 系统
        return os.path.join(os.environ['USERPROFILE'], 'Videos')
    elif os.name == 'posix':  # macOS 或 Linux 系统
        return os.path.join(str(Path.home()), 'Movies')
    return None

# 添加文件扩展名定义
IMAGE_EXTENSIONS = (
    '.jpg', '.jpeg', '.png', 
    '.raw', '.nef', '.cr2', '.CR3', 
    '.arw', '.dng', '.raf', '.orf', '.pef', '.srw', '.x3f'
)
RAW_EXTENSIONS = tuple(ext for ext in IMAGE_EXTENSIONS if ext.lower() in ('.raw', '.nef', '.cr2', '.cr3', '.arw', '.dng', '.raf', '.orf', '.pef', '.srw', '.x3f'))  # 提取RAW格式
VIDEO_EXTENSIONS = ('.mp4', '.avi', '.mov')