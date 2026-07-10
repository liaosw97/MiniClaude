import { vi } from 'vitest'

/**
 * 创建 axios mock 实例。
 * 在测试文件中使用时，需要在文件顶部声明：
 *
 * ```ts
 * const mock = createMockApi()
 * vi.mock('axios', () => ({ default: mock.axiosInstance }))
 * import axios from 'axios'
 * ```
 */
export function createMockApi() {
  const mockGet = vi.fn()
  const mockPost = vi.fn()
  const mockPut = vi.fn()
  const mockPatch = vi.fn()
  const mockDelete = vi.fn()

  const axiosInstance = {
    get: mockGet,
    post: mockPost,
    put: mockPut,
    patch: mockPatch,
    delete: mockDelete,
    create: vi.fn().mockReturnThis(),
    defaults: { headers: { common: {} } },
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
  }

  return {
    axiosInstance,
    mockGet,
    mockPost,
    mockPut,
    mockPatch,
    mockDelete,
    mockAxiosGet(data: any, status = 200) {
      mockGet.mockResolvedValue({ data, status, statusText: 'OK', headers: {}, config: {} as any })
    },
    mockAxiosPost(data: any, status = 200) {
      mockPost.mockResolvedValue({ data, status, statusText: 'OK', headers: {}, config: {} as any })
    },
    mockAxiosError(status: number, message: string) {
      const error: any = new Error(message)
      error.response = { status, data: { message }, statusText: message, headers: {}, config: {} }
      mockGet.mockRejectedValue(error)
      mockPost.mockRejectedValue(error)
    },
    mockAxiosNetworkError(message = 'Network Error') {
      const error: any = new Error(message)
      error.code = 'ECONNREFUSED'
      mockGet.mockRejectedValue(error)
      mockPost.mockRejectedValue(error)
    },
    mockAxiosTimeout() {
      const error: any = new Error('timeout of 30000ms exceeded')
      error.code = 'ECONNABORTED'
      mockGet.mockRejectedValue(error)
      mockPost.mockRejectedValue(error)
    },
    clearApiMocks() {
      mockGet.mockReset()
      mockPost.mockReset()
      mockPut.mockReset()
      mockPatch.mockReset()
      mockDelete.mockReset()
    },
  }
}
