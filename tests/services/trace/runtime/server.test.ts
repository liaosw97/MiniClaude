import { describe, it, expect } from 'vitest'
import type { HttpServer } from '../../../../src/services/trace/runtime/server.js'

describe('HttpServer interface', () => {
  it('should define serve method with correct signature', () => {
    const server: HttpServer = {
      serve: async (handler) => {
        const port = 0
        return { port, stop: () => {} }
      }
    }
    expect(typeof server.serve).toBe('function')
  })
})