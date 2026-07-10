import { describe, it, expect } from 'vitest'

describe('FileEditTool Prompt 优化', () => {
  it('应导出 getEditToolDescription 函数', async () => {
    const { getEditToolDescription } = await import('src/tools/FileEditTool/prompt')
    expect(typeof getEditToolDescription).toBe('function')
  })

  it('应返回包含精确匹配指令的描述', async () => {
    const { getEditToolDescription } = await import('src/tools/FileEditTool/prompt')
    const description = getEditToolDescription()
    expect(description).toContain('old_string')
    expect(description).toContain('exact')
  })

  it('应包含先读取文件的指令', async () => {
    const { getEditToolDescription } = await import('src/tools/FileEditTool/prompt')
    const description = getEditToolDescription()
    expect(description).toContain('Read')
  })

  it('应包含 replace_all 说明', async () => {
    const { getEditToolDescription } = await import('src/tools/FileEditTool/prompt')
    const description = getEditToolDescription()
    expect(description).toContain('replace_all')
  })
})
