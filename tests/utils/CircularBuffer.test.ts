import { describe, it, expect } from 'vitest'
import { CircularBuffer } from '../../src/utils/CircularBuffer'

describe('CircularBuffer', () => {
  it('初始状态为空', () => {
    const buffer = new CircularBuffer<number>(3)
    expect(buffer.size).toBe(0)
    expect(buffer.toArray()).toEqual([])
  })

  it('添加元素', () => {
    const buffer = new CircularBuffer<number>(3)
    buffer.add(1)
    expect(buffer.size).toBe(1)
    expect(buffer.toArray()).toEqual([1])
  })

  it('添加多个元素', () => {
    const buffer = new CircularBuffer<number>(3)
    buffer.addAll([1, 2, 3])
    expect(buffer.size).toBe(3)
    expect(buffer.toArray()).toEqual([1, 2, 3])
  })

  it('超出容量 → 淘汰最旧元素', () => {
    const buffer = new CircularBuffer<number>(3)
    buffer.addAll([1, 2, 3, 4])
    expect(buffer.size).toBe(3)
    expect(buffer.toArray()).toEqual([2, 3, 4])
  })

  it('容量为 1', () => {
    const buffer = new CircularBuffer<number>(1)
    buffer.add(1)
    buffer.add(2)
    expect(buffer.size).toBe(1)
    expect(buffer.toArray()).toEqual([2])
  })

  it('清空缓冲区', () => {
    const buffer = new CircularBuffer<number>(3)
    buffer.addAll([1, 2, 3])
    buffer.clear()
    expect(buffer.size).toBe(0)
    expect(buffer.toArray()).toEqual([])
  })

  it('toArray 返回副本', () => {
    const buffer = new CircularBuffer<number>(3)
    buffer.addAll([1, 2])
    const arr = buffer.toArray()
    arr.push(3)
    expect(buffer.toArray()).toEqual([1, 2])
  })
})
