from PyQt5.QtWidgets import (
    QWidget, QLabel, QLineEdit, QPushButton, QHBoxLayout,
    QDialog, QTextEdit, QVBoxLayout, QApplication  # 新增QApplication导入
)
from PyQt5.QtGui import QFont
from PyQt5.QtCore import Qt, pyqtSignal  # 已有导入保持不变

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
        self.instruction_label.setFont(QFont('SF Pro', 11))
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

from PyQt5.QtWidgets import QHBoxLayout, QLabel, QLineEdit

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

from PyQt5.QtWidgets import QHBoxLayout, QComboBox, QPushButton
from PyQt5.QtCore import pyqtSignal  # 新增：导入pyqtSignal

class DateSelector(QWidget):
    date_selected = pyqtSignal(str)  # 日期选择信号
    
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
        self.combo.setStyleSheet("""
            QComboBox {
                border: 1px solid palette(mid);
                border-radius: 5px;
                padding: 5px 12px;
                font-size: 12px;
                background-color: palette(window); 
                color: palette(window-text);
            }
            QComboBox:focus { border-color: palette(highlight); }
        """)
        self.combo.setStyle(QApplication.style())  # 使用系统默认下拉箭头
        
        self.button = QPushButton("获取日期")
        self.button.setStyleSheet(button_style)
        
        layout.addWidget(self.label)
        layout.addWidget(self.combo, 1)
        layout.addWidget(self.button)
        
        self.setLayout(layout)

    def setup_connections(self):
        self.button.clicked.connect(self.on_get_dates_clicked)  # 关联获取日期逻辑

    def on_get_dates_clicked(self):
        # 实际逻辑应通过信号传递给MainWindow处理，此处仅示例
        self.date_selected.emit(self.combo.currentText())