import os
import logging
import datetime
import configparser

from PyQt6.QtWidgets import (
    QApplication, QWidget, QVBoxLayout, QProgressBar, QLabel, QFileDialog,
    QComboBox, QPushButton, QMessageBox, QHBoxLayout, QLineEdit, QCheckBox, QSizePolicy
)
from PyQt6.QtGui import QFont, QPalette, QColor, QFontDatabase
from PyQt6.QtCore import Qt
# 导入拆分的模块
from utils import get_user_pictures_folder, get_user_videos_folder
from copy_thread import CopyThread
from components import DirectorySelector, InstructionDialog, EventNameInput, DateSelector  # 新增 DateSelector 导入

logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

class MainWindow(QWidget):
    def __init__(self):
        super().__init__()
        self.initUI()
        self.adapt_system_theme()
        # 启用macOS统一标题栏（需要Qt 5.11+）
        self.setWindowFlags(self.windowFlags() | Qt.WindowType.CustomizeWindowHint)
        self.setWindowFlags(self.windowFlags() & ~Qt.WindowType.WindowMinMaxButtonsHint)  # 保持原生按钮

    def select_directory(self, selector_component, title):
        """通用目录选择方法（替代三个重复方法）"""
        current_path = selector_component.get_path()
        directory = QFileDialog.getExistingDirectory(self, title, current_path)
        if directory:
            selector_component.input.setText(directory)

    def initUI(self):
        # 设置窗口标题和大小
        self.setWindowTitle('光影拷卡助手')
        self.setGeometry(300, 300, 700, 500)  # 调整窗口初始尺寸更紧凑

        # 获取系统默认调色板并自动适配主题
        system_palette = QApplication.palette()
        self.setPalette(system_palette)
        # 直接使用系统默认字体
        main_font = QFont()
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

        # 关键修改：统一非开始拷贝按钮的色调（新增按下状态样式）
        button_style = """
            QPushButton {
                border: 1px solid palette(mid);  /* 边框颜色与主题一致 */
                border-radius: 5px;
                padding: 7px 16px;
                font-size: 12px;
                background-color: palette(base);  /* 按钮背景与主题基础色一致 */
                color: palette(window-text);      /* 文字颜色与主题文本色一致 */
            }
            QPushButton:hover {
                border-color: palette(highlight);  /* 悬停时边框色为主题强调色 */
                background-color: palette(alternate-base);  /* 悬停背景与主题交替基础色一致 */
            }
            QPushButton:pressed {  /* 新增：按下状态样式 */
                border-color: palette(highlight);
                background-color: palette(highlight);  /* 按下时背景色为主题强调色 */
                color: white;  /* 按下时文字颜色反白 */
            }
        """

        # 替换为组件化实现（补充完整参数）
        self.image_selector = DirectorySelector(
            "图片目标目录",
            get_user_pictures_folder(),
            input_style,
            button_style
        )
        self.video_selector = DirectorySelector(
            "视频目标目录",
            get_user_videos_folder(),
            input_style,
            button_style
        )
        self.sd_selector = DirectorySelector(
            "SD卡目录",
            "",
            input_style,
            button_style
        )
        
        # 新增：绑定目录选择按钮的点击事件
        self.image_selector.button.clicked.connect(lambda: self.select_directory(self.image_selector, "选择图片目标目录"))
        self.video_selector.button.clicked.connect(lambda: self.select_directory(self.video_selector, "选择视频目标目录"))
        self.sd_selector.button.clicked.connect(lambda: self.select_directory(self.sd_selector, "选择SD卡目录"))

        # 新增封装的组件
        self.event_input = EventNameInput(input_style)  # 来自components.py
        self.date_selector = DateSelector(button_style)  # 来自components.py
        
        # 连接组件信号（新增：绑定获取日期按钮点击事件）
        self.date_selector.button.clicked.connect(self.get_dates)  # 关键修改：将获取日期按钮与get_dates方法绑定
        self.date_selector.date_selected.connect(self.handle_date_selected)
    
        # 主布局添加组件
        main_layout.addWidget(self.image_selector)
        main_layout.addWidget(self.video_selector)
        main_layout.addWidget(self.sd_selector)
        main_layout.addWidget(self.event_input)
        main_layout.addWidget(self.date_selector)

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
        self.result_label.setFont(main_font)
        self.result_label.setWordWrap(True)
        self.result_label.setStyleSheet("padding: 10px; color: palette(window-text);")

        # 开始拷贝按钮（优化：强调按钮样式，调整尺寸）
        start_button = QPushButton('开始拷贝')
        start_button.setFont(QFont(main_font.family(), 15, QFont.Weight.Medium))
        # 关键修改：固定按钮宽度并调整策略
        start_button.setStyleSheet("""
            QPushButton {
                background-color: #007AFF;
                color: white;
                border: none;
                padding: 10px 16px;  /* 水平内边距控制基础宽度 */
                border-radius: 8px;
                margin: 10px 0;
            }
            QPushButton:hover {
                background-color: #0066CC;
            }
        """)
        # 新增：显式固定按钮宽度（例如 120px，可根据需求调整）
        start_button.setFixedWidth(180)
        # 调整尺寸策略为 Fixed（严格按 setFixedWidth 控制宽度）

        start_button.setSizePolicy(QSizePolicy.Policy.Fixed, QSizePolicy.Policy.Fixed)
        start_button.clicked.connect(self.start_copying)  # 绑定类方法

        # 使用说明按钮
        instruction_button = QPushButton('使用说明')
        instruction_button.setStyleSheet(button_style)  # 复用通用按钮样式
        instruction_button.clicked.connect(self.show_instruction_dialog)

        main_layout.addLayout(separate_layout)
        main_layout.addWidget(self.progress_bar)
        main_layout.addWidget(self.result_label)

        main_layout.addWidget(start_button, 0, Qt.AlignmentFlag.AlignHCenter)
        # 修改：将使用说明按钮添加到主布局的最后，左对齐（确保在底部）
        main_layout.addWidget(instruction_button, 0, Qt.AlignmentFlag.AlignLeft)  # 左对齐添加

        # 设置主布局到窗口
        self.setLayout(main_layout)
    # 可选：补充其他目录选择方法（根据实际需求）
    # 新增：自动适配系统主题的方法
    def adapt_system_theme(self):
        """深度适配macOS系统主题（支持10.14+暗模式）"""
        # 使用Qt 5.14+的系统主题检测（兼容旧版本）
        if hasattr(QApplication, "styleHints"):
            theme = QApplication.styleHints().colorScheme()
            # 关键修改：QPalette.ColorScheme → Qt.ColorScheme
            if theme == Qt.ColorScheme.Dark:
                self.apply_macos_dark_theme()
            else:
                self.apply_macos_light_theme()
        else:
            # 兼容旧版本的亮度检测逻辑（保留原有）
            palette = QApplication.palette()
            window_bg = palette.color(QPalette.Window)
            brightness = (window_bg.red() * 299 + window_bg.green() * 587 + window_bg.blue() * 114) // 1000
            if brightness < 128:
                self.apply_macos_dark_theme()
            else:
                self.apply_macos_light_theme()
    
    def apply_macos_dark_theme(self):
        """应用macOS原生深色主题"""
        dark_palette = QApplication.palette()
        # 关键修改：Qt.white → Qt.GlobalColor.white（其他颜色同理）
        dark_palette.setColor(QPalette.ColorRole.Window, QColor(53, 53, 53))        
        dark_palette.setColor(QPalette.ColorRole.WindowText, Qt.GlobalColor.white)             
        dark_palette.setColor(QPalette.ColorRole.Base, QColor(40, 40, 40))         
        dark_palette.setColor(QPalette.ColorRole.AlternateBase, QColor(50, 50, 50))
        dark_palette.setColor(QPalette.ColorRole.Highlight, QColor(0, 122, 255))   
        self.setPalette(dark_palette)
    
    def apply_macos_light_theme(self):
        """应用macOS原生浅色主题"""
        light_palette = QApplication.palette()
        # 关键修改：Qt.black → Qt.GlobalColor.black（其他颜色同理）
        light_palette.setColor(QPalette.ColorRole.Window, QColor(240, 240, 240))    
        light_palette.setColor(QPalette.ColorRole.WindowText, Qt.GlobalColor.black)             
        light_palette.setColor(QPalette.ColorRole.Base, QColor(255, 255, 255))      
        light_palette.setColor(QPalette.ColorRole.AlternateBase, QColor(245, 245, 245))
        light_palette.setColor(QPalette.ColorRole.Highlight, QColor(0, 122, 255))   
        self.setPalette(light_palette)

    # 新增：获取日期并填充下拉框的方法
    def get_dates(self):
        """获取SD卡中图片/视频文件的修改日期并填充下拉框"""
        sd_card = self.sd_selector.get_path()  # 修正：通过组件获取SD卡路径
        # 从utils导入统一的扩展名定义（需先在utils.py中定义）
        from utils import IMAGE_EXTENSIONS, VIDEO_EXTENSIONS
        
        dates = set()
        # 检查SD卡路径是否有效
        if not sd_card:
            self.result_label.setText("错误：未选择SD卡目录")
            return
        if not os.path.isdir(sd_card):
            self.result_label.setText(f"错误：SD卡路径无效 - {sd_card}")
            return
        
        # 遍历SD卡目录获取文件日期（新增外层异常捕获）
        try:
            for root, _, files in os.walk(sd_card):
                for file in files:
                    lower_file = file.lower()
                    # 检查是否为图片或视频文件
                    is_image = any(lower_file.endswith(ext) for ext in IMAGE_EXTENSIONS)
                    is_video = any(lower_file.endswith(ext) for ext in VIDEO_EXTENSIONS)
                    if is_image or is_video:
                        file_path = os.path.join(root, file)
                        try:
                            # 获取文件修改日期（格式YYYYMMDD）
                            mod_time = os.path.getmtime(file_path)
                            date_str = datetime.datetime.fromtimestamp(mod_time).strftime('%Y%m%d')
                            dates.add(date_str)
                        except Exception as e:
                            logging.error(f"获取文件{file}日期失败: {str(e)}")
        except Exception as e:
            logging.error(f"遍历SD卡目录失败: {str(e)}")
            self.result_label.setText(f"错误：无法遍历SD卡目录 - {str(e)}")
            return
        
        # 填充日期下拉框（假设使用DateSelector组件的combo属性）
        self.date_selector.combo.clear()
        self.date_selector.combo.addItem("全部日期")
        for date in sorted(dates):
            self.date_selector.combo.addItem(date)
        # 提示用户结果
        self.result_label.setText(f"获取到{len(dates)}个有效日期，已填充下拉框" if dates else "未找到有效文件日期")

    # 新增：显示使用说明对话框的方法（关键修改）
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
        try:
            dialog = InstructionDialog(self)  # self 指向 MainWindow 实例（需确保方法在 MainWindow 类内）
            dialog.setFont(QApplication.font())
            dialog.setWindowTitle("使用说明")
            dialog.set_message(instruction_text)
            dialog.exec()  # PyQt6 中使用 exec() 替代 exec_()
        except Exception as e:
            logging.error(f"使用说明对话框初始化失败: {str(e)}")
            QMessageBox.warning(self, "错误", "无法显示使用说明，请检查程序配置")

    # 新增：开始拷贝的核心方法（提升为类成员方法）
    def start_copying(self):
        """启动文件拷贝流程"""
        # 获取用户输入参数（修正：通过组件的input属性获取输入框文本）
        sd_path = self.sd_selector.input.text().strip()  # 原 self.sd_input → self.sd_selector.input
        image_target = self.image_selector.input.text().strip()  # 原 self.image_input → self.image_selector.input
        video_target = self.video_selector.input.text().strip()  # 原 self.video_input → self.video_selector.input
        event_name = self.event_input.input.text().strip()  # 假设 EventNameInput 组件的输入框为 input 属性（需根据 components.py 实际定义调整）
        selected_date = self.date_selector.combo.currentText()  # 原 self.date_combo → self.date_selector.combo
        
        # 参数校验（补充路径有效性检查）
        if not all([sd_path, image_target, video_target, event_name]):
            QMessageBox.warning(self, "输入缺失", "请填写所有必要信息（SD卡目录、目标目录、活动名称）")
            return
        
        # 检查路径是否存在且为目录
        from PyQt6.QtCore import QDir
        
        # 在路径校验部分替换为：
        for path in [sd_path, image_target, video_target]:
            qdir = QDir(path)
            if not qdir.exists():
                QMessageBox.warning(self, "路径错误", f"路径不存在：{path}")
                return
            if not qdir.isDir():
                QMessageBox.warning(self, "路径错误", f"不是目录：{path}")
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

    # 新增：处理日期选择的槽函数
    def handle_date_selected(self, selected_date):
        """处理日期选择信号"""
        logging.debug(f"选中的日期：{selected_date}")
        # 示例：更新内部状态或触发重新扫描
        self.selected_date = selected_date if selected_date != "全部日期" else None
        # 修改：通过DateSelector组件的combo属性访问下拉框
        if selected_date in [self.date_selector.combo.itemText(i) for i in range(self.date_selector.combo.count())]:
            self.date_selector.combo.setCurrentText(selected_date)

if __name__ == '__main__':
    app = QApplication([])
    window = MainWindow()
    window.show()
    app.exec()