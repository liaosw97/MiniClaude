import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ActivityManager } from '../../src/utils/activityManager.js'

describe('ActivityManager', () => {
  let manager: ActivityManager
  let mockNow: number
  let mockCounter: { add: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    mockNow = 1000000
    mockCounter = { add: vi.fn() }
    manager = ActivityManager.createInstance({
      getNow: () => mockNow,
      getActiveTimeCounter: () => mockCounter,
    })
  })

  describe('CLI 活动追踪', () => {
    it('开始和结束 CLI 活动', () => {
      manager.startCLIActivity('op1')
      expect(manager.getActivityStates().isCLIActive).toBe(true)
      expect(manager.getActivityStates().activeOperationCount).toBe(1)

      manager.endCLIActivity('op1')
      expect(manager.getActivityStates().isCLIActive).toBe(false)
      expect(manager.getActivityStates().activeOperationCount).toBe(0)
    })

    it('多个并发操作', () => {
      manager.startCLIActivity('op1')
      manager.startCLIActivity('op2')
      expect(manager.getActivityStates().activeOperationCount).toBe(2)

      manager.endCLIActivity('op1')
      expect(manager.getActivityStates().isCLIActive).toBe(true)
      expect(manager.getActivityStates().activeOperationCount).toBe(1)

      manager.endCLIActivity('op2')
      expect(manager.getActivityStates().isCLIActive).toBe(false)
    })

    it('记录 CLI 活动时间', () => {
      manager.startCLIActivity('op1')
      mockNow += 5000 // 5 秒后
      manager.endCLIActivity('op1')
      expect(mockCounter.add).toHaveBeenCalledWith(5, { type: 'cli' })
    })

    it('强制清理重复操作', () => {
      manager.startCLIActivity('op1')
      manager.startCLIActivity('op1') // 重复
      expect(manager.getActivityStates().activeOperationCount).toBe(1)
    })
  })

  describe('用户活动追踪', () => {
    it('记录用户活动时间', () => {
      // 初始化用户活动时间
      manager.recordUserActivity()
      mockNow += 3000 // 3 秒后
      manager.recordUserActivity()
      expect(mockCounter.add).toHaveBeenCalledWith(3, { type: 'user' })
    })

    it('不记录超出超时的用户活动', () => {
      manager.recordUserActivity()
      mockNow += 10000 // 10 秒后 (超过 5 秒超时)
      manager.recordUserActivity()
      expect(mockCounter.add).not.toHaveBeenCalled()
    })

    it('CLI 活动期间不记录用户活动', () => {
      manager.recordUserActivity() // 初始化
      manager.startCLIActivity('op1')
      mockNow += 3000
      manager.recordUserActivity()
      expect(mockCounter.add).not.toHaveBeenCalledWith(expect.anything(), {
        type: 'user',
      })
    })
  })

  describe('trackOperation', () => {
    it('自动追踪异步操作', async () => {
      const result = await manager.trackOperation('op1', async () => {
        mockNow += 2000
        return 'done'
      })
      expect(result).toBe('done')
      expect(mockCounter.add).toHaveBeenCalledWith(2, { type: 'cli' })
    })

    it('操作失败时也结束追踪', async () => {
      await expect(
        manager.trackOperation('op1', async () => {
          throw new Error('fail')
        }),
      ).rejects.toThrow('fail')
      expect(manager.getActivityStates().isCLIActive).toBe(false)
    })
  })

  describe('单例管理', () => {
    it('resetInstance 重置单例', () => {
      const inst1 = ActivityManager.getInstance()
      ActivityManager.resetInstance()
      const inst2 = ActivityManager.getInstance()
      expect(inst1).not.toBe(inst2)
    })
  })
})
