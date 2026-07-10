import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGet, mockPost } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
}))

vi.mock('axios', () => ({
  default: { get: mockGet, post: mockPost },
}))

import axios from 'axios'

describe('mock-api', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPost.mockReset()
  })

  it('mockGet → 2xx 响应', async () => {
    mockGet.mockResolvedValue({ data: { id: 1 }, status: 200 })
    const result = await axios.get('/api/test')
    expect(result.data).toEqual({ id: 1 })
    expect(result.status).toBe(200)
  })

  it('mockPost → 2xx 响应', async () => {
    mockPost.mockResolvedValue({ data: { created: true }, status: 201 })
    const result = await axios.post('/api/test', {})
    expect(result.data).toEqual({ created: true })
    expect(result.status).toBe(201)
  })

  it('mockGet → 4xx 错误', async () => {
    const error: any = new Error('Not Found')
    error.response = { status: 404, data: { message: 'Not Found' } }
    mockGet.mockRejectedValue(error)
    await expect(axios.get('/api/missing')).rejects.toThrow('Not Found')
  })

  it('mockGet → 网络错误', async () => {
    const error: any = new Error('Network Error')
    error.code = 'ECONNREFUSED'
    mockGet.mockRejectedValue(error)
    await expect(axios.get('/api/test')).rejects.toThrow('Network Error')
  })
})
