import { describe, it, expect } from 'vitest'
import { setImmediateSafe, setIntervalSafe, clearIntervalSafe } from '../../../../src/services/trace/runtime/timers.js'

describe('timers', () => {
  it('setImmediateSafe should execute callback', async () => {
    return new Promise<void>((resolve) => {
      setImmediateSafe(() => {
        resolve()
      })
    })
  })

  it('setIntervalSafe should return a clearable handle', async () => {
    let count = 0
    const handle = setIntervalSafe(() => {
      count++
    }, 10)

    // 等待两次触发
    await new Promise(r => setTimeout(r, 25))

    // 清除定时器
    handle.clear()

    // 等待确认不会再有新的触发
    const before = count
    await new Promise(r => setTimeout(r, 30))
    expect(count).toBe(before)
  })

  it('clearIntervalSafe should handle undefined gracefully', () => {
    // 不应抛出异常
    clearIntervalSafe(undefined)
    clearIntervalSafe({ clear: () => {} })
  })

  it('clearIntervalSafe should call clear on handle', () => {
    let cleared = false
    clearIntervalSafe({ clear: () => { cleared = true } })
    expect(cleared).toBe(true)
  })
})