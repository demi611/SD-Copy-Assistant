from PyQt5.QtWidgets import (
    QWidget, QLabel, QLineEdit, QPushButton, QHBoxLayout,
    QDialog, QTextEdit, QVBoxLayout
)
from PyQt5.QtGui import QFont
from PyQt5.QtCore import Qt

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