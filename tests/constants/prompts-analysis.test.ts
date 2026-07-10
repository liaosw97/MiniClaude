import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'fs'

describe('System Prompt 分析结果', () => {
  const analysisPath = 'src/constants/prompts-analysis.md'

  it('分析结果文件应存在', () => {
    expect(existsSync(analysisPath)).toBe(true)
  })

  it('应包含文件结构分析', () => {
    const content = readFileSync(analysisPath, 'utf-8')
    expect(content).toContain('文件结构')
    expect(content).toContain('总行数')
  })

  it('应包含冗余识别结果', () => {
    const content = readFileSync(analysisPath, 'utf-8')
    expect(content).toContain('冗余识别')
  })

  it('应包含核心指令列表', () => {
    const content = readFileSync(analysisPath, 'utf-8')
    expect(content).toContain('核心指令')
  })
})
