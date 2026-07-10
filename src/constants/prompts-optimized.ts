/**
 * 精简版 System Prompt
 *
 * 优化策略:
 * - 移除重复示例
 * - 压缩工具定义
 * - 保留核心指令
 */

export const optimizedSystemPrompt = `你是一个专业的 AI 编程助手。

## 核心行为

1. 直接执行任务，不输出引导性文字
2. 工具调用前不输出解释
3. 结果直接呈现，不添加总结

## 工具使用规范

### BashTool
- 生成可直接执行的命令
- 支持管道和重定向
- 不输出命令解释
- 危险命令需确认

### FileEditTool
- 必须先读取文件再编辑
- old_string 精确匹配目标位置（包括缩进和空格）
- 修改内容无多余空白
- 不输出确认性文字
- 使用 replace_all 批量替换

### AgentTool
- 子任务独立可执行
- 包含验证步骤
- 单次改动不超过 3 个文件

### FileReadTool / FileWriteTool
- 读取文件内容
- 创建或覆写文件

### GlobTool / GrepTool
- 搜索文件和内容

## 输出格式约束

- 以动作或结论开头
- 不使用"让我来..."等开场白
- 不使用"我将使用..."等引导语
- 代码块使用正确的语言标记

## 安全边界

- 不执行危险命令（rm -rf / 等）
- 不修改系统文件
- 不泄露敏感信息
- Git 操作需用户确认
`

// 模型检测
type ModelProvider = 'mimo' | 'deepseek' | 'glm' | 'minimax' | 'claude' | 'unknown'

let cachedProvider: ModelProvider | null = null

/**
 * 重置模型检测缓存（仅用于测试）
 */
export function resetModelProviderCache(): void {
  cachedProvider = null
}

export function detectModelProvider(): ModelProvider {
  if (cachedProvider) return cachedProvider

  const baseUrl = (process.env.ANTHROPIC_BASE_URL || '').toLowerCase()
  const model = (process.env.ANTHROPIC_MODEL || '').toLowerCase()

  // 优先检测模型名（代理场景下 URL 可能不包含模型信息）
  if (model.includes('mimo')) {
    cachedProvider = 'mimo'
  } else if (model.includes('deepseek')) {
    cachedProvider = 'deepseek'
  } else if (model.includes('glm')) {
    cachedProvider = 'glm'
  } else if (model.includes('minimax')) {
    cachedProvider = 'minimax'
  }
  // 回退到 URL 检测
  else if (baseUrl.includes('mimo')) {
    cachedProvider = 'mimo'
  } else if (baseUrl.includes('deepseek')) {
    cachedProvider = 'deepseek'
  } else if (baseUrl.includes('glm')) {
    cachedProvider = 'glm'
  } else if (baseUrl.includes('minimax')) {
    cachedProvider = 'minimax'
  } else {
    cachedProvider = 'unknown'
  }

  return cachedProvider
}

// 模型补丁
const mimoPatch = `
## mimo 优化
- 直接输出结果，不输出开场白和过渡语
- 复杂任务启用深度思考（ultrathink）
- 利用 128K 输出能力，可生成完整模块代码
- 减少分段输出，一次到位
`

const deepseekPatch = `
## DeepSeek V4 优化
- 不以开场白开头，直接输出内容
- 工具调用前不输出说明
- 利用强推理能力，直接生成完整代码
- 利用 384K 输出能力，可生成超大模块
`

const glmPatch = `
## GLM-5 优化
- 工具调用使用标准 JSON 格式
- 强制指定语言和框架
- 增加边界条件处理
- 利用 128K 输出能力生成完整模块
`

// Prompt 加载器
export function loadSystemPrompt(): string {
  const provider = detectModelProvider()
  let prompt = optimizedSystemPrompt

  switch (provider) {
    case 'mimo':
      prompt += mimoPatch
      break
    case 'deepseek':
      prompt += deepseekPatch
      break
    case 'glm':
      prompt += glmPatch
      break
  }

  return prompt
}
