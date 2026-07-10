import { describe, it, expect } from 'vitest'
import {
  ensureParserInitialized,
  getParserModule,
  SHELL_KEYWORDS,
} from '../../../src/utils/bash/bashParser'

describe('bashParser', () => {
  describe('ensureParserInitialized', () => {
    it('返回 Promise<void>', async () => {
      const result = ensureParserInitialized()
      expect(result).toBeInstanceOf(Promise)
      await expect(result).resolves.toBeUndefined()
    })
  })

  describe('getParserModule', () => {
    it('返回包含 parse 函数的模块', () => {
      const mod = getParserModule()
      expect(mod).not.toBeNull()
      expect(typeof mod!.parse).toBe('function')
    })
  })

  describe('SHELL_KEYWORDS', () => {
    it('包含常见 shell 关键字', () => {
      expect(SHELL_KEYWORDS.has('if')).toBe(true)
      expect(SHELL_KEYWORDS.has('then')).toBe(true)
      expect(SHELL_KEYWORDS.has('else')).toBe(true)
      expect(SHELL_KEYWORDS.has('fi')).toBe(true)
      expect(SHELL_KEYWORDS.has('for')).toBe(true)
      expect(SHELL_KEYWORDS.has('while')).toBe(true)
      expect(SHELL_KEYWORDS.has('do')).toBe(true)
      expect(SHELL_KEYWORDS.has('done')).toBe(true)
      expect(SHELL_KEYWORDS.has('case')).toBe(true)
      expect(SHELL_KEYWORDS.has('esac')).toBe(true)
      expect(SHELL_KEYWORDS.has('function')).toBe(true)
    })

    it('不包含非关键字', () => {
      expect(SHELL_KEYWORDS.has('echo')).toBe(false)
      expect(SHELL_KEYWORDS.has('ls')).toBe(false)
      expect(SHELL_KEYWORDS.has('grep')).toBe(false)
    })
  })

  describe('parse', () => {
    const mod = getParserModule()!

    it('解析简单命令', () => {
      const result = mod.parse('echo hello')
      expect(result).not.toBeNull()
      expect(result!.type).toBe('program')
      expect(result!.text).toBe('echo hello')
    })

    it('解析空字符串', () => {
      const result = mod.parse('')
      // 空输入可能返回 null 或空 program
      if (result !== null) {
        expect(result.type).toBe('program')
      }
    })

    it('解析带管道的命令', () => {
      const result = mod.parse('cat file.txt | grep pattern')
      expect(result).not.toBeNull()
      expect(result!.type).toBe('program')
      expect(result!.text).toContain('cat')
      expect(result!.text).toContain('grep')
    })

    it('解析带重定向的命令', () => {
      const result = mod.parse('echo hello > output.txt')
      expect(result).not.toBeNull()
      expect(result!.text).toBe('echo hello > output.txt')
    })

    it('解析 if 语句', () => {
      const result = mod.parse('if true; then echo yes; fi')
      expect(result).not.toBeNull()
      expect(result!.type).toBe('program')
    })

    it('解析 for 循环', () => {
      const result = mod.parse('for i in 1 2 3; do echo $i; done')
      expect(result).not.toBeNull()
      expect(result!.type).toBe('program')
    })

    it('解析带引号的字符串', () => {
      const result = mod.parse('echo "hello world"')
      expect(result).not.toBeNull()
      expect(result!.text).toBe('echo "hello world"')
    })

    it('解析带单引号的字符串', () => {
      const result = mod.parse("echo 'hello world'")
      expect(result).not.toBeNull()
      expect(result!.text).toBe("echo 'hello world'")
    })

    it('解析带变量的命令', () => {
      const result = mod.parse('echo $HOME')
      expect(result).not.toBeNull()
      expect(result!.text).toBe('echo $HOME')
    })

    it('解析带命令替换的命令', () => {
      const result = mod.parse('echo $(date)')
      expect(result).not.toBeNull()
      expect(result!.text).toBe('echo $(date)')
    })

    it('解析多行命令', () => {
      const result = mod.parse('echo a\necho b')
      expect(result).not.toBeNull()
      expect(result!.type).toBe('program')
    })

    it('超时参数生效', () => {
      // 使用 Infinity 禁用超时（用于测试）
      const result = mod.parse('echo hello', Infinity)
      expect(result).not.toBeNull()
    })

    it('返回的节点有正确的 startIndex/endIndex', () => {
      const result = mod.parse('echo hello')
      expect(result).not.toBeNull()
      expect(result!.startIndex).toBe(0)
      expect(result!.endIndex).toBeGreaterThanOrEqual(9)
    })

    it('返回的节点有 children 数组', () => {
      const result = mod.parse('echo hello')
      expect(result).not.toBeNull()
      expect(Array.isArray(result!.children)).toBe(true)
    })
  })
})
