import { vi } from 'vitest'

// Mock bun:bundle - provides feature() function for build-time feature flags
vi.mock('bun:bundle', () => ({
  feature: vi.fn((name: string) => {
    // Return false for all features by default in test environment
    // Individual tests can override via vi.mocked(feature).mockReturnValue(true)
    return false
  }),
}))
