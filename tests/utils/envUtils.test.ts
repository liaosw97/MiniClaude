import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getClaudeConfigHomeDir,
  getTeamsDir,
  hasNodeOption,
  isEnvTruthy,
  isEnvDefinedFalsy,
  isBareMode,
  parseEnvVars,
  shouldMaintainProjectWorkingDir,
  isRunningOnHomespace,
} from '../../src/utils/envUtils'

describe('getClaudeConfigHomeDir', () => {
  const originalEnv = process.env.CLAUDE_CONFIG_DIR

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.CLAUDE_CONFIG_DIR
    } else {
      process.env.CLAUDE_CONFIG_DIR = originalEnv
    }
  })

  it('CLAUDE_CONFIG_DIR 设置 → 使用自定义路径', () => {
    process.env.CLAUDE_CONFIG_DIR = '/custom/config'
    // memoize 需要清除缓存
    const result = getClaudeConfigHomeDir()
    expect(result).toContain('config')
  })

  it('CLAUDE_CONFIG_DIR 未设置 → 使用默认 ~/.claude', () => {
    delete process.env.CLAUDE_CONFIG_DIR
    const result = getClaudeConfigHomeDir()
    expect(result).toContain('.claude')
  })
})

describe('getTeamsDir', () => {
  it('返回 teams 子目录', () => {
    const result = getTeamsDir()
    expect(result).toContain('teams')
  })
})

describe('hasNodeOption', () => {
  const originalEnv = process.env.NODE_OPTIONS

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NODE_OPTIONS
    } else {
      process.env.NODE_OPTIONS = originalEnv
    }
  })

  it('NODE_OPTIONS 未设置 → 返回 false', () => {
    delete process.env.NODE_OPTIONS
    expect(hasNodeOption('--max-old-space-size=4096')).toBe(false)
  })

  it('NODE_OPTIONS 包含 flag → 返回 true', () => {
    process.env.NODE_OPTIONS = '--max-old-space-size=4096 --experimental-vm-modules'
    expect(hasNodeOption('--max-old-space-size=4096')).toBe(true)
    expect(hasNodeOption('--experimental-vm-modules')).toBe(true)
  })

  it('NODE_OPTIONS 不包含 flag → 返回 false', () => {
    process.env.NODE_OPTIONS = '--max-old-space-size=4096'
    expect(hasNodeOption('--other-flag')).toBe(false)
  })

  it('部分匹配不算 → 返回 false', () => {
    process.env.NODE_OPTIONS = '--max-old-space-size=4096'
    expect(hasNodeOption('--max')).toBe(false)
  })
})

describe('isEnvTruthy', () => {
  it('undefined → false', () => {
    expect(isEnvTruthy(undefined)).toBe(false)
  })

  it('false → false', () => {
    expect(isEnvTruthy(false)).toBe(false)
  })

  it('true → true', () => {
    expect(isEnvTruthy(true)).toBe(true)
  })

  it('空字符串 → false', () => {
    expect(isEnvTruthy('')).toBe(false)
  })

  it('"1" → true', () => {
    expect(isEnvTruthy('1')).toBe(true)
  })

  it('"true" → true', () => {
    expect(isEnvTruthy('true')).toBe(true)
  })

  it('"yes" → true', () => {
    expect(isEnvTruthy('yes')).toBe(true)
  })

  it('"on" → true', () => {
    expect(isEnvTruthy('on')).toBe(true)
  })

  it('"0" → false', () => {
    expect(isEnvTruthy('0')).toBe(false)
  })

  it('"false" → false', () => {
    expect(isEnvTruthy('false')).toBe(false)
  })

  it('大写 "TRUE" → true（大小写不敏感）', () => {
    expect(isEnvTruthy('TRUE')).toBe(true)
  })

  it('带空格 " true " → true（trim）', () => {
    expect(isEnvTruthy(' true ')).toBe(true)
  })
})

describe('isEnvDefinedFalsy', () => {
  it('undefined → false', () => {
    expect(isEnvDefinedFalsy(undefined)).toBe(false)
  })

  it('false → true', () => {
    expect(isEnvDefinedFalsy(false)).toBe(true)
  })

  it('true → false', () => {
    expect(isEnvDefinedFalsy(true)).toBe(false)
  })

  it('空字符串 → false', () => {
    expect(isEnvDefinedFalsy('')).toBe(false)
  })

  it('"0" → true', () => {
    expect(isEnvDefinedFalsy('0')).toBe(true)
  })

  it('"false" → true', () => {
    expect(isEnvDefinedFalsy('false')).toBe(true)
  })

  it('"no" → true', () => {
    expect(isEnvDefinedFalsy('no')).toBe(true)
  })

  it('"off" → true', () => {
    expect(isEnvDefinedFalsy('off')).toBe(true)
  })

  it('"1" → false', () => {
    expect(isEnvDefinedFalsy('1')).toBe(false)
  })
})

describe('isBareMode', () => {
  const originalEnv = process.env.CLAUDE_CODE_SIMPLE
  const originalArgv = process.argv

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.CLAUDE_CODE_SIMPLE
    } else {
      process.env.CLAUDE_CODE_SIMPLE = originalEnv
    }
    process.argv = originalArgv
  })

  it('CLAUDE_CODE_SIMPLE 未设置且无 --bare → false', () => {
    delete process.env.CLAUDE_CODE_SIMPLE
    process.argv = ['node', 'cli.js']
    expect(isBareMode()).toBe(false)
  })

  it('CLAUDE_CODE_SIMPLE=true → true', () => {
    process.env.CLAUDE_CODE_SIMPLE = 'true'
    process.argv = ['node', 'cli.js']
    expect(isBareMode()).toBe(true)
  })

  it('argv 包含 --bare → true', () => {
    delete process.env.CLAUDE_CODE_SIMPLE
    process.argv = ['node', 'cli.js', '--bare']
    expect(isBareMode()).toBe(true)
  })
})

describe('parseEnvVars', () => {
  it('undefined → 返回空对象', () => {
    expect(parseEnvVars(undefined)).toEqual({})
  })

  it('空数组 → 返回空对象', () => {
    expect(parseEnvVars([])).toEqual({})
  })

  it('单个 KEY=VALUE → 正确解析', () => {
    expect(parseEnvVars(['KEY=value'])).toEqual({ KEY: 'value' })
  })

  it('多个 KEY=VALUE → 正确解析', () => {
    expect(parseEnvVars(['A=1', 'B=2'])).toEqual({ A: '1', B: '2' })
  })

  it('VALUE 包含 = → 正确处理', () => {
    expect(parseEnvVars(['KEY=value=with=equals'])).toEqual({ KEY: 'value=with=equals' })
  })

  it('缺少 = → 抛出错误', () => {
    expect(() => parseEnvVars(['INVALID'])).toThrow('Invalid environment variable format')
  })

  it('缺少 KEY → 抛出错误', () => {
    expect(() => parseEnvVars(['=value'])).toThrow('Invalid environment variable format')
  })
})

describe('shouldMaintainProjectWorkingDir', () => {
  const originalEnv = process.env.CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR
    } else {
      process.env.CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR = originalEnv
    }
  })

  it('未设置 → false', () => {
    delete process.env.CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR
    expect(shouldMaintainProjectWorkingDir()).toBe(false)
  })

  it('"true" → true', () => {
    process.env.CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR = 'true'
    expect(shouldMaintainProjectWorkingDir()).toBe(true)
  })
})

describe('isRunningOnHomespace', () => {
  const originalUserType = process.env.USER_TYPE
  const originalHomespace = process.env.COO_RUNNING_ON_HOMESPACE

  afterEach(() => {
    if (originalUserType === undefined) {
      delete process.env.USER_TYPE
    } else {
      process.env.USER_TYPE = originalUserType
    }
    if (originalHomespace === undefined) {
      delete process.env.COO_RUNNING_ON_HOMESPACE
    } else {
      process.env.COO_RUNNING_ON_HOMESPACE = originalHomespace
    }
  })

  it('USER_TYPE 非 ant → false', () => {
    process.env.USER_TYPE = 'external'
    process.env.COO_RUNNING_ON_HOMESPACE = 'true'
    expect(isRunningOnHomespace()).toBe(false)
  })

  it('USER_TYPE=ant 但 COO 未设置 → false', () => {
    process.env.USER_TYPE = 'ant'
    delete process.env.COO_RUNNING_ON_HOMESPACE
    expect(isRunningOnHomespace()).toBe(false)
  })

  it('USER_TYPE=ant 且 COO=true → true', () => {
    process.env.USER_TYPE = 'ant'
    process.env.COO_RUNNING_ON_HOMESPACE = 'true'
    expect(isRunningOnHomespace()).toBe(true)
  })
})
