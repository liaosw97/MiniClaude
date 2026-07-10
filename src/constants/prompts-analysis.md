# Prompt 分析结果

## 文件结构
- 文件路径: src/constants/prompts.ts
- 总行数: 918

## 核心导出
- `getSystemPrompt()` (行 446) — 主要的 System Prompt 生成函数
- `prependBullets()` (行 167) — 工具函数
- `computeEnvInfo()` (行 610) — 环境信息计算
- `DEFAULT_AGENT_PROMPT` (行 762) — Agent 默认 Prompt

## 冗余识别
- 示例/说明文字: 12 处
- 可压缩段落: 大量重复的工具描述和说明

## 核心指令（必须保留）
- 工具使用规范: BashTool, FileEditTool, AgentTool 等工具的使用指南
- 输出格式约束: 响应格式、代码输出规范
- 安全边界: 危险命令检测、文件保护

## 工具 Prompt 文件
- src/tools/BashTool/prompt.ts (21130 bytes)
- src/tools/FileEditTool/prompt.ts (1895 bytes)
- src/tools/AgentTool/prompt.ts (16645 bytes)
