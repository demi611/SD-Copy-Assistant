from PyQt6.QtWidgets import (
    QWidget, QLabel, QLineEdit, QPushButton, QHBoxLayout,
    QDialog, QTextEdit, QVBoxLayout, QApplication, QStyleFactory,
    QHBoxLayout, QLabel, QLineEdit, QHBoxLayout, QComboBox, QPushButton
)
from PyQt6.QtCore import Qt, pyqtSignal

class DirectorySelector(QWidget):
    """目录选择组件（独立封装）"""
    def __init__(self, label_text, default_path, input_style, button_style):
        super().__init__()
        self.label = QLabel(label_text)
        self.label.setFixedWidth(100)
        self.input = QLineEdit(default_path)
        self.input.setStyleSheet(input_style)
        self.button = QPushButton('选择目录')
        self.button.setStyleSheet(button_style)
        
        layout = QHBoxLayout()
        layout.addWidget(self.label)
        layout.addWidget(self.input, 1)
        layout.addWidget(self.button)
        self.setLayout(layout)

    def get_path(self):
        return self.input.text()

class InstructionDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("使用说明")
        self.setGeometry(400, 400, 600, 400)
        
        # 初始化布局和说明文本框（设为实例变量）
        layout = QVBoxLayout()
        self.instruction_label = QTextEdit()
        self.instruction_label.setReadOnly(True)
        # 移除自定义字体设置，使用系统默认
        self.instruction_label.setStyleSheet("""
            QTextEdit {
                background-color: palette(window);
                color: palette(window-text);
                border: 1px solid palette(midlight);
                border-radius: 8px;
                padding: 15px;
                opacity: 0.9;
            }
        """)
        layout.addWidget(self.instruction_label)
        self.setLayout(layout)

    # 确保此方法缩进与 __init__ 方法一致（属于 InstructionDialog 类）
    def set_message(self, text):
        self.instruction_label.setText(text)

class EventNameInput(QWidget):
    def __init__(self, input_style, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.init_ui(input_style)

    def init_ui(self, input_style):
        layout = QHBoxLayout()
        layout.setContentsMargins(0, 0, 0, 0)  # 保持与主布局一致的边距
        
        self.label = QLabel("活动名称:")
        self.label.setFixedWidth(100)  # 与其他标签宽度对齐
        
        self.input = QLineEdit()
        self.input.setStyleSheet(input_style)
        
        layout.addWidget(self.label)
        layout.addWidget(self.input, 1)  # 输入框扩展填充
        
        self.setLayout(layout)

class DateSelector(QWidget):
    date_selected = pyqtSignal(str)
    
    def __init__(self, button_style, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.init_ui(button_style)
        self.setup_connections()

    def init_ui(self, button_style):
        layout = QHBoxLayout()
        layout.setContentsMargins(0, 0, 0, 0)
        
        self.label = QLabel("选择日期:")
        self.label.setFixedWidth(100)
        
        self.combo = QComboBox()
        # macOS Aqua风格增强：调整圆角和内边距匹配系统控件
        self.combo.setStyleSheet("""
            QComboBox {
                border: 1px solid palette(mid);
                border-radius: 8px;  /* 更接近macOS原生控件的圆角 */
                padding: 6px 14px;  /* 垂直内边距增加1px更舒适 */
                font-size: 13px;    /* 调整字体大小匹配系统默认 */
                background-color: palette(base);  /* 使用系统基础色 */
                color: palette(window-text);
            }
            QComboBox:focus { 
                border-color: palette(highlight);
                background-color: palette(window);  /* 聚焦时背景色更接近系统效果 */
            }
            QComboBox::drop-down {
                subcontrol-origin: padding;
                subcontrol-position: top right;
                width: 20px;
                border-left-width: 1px;
                border-left-color: palette(mid);
                border-left-style: solid;
                border-top-right-radius: 8px;
                border-bottom-right-radius: 8px;
            }
        """)
        # 确保使用Aqua样式（已存在，保留增强）
        self.combo.setStyle(QStyleFactory.create("Aqua"))

        self.button = QPushButton("获取日期")
        # 按钮样式适配macOS圆角和按压效果
        self.button.setStyleSheet("""
            QPushButton {
                border: 1px solid palette(mid);
                border-radius: 8px;  /* 与输入框圆角一致 */
                padding: 6px 16px;  /* 调整内边距匹配高度 */
                font-size: 13px;
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 palette(button),
                    stop:1 palette(button));  /* 平化渐变更接近macOS按钮 */
                color: palette(window-text);
            }
            QPushButton:hover {
                border-color: palette(highlight);
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 palette(alternate-base),
                    stop:1 palette(alternate-base));
            }
            QPushButton:pressed {
                background: palette(highlight);
                color: white;
            }
        """)
        
        layout.addWidget(self.label)
        layout.addWidget(self.combo, 1)
        layout.addWidget(self.button)
        
        self.setLayout(layout)

    def setup_connections(self):
        self.button.clicked.connect(self.on_get_dates_clicked)  # 关联获取日期逻辑

    def on_get_dates_clicked(self):
        # 实际逻辑应通过信号传递给MainWindow处理，此处仅示例
        self.date_selected.emit(self.combo.currentText())