<!--
 * @Author: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @Date: 2025-05-30 22:11:38
 * @LastEditors: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @LastEditTime: 2025-05-30 22:20:31
 * @FilePath: /SD-Copy-Assistant/README.md
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
# SD-Copy-Assistant
## 项目介绍
SD-Copy-Assistant 是一个基于 Python 和 PyQt5 开发的图形化工具，主要用于从 SD 卡快速、安全地拷贝图片（含 RAW 格式）和视频文件到本地目标目录。支持按文件修改日期、活动名称自动分类存储，提供 RAW 与 JPG 格式可选分开存储功能，并包含文件哈希校验确保拷贝完整性，同时适配系统深浅主题，提升跨平台使用体验。

## 功能特性
- 多格式支持 ：兼容常见图片格式（ .jpg , .jpeg , .png 及多种 RAW 格式如 .nef , .cr2 , .arw 等）和视频格式（ .mp4 , .avi , .mov ）。
- 智能分类存储 ：
  - 自动根据文件修改日期和用户输入的活动名称生成目标文件夹（格式： YYYYMMDD_活动名称 ）。
  - 可选将 RAW 与 JPG 图片分别存储到 RAW 和 JPG 子目录（需勾选「RAW和JPG文件分开保存」选项）。
- 进度与校验 ：实时显示拷贝进度条，拷贝完成后通过 SHA256 哈希校验确保文件完整性。
- 主题适配 ：自动检测系统主题（深色/浅色），并调整界面颜色以匹配系统风格。
- 日期过滤 ：支持获取 SD 卡中文件的修改日期并通过下拉框筛选，仅拷贝指定日期的文件。
## 代码结构
项目主要包含以下文件，分工明确：

SD-Copy-Assistant/
├── .gitignore               # Git忽略规则文件
├── README.md                 # 项目说明文档
├── components.py             # UI组件封装（目录选择器、使用说明对话框）
├── copy_thread.py            # 拷贝任务线程（处理文件遍历、分类、拷贝逻辑）
├── main.py                   # 主窗口逻辑（UI初始化、事件处理、主题适配）
└── utils.py                  # 工具函数（获取系统图片/视频目录）
## 使用说明
1. 设置目标目录 ：
   - 分别选择图片和视频的存储路径（默认使用系统图片/视频文件夹）。
2. 指定 SD 卡目录 ：选择需要拷贝的 SD 卡根目录。
3. 输入活动名称 ：用于生成带日期的目标文件夹（如 20240520_公司活动 ）。
4. 获取并选择日期 ：点击「获取日期」自动识别 SD 卡中文件的修改日期，可单选指定日期或选择「全部日期」。
5. 高级选项（可选） ：勾选「RAW和JPG文件分开保存」可将 RAW 格式图片单独存放至 RAW 子目录，JPG 存至 JPG 子目录。
6. 开始拷贝 ：确认信息后点击「开始拷贝」，进度条实时显示拷贝进度，完成后显示生成的目标文件夹路径。
## 依赖环境
- Python 3.6+
- PyQt5（图形界面库）
- 系统需安装 SF Pro 字体（可选，未安装时自动回退至系统默认字体）。
## 注意事项
- 拷贝过程中请勿断开 SD 卡或终止程序，以免导致文件损坏。
- 若拷贝大文件（如 4K 视频），哈希校验可能耗时较长，属正常现象。
- 首次运行需确保 utils.py 中系统路径获取逻辑与当前操作系统匹配（已兼容主流系统）。