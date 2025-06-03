import os
import datetime
import shutil
import hashlib
import logging
from PyQt5.QtCore import QThread, pyqtSignal

# 修改为导入方式
from utils import IMAGE_EXTENSIONS, VIDEO_EXTENSIONS, RAW_EXTENSIONS  # 新增导入

class CopyThread(QThread):
    progress_signal = pyqtSignal(int)
    result_signal = pyqtSignal(str)

    def __init__(self, sd_path, image_target, video_target, event_name, selected_date, separate_raw):  # 添加参数
        super().__init__()
        self.sd_path = sd_path  # 保存 SD 卡路径
        self.image_target = image_target  # 保存图片目标路径
        self.video_target = video_target  # 保存视频目标路径
        self.event_name = event_name  # 保存活动名称
        self.selected_date = selected_date  # 保存选择的日期
        self.separate_raw = separate_raw  # 保存是否分开 RAW 文件的标志

    def run(self):
        image_extensions = IMAGE_EXTENSIONS
        video_extensions = VIDEO_EXTENSIONS
        # 直接筛选图片/视频文件（替代原all_files收集所有文件）
        target_files = []
        for root, dirs, files in os.walk(self.sd_path):
            for file in files:
                lower_file = file.lower()
                if (lower_file.endswith(image_extensions) or 
                    lower_file.endswith(video_extensions)):
                    target_files.append(os.path.join(root, file))
        total_files = len(target_files)
        copied_files = 0
        created_folders = set()

        if total_files == 0:
            self.result_signal.emit("SD 卡目录中没有可用的图片或视频文件，请检查路径。")
            return

        for file_path in target_files:  # 直接遍历目标文件
            file = os.path.basename(file_path)
            lower_file = file.lower()
            is_image = False
            is_video = False
            for ext in image_extensions:
                if lower_file.endswith(ext.lower()):
                    is_image = True
                    break
            for ext in video_extensions:
                if lower_file.endswith(ext.lower()):
                    is_video = True
                    break

            if is_image or is_video:
                try:
                    date_taken = datetime.datetime.fromtimestamp(os.path.getmtime(file_path)).strftime('%Y%m%d')
                    # 修正：将 self.selected_dates 改为 self.selected_date（与 __init__ 参数名一致）
                    if self.selected_date and date_taken != self.selected_date:
                        continue
                except Exception as e:
                    logging.error(f"Failed to get modification time for {file}: {e}")
                    continue

                if is_image:
                    target_dir = self.image_target
                    logging.debug(f"File {file} identified as an image.")
                elif is_video:
                    target_dir = self.video_target
                    logging.debug(f"File {file} identified as a video.")

                logging.debug(f"Processing file: {file}")

                # 创建包含活动名称的文件夹
                folder_name = f'{date_taken}_{self.event_name}'
                folder_path = os.path.join(target_dir, folder_name)
                if folder_path not in created_folders:
                    if not os.path.exists(folder_path):
                        try:
                            os.makedirs(folder_path)
                            logging.info(f"Created folder: {folder_path}")
                            if is_image:
                                # 仅创建"原图"子目录（移除"选择"目录创建）
                                original_folder = os.path.join(folder_path, '原图')
                                if not os.path.exists(original_folder):
                                    os.makedirs(original_folder)
                                    logging.info(f"Created subfolder: {original_folder}")
                                # 仅勾选时创建RAW/JPG子目录
                                if self.separate_raw:
                                    raw_folder = os.path.join(original_folder, 'RAW')
                                    jpg_folder = os.path.join(original_folder, 'JPG')
                                    if not os.path.exists(raw_folder):
                                        os.makedirs(raw_folder)
                                        logging.info(f"Created subfolder: {raw_folder}")
                                    if not os.path.exists(jpg_folder):
                                        os.makedirs(jpg_folder)
                                        logging.info(f"Created subfolder: {jpg_folder}")
                        except Exception as e:
                            logging.error(f"Failed to create folder {folder_path}: {e}")
                            continue
                    created_folders.add(folder_path)

                # 处理文件名重复情况
                new_file_name = file
                file_ext = os.path.splitext(file)[1].lower()
                # 区分RAW和JPG存储路径
                if is_image:
                    # 新增：根据复选框状态选择目标子文件夹
                    if self.separate_raw:
                        if file_ext in [ext.lower() for ext in RAW_EXTENSIONS]:  # 使用RAW_EXTENSIONS判断
                            target_subfolder = os.path.join(folder_path, '原图', 'RAW')
                        else:
                            target_subfolder = os.path.join(folder_path, '原图', 'JPG')
                    else:
                        target_subfolder = os.path.join(folder_path, '原图')  # 不分类时直接存到“原图”
                else:
                    target_subfolder = folder_path
                new_file_path = os.path.join(target_subfolder, new_file_name)
                counter = 1
                while os.path.exists(new_file_path):
                    base_name, ext = os.path.splitext(file)
                    new_file_name = f'{base_name}_{counter}{ext}'
                    new_file_path = os.path.join(target_subfolder, new_file_name)
                    counter += 1

                # 拷贝文件并进行哈希校验
                try:
                    logging.info(f"Copying {file} to {new_file_path}")
                    shutil.copy2(file_path, new_file_path)
                    with open(file_path, 'rb') as f1, open(new_file_path, 'rb') as f2:
                        hash1 = hashlib.sha256(f1.read()).hexdigest()
                        hash2 = hashlib.sha256(f2.read()).hexdigest()
                        if hash1 != hash2:
                            logging.error(f'哈希校验失败: {file}')
                        else:
                            logging.info(f'成功拷贝: {file}')
                except Exception as e:
                    logging.error(f'拷贝文件时出错: {file}, 错误信息: {e}')

            copied_files += 1
            progress = int((copied_files / total_files) * 100)
            self.progress_signal.emit(progress)

        # 确保进度条达到 100%
        self.progress_signal.emit(100)

        result_msg = f"拷贝完成，生成的文件夹有：{', '.join(created_folders)}"
        self.result_signal.emit(result_msg)
