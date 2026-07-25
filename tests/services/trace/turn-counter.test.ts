import { describe, it, expect } from 'vitest'
import { createTurnCounter } from '../../../src/services/trace/turn-counter.js'

describe('turn-counter', () => {
  it('should start at 1 for new session', () => {
    const counter = createTurnCounter()
    expect(counter.next('session-1')).toBe(1)
  })

  it('should increment for same session', () => {
    const counter = createTurnCounter()
    expect(counter.next('session-1')).toBe(1)
    expect(counter.next('session-1')).toBe(2)
    expect(counter.next('session-1')).toBe(3)
  })

  it('should be independent across sessions', () => {
    const counter = createTurnCounter()
    expect(counter.next('session-a')).toBe(1)
    expect(counter.next('session-b')).toBe(1)
    expect(counter.next('session-a')).toBe(2)
    expect(counter.next('session-b')).toBe(2)
  })

  it('should support initial value for recovery', () => {
    const counter = createTurnCounter({ 'session-1': 5 })
    expect(counter.next('session-1')).toBe(6)
  })

  it('should get current turn without incrementing', () => {
    const counter = createTurnCounter()
    expect(counter.next('s')).toBe(1)
    expect(counter.current('s')).toBe(1)
    expect(counter.next('s')).toBe(2)
  })
})