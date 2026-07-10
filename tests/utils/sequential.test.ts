import { describe, it, expect, vi } from 'vitest'
import { sequential } from '../../src/utils/sequential'

describe('sequential', () => {
  it('单次调用 → 正常执行', async () => {
    const fn = vi.fn().mockResolvedValue('result')
    const wrapped = sequential(fn)
    expect(await wrapped()).toBe('result')
  })

  it('多次调用 → 顺序执行', async () => {
    const order: number[] = []
    const fn = vi.fn().mockImplementation(async (id: number) => {
      await new Promise(resolve => setTimeout(resolve, 10))
      order.push(id)
      return id
    })
    const wrapped = sequential(fn)
    const results = await Promise.all([wrapped(1), wrapped(2), wrapped(3)])
    expect(results).toEqual([1, 2, 3])
    expect(order).toEqual([1, 2, 3])
  })

  it('函数抛出异常 → reject', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'))
    const wrapped = sequential(fn)
    await expect(wrapped()).rejects.toThrow('fail')
  })
})
