import os
import logging
import datetime
import configparser
from PyQt5.QtWidgets import (
    QApplication, QWidget, QVBoxLayout, QProgressBar, QLabel,
    QComboBox, QPushButton, QMessageBox, QHBoxLayout, QLineEdit, QCheckBox,
)
from PyQt5.QtGui import QFont, QPalette, QColor, QFontDatabase
from PyQt5.QtCore import Qt
# 导入拆分的模块
from utils import get_user_pictures_folder, get_user_videos_folder
from copy_thread import CopyThread
from components import DirectorySelector, InstructionDialog

logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

# 新增：定义输入框和按钮的样式（原main.py中缺失的样式变量）
input_style = """
    QLineEdit {
        border: 1px solid palette(mid);
        border-radius: 5px;
        padding: 5px 12px;
        font-size: 12px;
        background-color: palette(base);
        color: palette(window-text);
    }
    QLineEdit:focus {
        border-color: palette(highlight);
    }
"""

button_style = """
    QPushButton {
        border: 1px solid palette(mid);
        border-radius: 5px;
        padding: 5px 16px;
        font-size: 12px;
        background-color: palette(base);
        color: palette(window-text);
    }
    QPushButton:hover {
        border-color: palette(highlight);
        background-color: palette(alternate-base);
    }
"""

# 读取配置文件
config = configparser.ConfigParser()
config.read('config.ini')

# 获取默认路径（从utils导入的函数）
image_target_directory = config.get('Paths', 'image_target_directory', fallback=get_user_pictures_folder())
video_target_directory = config.get('Paths', 'video_target_directory', fallback=get_user_videos_folder())
sd_card_directory = config.get('Paths', 'sd_card_directory', fallback='/Volumes/Untitled')

class MainWindow(QWidget):
    def __init__(self):
        super().__init__()
        self.initUI()
        self.adapt_system_theme()  # 初始化时自动适配系统主题

    def initUI(self):
        # 设置窗口标题和大小
        self.setWindowTitle('拷卡助手')
        self.setGeometry(300, 300, 700, 400)  # 调整窗口初始尺寸更紧凑

        # 获取系统默认调色板并自动适配主题（优化字体适配）
        system_palette = QApplication.palette()
        self.setPalette(system_palette)
        # 检查SF Pro字体是否存在（简化字体名称）
        font_db = QFontDatabase()
        # 优先使用SF Pro，其次使用macOS通用字体（Helvetica Neue/Arial）
        preferred_fonts = ['SF Pro', 'Helvetica Neue', 'Arial']
        main_font = None
        for font in preferred_fonts:
            if font in font_db.families():
                main_font = QFont(font, 12)
                break
        if not main_font:
            main_font = QFont()  # 最终回退到系统默认
            logging.warning("系统未找到以下字体: SF Pro, Helvetica Neue, Arial，使用系统默认字体")  # 明确提示检查的字体列表
        QApplication.setFont(main_font)

        # 创建布局（优化：增加主布局边距和控件间距）
        main_layout = QVBoxLayout()
        main_layout.setContentsMargins(20, 20, 20, 20)  # 四边边距20px
        main_layout.setSpacing(15)  # 控件间距15px

        # 通用样式定义（调整输入框高度）
        input_style = """
            QLineEdit {
                border: 1px solid palette(mid);
                border-radius: 5px;
                padding: 5px 12px;
                font-size: 12px;
                color: palette(window-text);
                background-color: palette(window);
            }
            QLineEdit:focus {
                border-color: palette(highlight);
                background-color: palette(window);
            }
        """

        # 新增：定义通用按钮样式
        button_style = """
            QPushButton {
                border: 1px solid palette(mid);
                border-radius: 5px;
                padding: 5px 16px;
                font-size: 12px;
                background-color: palette(base);
                color: palette(window-text);
            }
            QPushButton:hover {
                border-color: palette(highlight);
                background-color: palette(alternate-base);
            }
        """

        # 图片目标目录选择（优化：标签固定宽度+输入框扩展）
        image_layout = QHBoxLayout()
        image_label = QLabel('图片目标目录:')
        image_label.setFixedWidth(100)  # 标签固定宽度对齐
        self.image_input = QLineEdit(image_target_directory)
        self.image_input.setStyleSheet(input_style)
        image_button = QPushButton('选择目录')
        image_button.setStyleSheet(button_style)  # 现在button_style已定义
        image_button.clicked.connect(self.select_image_directory)
        image_layout.addWidget(image_label)
        image_layout.addWidget(self.image_input, 1)  # 输入框占1份空间
        image_layout.addWidget(image_button)

        # 视频目标目录选择（样式与图片目录统一）
        video_layout = QHBoxLayout()
        video_label = QLabel('视频目标目录:')
        video_label.setFixedWidth(100)
        self.video_input = QLineEdit(video_target_directory)
        self.video_input.setStyleSheet(input_style)
        video_button = QPushButton('选择目录')
        video_button.setStyleSheet(button_style)  # 引用已定义的button_style
        video_button.clicked.connect(self.select_video_directory)
        video_layout.addWidget(video_label)
        video_layout.addWidget(self.video_input, 1)
        video_layout.addWidget(video_button)

        # SD 卡目录选择（样式统一）
        sd_layout = QHBoxLayout()
        sd_label = QLabel('SD 卡目录:')
        sd_label.setFixedWidth(100)
        self.sd_input = QLineEdit(sd_card_directory)
        self.sd_input.setStyleSheet(input_style)
        sd_button = QPushButton('选择目录')
        sd_button.setStyleSheet(button_style)  # 引用已定义的button_style
        sd_button.clicked.connect(self.select_sd_directory)
        sd_layout.addWidget(sd_label)
        sd_layout.addWidget(self.sd_input, 1)
        sd_layout.addWidget(sd_button)

        # 活动名称输入（优化：标签对齐+输入框扩展）
        event_layout = QHBoxLayout()
        event_label = QLabel('活动名称:')
        event_label.setFixedWidth(100)
        self.event_input = QLineEdit()
        self.event_input.setStyleSheet(input_style)
        event_layout.addWidget(event_label)
        event_layout.addWidget(self.event_input, 1)

        # 分开存放复选框（最终对齐方案：与其他行标签起始位置完全一致）
        separate_layout = QHBoxLayout()
        # 重置左边距为0（与image_layout/video_layout等子布局保持一致）
        separate_layout.setContentsMargins(0, 0, 0, 0)
        # 标题标签固定宽度100px（与"图片目标目录"等标签宽度一致）
        separate_title = QLabel('高级选项：')
        separate_title.setFont(main_font)
        separate_title.setFixedWidth(100)  # 关键：与其他标签宽度一致
        # 复选框直接跟随标题，不额外添加边距
        self.separate_raw_checkbox = QCheckBox('RAW和JPG文件分开保存')
        self.separate_raw_checkbox.setFont(main_font)
        # 添加顺序：标题+复选框
        separate_layout.addWidget(separate_title)
        separate_layout.addWidget(self.separate_raw_checkbox)

        # 日期选择布局（调整下拉框高度）
        date_layout = QHBoxLayout()  # 新增：初始化日期选择布局
        date_label = QLabel('选择日期:')  # 新增：定义日期标签
        date_label.setFixedWidth(100)  # 标签固定宽度对齐（与其他标签统一）
        self.date_combo = QComboBox()
        self.date_combo.setStyleSheet("""
            QComboBox {
                border: 1px solid palette(mid);
                border-radius: 5px;
                padding: 5px 12px;
                font-size: 12px;
                background-color: palette(base);
                color: palette(window-text);
            }
            QComboBox:focus {
                border-color: palette(highlight);
            }
            QComboBox::drop-down {
                width: 24px;
                border: none;
                background: transparent;
            }
            QComboBox::down-arrow {
                image: none;  /* 移除自定义SVG路径 */
            }
        """)
        # 重置为系统默认样式（自动使用标准下拉箭头）
        self.date_combo.setStyle(QApplication.style())
        date_button = QPushButton('获取日期')
        date_button.setStyleSheet(button_style)
        date_button.clicked.connect(self.get_dates)
        date_layout.addWidget(date_label)
        date_layout.addWidget(self.date_combo, 1)  # 下拉框占1份空间
        date_layout.addWidget(date_button)

        # 进度条（优化：增加高度+圆角，初始隐藏）
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)  # 初始隐藏
        self.progress_bar.setStyleSheet("""
            QProgressBar {
                border: 1px solid palette(midlight);
                border-radius: 8px;
                background-color: palette(base);
                height: 20px;
            }
            QProgressBar::chunk {
                background-color: palette(highlight);
                border-radius: 7px;
            }
        """)

        # 结果标签（优化：增加内边距+文字颜色）
        self.result_label = QLabel()
        self.result_label.setFont(QFont('SF Pro', 12))
        self.result_label.setWordWrap(True)
        self.result_label.setStyleSheet("padding: 10px; color: palette(window-text);")

        # 开始拷贝按钮（优化：强调按钮样式，调整尺寸）
        start_button = QPushButton('开始拷贝')
        start_button.setFont(QFont('SF Pro', 13, QFont.Medium))
        start_button.setStyleSheet("""
            QPushButton {
                background-color: #007AFF;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                margin: 10px 0;
            }
            QPushButton:hover {
                background-color: #0066CC;
            }
        """)
        start_button.clicked.connect(self.start_copying)  # 绑定类方法

        # 恢复使用说明按钮
        instruction_button = QPushButton('使用说明')
        instruction_button.setStyleSheet(button_style)  # 复用通用按钮样式
        instruction_button.clicked.connect(self.show_instruction_dialog)
        main_layout.addWidget(instruction_button, 0, Qt.AlignRight)  # 右对齐添加

        # 添加所有子布局到主布局
        main_layout.addLayout(image_layout)
        main_layout.addLayout(video_layout)
        main_layout.addLayout(sd_layout)
        main_layout.addLayout(event_layout)
        main_layout.addLayout(separate_layout)
        main_layout.addLayout(date_layout)
        main_layout.addWidget(self.progress_bar)
        main_layout.addWidget(self.result_label)
        main_layout.addWidget(start_button)

        # 设置主布局到窗口
        self.setLayout(main_layout)

    # 新增：处理图片目标目录选择的方法
    def select_image_directory(self):
        from PyQt5.QtWidgets import QFileDialog
        directory = QFileDialog.getExistingDirectory(
            self, "选择图片目标目录", self.image_selector.get_path()
        )
        if directory:
            self.image_selector.input.setText(directory)

    # 可选：补充其他目录选择方法（根据实际需求）
    # 新增：处理视频目标目录选择的方法
    def select_video_directory(self):
        from PyQt5.QtWidgets import QFileDialog
        directory = QFileDialog.getExistingDirectory(
            self, "选择视频目标目录", self.video_input.text()  # 修正为 self.video_input
        )
        if directory:
            self.video_input.setText(directory)  # 修正为 self.video_input

    # 新增：处理SD卡目录选择的方法
    def select_sd_directory(self):
        from PyQt5.QtWidgets import QFileDialog
        directory = QFileDialog.getExistingDirectory(
            self, "选择SD卡目录", self.sd_input.text()  # 修正为 self.sd_input
        )
        if directory:
            self.sd_input.setText(directory)  # 修正为 self.sd_input

    # 新增：自动适配系统主题的方法
    def adapt_system_theme(self):
        """适配系统主题"""
        # 兼容低版本 Qt（<5.14）的主题检测逻辑：通过背景色亮度判断
        palette = QApplication.palette()
        window_bg = palette.color(QPalette.Window)
        # 计算颜色亮度（0-255，值越小越暗）
        brightness = (window_bg.red() * 299 + window_bg.green() * 587 + window_bg.blue() * 114) // 1000
        if brightness < 128:  # 亮度低于128视为深色主题
            self.apply_dark_theme()
        else:
            self.apply_light_theme()

    def apply_dark_theme(self):
        """应用深色主题样式"""
        dark_palette = QPalette()
        # 定义深色主题的基础颜色（适配macOS深色模式）
        dark_bg = QColor(53, 53, 53)
        dark_text = Qt.white
        dark_base = QColor(25, 25, 25)
        
        # 设置各组件颜色
        dark_palette.setColor(QPalette.Window, dark_bg)          # 窗口背景
        dark_palette.setColor(QPalette.WindowText, dark_text)     # 窗口文本
        dark_palette.setColor(QPalette.Base, dark_base)           # 输入框背景
        dark_palette.setColor(QPalette.AlternateBase, dark_bg)    # 交替背景（如列表）
        dark_palette.setColor(QPalette.Text, dark_text)           # 输入框文本
        dark_palette.setColor(QPalette.Button, dark_bg)           # 按钮背景
        dark_palette.setColor(QPalette.ButtonText, dark_text)     # 按钮文本
        self.setPalette(dark_palette)

    def apply_light_theme(self):
        """应用浅色主题样式"""
        light_palette = QPalette()
        # 定义浅色主题的基础颜色（适配macOS浅色模式）
        light_bg = QColor(240, 240, 240)
        light_text = Qt.black
        light_base = QColor(255, 255, 255)
        
        # 设置各组件颜色
        light_palette.setColor(QPalette.Window, light_bg)         # 窗口背景
        light_palette.setColor(QPalette.WindowText, light_text)    # 窗口文本
        light_palette.setColor(QPalette.Base, light_base)          # 输入框背景
        light_palette.setColor(QPalette.AlternateBase, light_bg)   # 交替背景（如列表）
        light_palette.setColor(QPalette.Text, light_text)          # 输入框文本
        light_palette.setColor(QPalette.Button, light_bg)          # 按钮背景
        light_palette.setColor(QPalette.ButtonText, light_text)    # 按钮文本
        self.setPalette(light_palette)

    # 新增：获取日期并填充下拉框的方法
    def get_dates(self):
        """获取SD卡中图片/视频文件的修改日期并填充下拉框"""
        sd_card = self.sd_input.text()
        # 定义图片和视频扩展名（与CopyThread保持一致）
        image_extensions = (
            '.jpg', '.jpeg', '.png', '.raw', '.nef', '.cr2', '.CR3',
            '.arw',  # 索尼 RAW 格式
            '.dng',  # 通用 RAW 格式
            '.raf',  # 富士 RAW 格式
            '.orf',  # 奥林巴斯 RAW 格式
            '.pef',  # 宾得 RAW 格式
            '.srw',  # 三星 RAW 格式
            '.x3f'   # 适马 RAW 格式
            )
        video_extensions = ('.mp4', '.avi', '.mov')
        
        dates = set()
        # 遍历SD卡目录获取文件日期
        for root, _, files in os.walk(sd_card):
            for file in files:
                lower_file = file.lower()
                # 检查是否为图片或视频文件
                is_image = any(lower_file.endswith(ext) for ext in image_extensions)
                is_video = any(lower_file.endswith(ext) for ext in video_extensions)
                if is_image or is_video:
                    file_path = os.path.join(root, file)
                    try:
                        # 获取文件修改日期（格式YYYYMMDD）
                        mod_time = os.path.getmtime(file_path)
                        date_str = datetime.datetime.fromtimestamp(mod_time).strftime('%Y%m%d')
                        dates.add(date_str)
                    except Exception as e:
                        logging.error(f"获取文件{file}日期失败: {str(e)}")
        
        # 填充日期下拉框
        self.date_combo.clear()
        self.date_combo.addItem("全部日期")
        for date in sorted(dates):
            self.date_combo.addItem(date)
        # 提示用户结果
        self.result_label.setText(f"获取到{len(dates)}个有效日期，已填充下拉框" if dates else "未找到有效文件日期")

    # 新增：显示使用说明对话框的方法
    def show_instruction_dialog(self):
        """弹出使用说明对话框"""
        instruction_text = """使用说明：
1. 选择目标目录：分别设置图片和视频的存储路径（默认使用系统图片/视频文件夹）
2. 选择SD卡目录：指定需要拷贝的SD卡根目录
3. 输入活动名称：用于生成带日期的目标文件夹（如20240520_公司活动）
4. 选择日期：点击「获取日期」自动识别SD卡中文件的修改日期，可单选指定日期或选择「全部日期」
5. 高级选项：勾选「RAW和JPG文件分开保存」可将RAW格式图片单独存放
6. 开始拷贝：确认所有信息后点击「开始拷贝」，进度条会实时显示拷贝进度
"""
        dialog = InstructionDialog(self)  # 假设 components.py 中已定义 InstructionDialog 组件
        dialog.setWindowTitle("使用说明")
        dialog.set_message(instruction_text)  # 假设组件提供设置消息的方法
        dialog.exec_()

    # 新增：开始拷贝的核心方法（提升为类成员方法）
    def start_copying(self):
        """启动文件拷贝流程"""
        # 获取用户输入参数
        sd_path = self.sd_input.text().strip()
        image_target = self.image_input.text().strip()
        video_target = self.video_input.text().strip()
        event_name = self.event_input.text().strip()
        selected_date = self.date_combo.currentText()
        
        # 参数校验
        if not all([sd_path, image_target, video_target, event_name]):
            QMessageBox.warning(self, "输入缺失", "请填写所有必要信息（SD卡目录、目标目录、活动名称）")
            return
        
        # 初始化进度条（显示并重置）
        self.progress_bar.setVisible(True)
        self.progress_bar.setValue(0)
        self.result_label.setText("开始拷贝...")
    
        # 启动拷贝线程（假设CopyThread支持以下参数）
        self.copy_thread = CopyThread(
            sd_path=sd_path,
            image_target=image_target,
            video_target=video_target,
            event_name=event_name,
            selected_date=selected_date,
            separate_raw=self.separate_raw_checkbox.isChecked()
        )
        # 连接线程信号到UI更新（修正信号名称）
        self.copy_thread.progress_signal.connect(lambda p: self.progress_bar.setValue(p))  # 原 progress_updated → progress_signal
        self.copy_thread.result_signal.connect(lambda msg: self.result_label.setText(msg))  # 原 finished → result_signal（合并错误提示）
        # 注：CopyThread 未定义 error_occurred 信号，错误信息已通过 result_signal 传递

        # 启动线程
        self.copy_thread.start()

if __name__ == '__main__':
    app = QApplication([])
    window = MainWindow()
    window.show()
    app.exec_()