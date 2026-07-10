import { describe, it, expect } from 'vitest'
import { isAgentSwarmsEnabled } from '../../src/utils/agentSwarmsEnabled'

describe('isAgentSwarmsEnabled', () => {
  it('返回 false（功能已移除）', () => {
    expect(isAgentSwarmsEnabled()).toBe(false)
  })
})
