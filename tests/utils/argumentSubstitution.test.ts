import { describe, it, expect } from 'vitest'
import {
  parseArguments,
  parseArgumentNames,
  generateProgressiveArgumentHint,
  substituteArguments,
} from '../../src/utils/argumentSubstitution'

describe('parseArguments', () => {
  it('空字符串 → 空数组', () => {
    expect(parseArguments('')).toEqual([])
  })

  it('纯空格 → 空数组', () => {
    expect(parseArguments('   ')).toEqual([])
  })

  it('简单参数 → 分割', () => {
    expect(parseArguments('foo bar baz')).toEqual(['foo', 'bar', 'baz'])
  })

  it('带引号参数 → 合并', () => {
    expect(parseArguments('foo "hello world" baz')).toEqual(['foo', 'hello world', 'baz'])
  })
})

describe('parseArgumentNames', () => {
  it('undefined → 空数组', () => {
    expect(parseArgumentNames(undefined)).toEqual([])
  })

  it('字符串 → 按空格分割', () => {
    expect(parseArgumentNames('foo bar baz')).toEqual(['foo', 'bar', 'baz'])
  })

  it('数组 → 直接返回', () => {
    expect(parseArgumentNames(['foo', 'bar'])).toEqual(['foo', 'bar'])
  })

  it('过滤空字符串', () => {
    expect(parseArgumentNames(['foo', '', 'bar'])).toEqual(['foo', 'bar'])
  })

  it('过滤纯数字名称', () => {
    expect(parseArgumentNames(['foo', '123', 'bar'])).toEqual(['foo', 'bar'])
  })

  it('其他类型 → 空数组', () => {
    expect(parseArgumentNames(123 as any)).toEqual([])
  })
})

describe('generateProgressiveArgumentHint', () => {
  it('无已输入参数 → 返回全部', () => {
    expect(generateProgressiveArgumentHint(['foo', 'bar'], [])).toBe('[foo] [bar]')
  })

  it('部分已输入 → 返回剩余', () => {
    expect(generateProgressiveArgumentHint(['foo', 'bar', 'baz'], ['a'])).toBe('[bar] [baz]')
  })

  it('全部已输入 → 返回 undefined', () => {
    expect(generateProgressiveArgumentHint(['foo', 'bar'], ['a', 'b'])).toBeUndefined()
  })
})

describe('substituteArguments', () => {
  it('args 为 undefined → 返回原内容', () => {
    expect(substituteArguments('hello $ARGUMENTS', undefined)).toBe('hello $ARGUMENTS')
  })

  it('args 为 null → 返回原内容', () => {
    expect(substituteArguments('hello $ARGUMENTS', null as any)).toBe('hello $ARGUMENTS')
  })

  it('$ARGUMENTS → 替换为完整参数', () => {
    expect(substituteArguments('run $ARGUMENTS', 'foo bar')).toBe('run foo bar')
  })

  it('$ARGUMENTS[0] → 替换为索引参数', () => {
    expect(substituteArguments('first: $ARGUMENTS[0]', 'foo bar')).toBe('first: foo')
  })

  it('$0 → 替换为索引参数', () => {
    expect(substituteArguments('first: $0', 'foo bar')).toBe('first: foo')
  })

  it('$1 → 替换为第二个参数', () => {
    expect(substituteArguments('second: $1', 'foo bar')).toBe('second: bar')
  })

  it('索引超出范围 → 替换为空', () => {
    expect(substituteArguments('third: $2', 'foo bar')).toBe('third: ')
  })

  it('无占位符且 appendIfNoPlaceholder=true → 追加', () => {
    expect(substituteArguments('hello', 'foo bar', true)).toBe('hello\n\nARGUMENTS: foo bar')
  })

  it('无占位符且 appendIfNoPlaceholder=false → 不追加', () => {
    expect(substituteArguments('hello', 'foo bar', false)).toBe('hello')
  })

  it('无占位符且 args 为空 → 不追加', () => {
    expect(substituteArguments('hello', '', true)).toBe('hello')
  })

  it('命名参数 → 替换', () => {
    expect(substituteArguments('hello $foo', 'bar baz', true, ['foo'])).toBe('hello bar')
  })

  it('命名参数未匹配 → 替换为空', () => {
    expect(substituteArguments('hello $foo', '', true, ['foo'])).toBe('hello ')
  })
})
