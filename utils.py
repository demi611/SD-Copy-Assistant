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