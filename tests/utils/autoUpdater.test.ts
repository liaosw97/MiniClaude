import { describe, it, expect } from 'vitest'
import {
  getLatestVersion,
  getLatestVersionFromGcs,
  getMaxVersion,
  getMaxVersionMessage,
  shouldSkipVersion,
  installGlobalPackage,
  getNpmDistTags,
  getGcsDistTags,
  assertMinVersion,
  checkGlobalInstallPermissions,
} from '../../src/utils/autoUpdater'

describe('autoUpdater (stub)', () => {
  it('getLatestVersion → null', async () => {
    expect(await getLatestVersion()).toBeNull()
  })

  it('getLatestVersionFromGcs → null', async () => {
    expect(await getLatestVersionFromGcs()).toBeNull()
  })

  it('getMaxVersion → 返回 current', () => {
    expect(getMaxVersion('1.0.0', '2.0.0')).toBe('1.0.0')
    expect(getMaxVersion('1.0.0', null)).toBe('1.0.0')
  })

  it('getMaxVersionMessage → null', () => {
    expect(getMaxVersionMessage('1.0.0', '2.0.0')).toBeNull()
    expect(getMaxVersionMessage('1.0.0', null)).toBeNull()
  })

  it('shouldSkipVersion → false', () => {
    expect(shouldSkipVersion('1.0.0')).toBe(false)
  })

  it('installGlobalPackage → error', async () => {
    expect(await installGlobalPackage('test')).toBe('error')
  })

  it('getNpmDistTags → 空对象', async () => {
    expect(await getNpmDistTags()).toEqual({ latest: '', stable: '' })
  })

  it('getGcsDistTags → 空对象', async () => {
    expect(await getGcsDistTags()).toEqual({ latest: '', stable: '' })
  })

  it('assertMinVersion → 无操作', () => {
    expect(() => assertMinVersion('1.0.0')).not.toThrow()
  })

  it('checkGlobalInstallPermissions → 无权限', () => {
    expect(checkGlobalInstallPermissions()).toEqual({
      hasPermissions: false,
      reason: 'Auto-update has been removed',
    })
  })
})
