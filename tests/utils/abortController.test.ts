import { describe, it, expect } from 'vitest'
import { createAbortController, createChildAbortController } from '../../src/utils/abortController'

describe('createAbortController', () => {
  it('返回 AbortController 实例', () => {
    const controller = createAbortController()
    expect(controller).toBeInstanceOf(AbortController)
    expect(controller.signal.aborted).toBe(false)
  })

  it('自定义 maxListeners', () => {
    const controller = createAbortController(100)
    expect(controller).toBeInstanceOf(AbortController)
  })
})

describe('createChildAbortController', () => {
  it('父未中止 → 子正常创建', () => {
    const parent = new AbortController()
    const child = createChildAbortController(parent)
    expect(child.signal.aborted).toBe(false)
  })

  it('父已中止 → 子立即中止', () => {
    const parent = new AbortController()
    parent.abort(new Error('test'))
    const child = createChildAbortController(parent)
    expect(child.signal.aborted).toBe(true)
  })

  it('父中止 → 子也中止', () => {
    const parent = new AbortController()
    const child = createChildAbortController(parent)
    parent.abort(new Error('test'))
    expect(child.signal.aborted).toBe(true)
  })

  it('子中止 → 父不受影响', () => {
    const parent = new AbortController()
    const child = createChildAbortController(parent)
    child.abort(new Error('child'))
    expect(parent.signal.aborted).toBe(false)
  })

  it('中止原因传播', () => {
    const parent = new AbortController()
    const child = createChildAbortController(parent)
    const reason = new Error('test reason')
    parent.abort(reason)
    expect(child.signal.reason).toBe(reason)
  })
})
