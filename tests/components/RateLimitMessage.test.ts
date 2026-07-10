import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * getUpsellMessage 纯函数的本地副本
 * 从 src/components/messages/RateLimitMessage.tsx 提取
 * 避免复杂的模块依赖链
 */
type UpsellParams = {
  shouldShowUpsell: boolean;
  isMax20x: boolean;
  isExtraUsageCommandEnabled: boolean;
  shouldAutoOpenRateLimitOptionsMenu: boolean;
  isTeamOrEnterprise: boolean;
  hasBillingAccess: boolean;
};

function getUpsellMessage({
  shouldShowUpsell,
  isMax20x,
  isExtraUsageCommandEnabled,
  shouldAutoOpenRateLimitOptionsMenu,
  isTeamOrEnterprise,
  hasBillingAccess,
}: UpsellParams): string | null {
  if (!shouldShowUpsell) return null;
  if (isMax20x) {
    if (isExtraUsageCommandEnabled) {
      return '/extra-usage to finish what you\u2019re working on.';
    }
    return '/login to switch to an API usage-billed account.';
  }
  if (shouldAutoOpenRateLimitOptionsMenu) {
    return 'Opening your options\u2026';
  }
  if (!isTeamOrEnterprise && !isExtraUsageCommandEnabled) {
    return '/upgrade to increase your usage limit.';
  }
  if (isTeamOrEnterprise) {
    if (!isExtraUsageCommandEnabled) return null;
    if (hasBillingAccess) {
      return '/extra-usage to finish what you\u2019re working on.';
    }
    return '/extra-usage to request more usage from your admin.';
  }
  return '/upgrade or /extra-usage to finish what you\u2019re working on.';
}

describe('RateLimitMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getUpsellMessage', () => {
    describe('shouldShowUpsell 为 false 时', () => {
      it('应该返回 null', () => {
        const result = getUpsellMessage({
          shouldShowUpsell: false,
          isMax20x: false,
          isExtraUsageCommandEnabled: false,
          shouldAutoOpenRateLimitOptionsMenu: false,
          isTeamOrEnterprise: false,
          hasBillingAccess: false,
        })
        expect(result).toBeNull()
      })

      it('即使其他条件为 true 也应该返回 null', () => {
        const result = getUpsellMessage({
          shouldShowUpsell: false,
          isMax20x: true,
          isExtraUsageCommandEnabled: true,
          shouldAutoOpenRateLimitOptionsMenu: true,
          isTeamOrEnterprise: true,
          hasBillingAccess: true,
        })
        expect(result).toBeNull()
      })
    })

    describe('isMax20x 为 true 时', () => {
      it('当 isExtraUsageCommandEnabled 为 true 时应该返回 extra-usage 提示', () => {
        const result = getUpsellMessage({
          shouldShowUpsell: true,
          isMax20x: true,
          isExtraUsageCommandEnabled: true,
          shouldAutoOpenRateLimitOptionsMenu: false,
          isTeamOrEnterprise: false,
          hasBillingAccess: false,
        })
        expect(result).toBe('/extra-usage to finish what you\u2019re working on.')
      })

      it('当 isExtraUsageCommandEnabled 为 false 时应该返回 login 提示', () => {
        const result = getUpsellMessage({
          shouldShowUpsell: true,
          isMax20x: true,
          isExtraUsageCommandEnabled: false,
          shouldAutoOpenRateLimitOptionsMenu: false,
          isTeamOrEnterprise: false,
          hasBillingAccess: false,
        })
        expect(result).toBe('/login to switch to an API usage-billed account.')
      })

      it('isMax20x 优先级高于 shouldAutoOpenRateLimitOptionsMenu', () => {
        const result = getUpsellMessage({
          shouldShowUpsell: true,
          isMax20x: true,
          isExtraUsageCommandEnabled: false,
          shouldAutoOpenRateLimitOptionsMenu: true,
          isTeamOrEnterprise: false,
          hasBillingAccess: false,
        })
        expect(result).toBe('/login to switch to an API usage-billed account.')
      })
    })

    describe('shouldAutoOpenRateLimitOptionsMenu 为 true 时', () => {
      it('应该返回 Opening your options 提示', () => {
        const result = getUpsellMessage({
          shouldShowUpsell: true,
          isMax20x: false,
          isExtraUsageCommandEnabled: false,
          shouldAutoOpenRateLimitOptionsMenu: true,
          isTeamOrEnterprise: false,
          hasBillingAccess: false,
        })
        expect(result).toBe('Opening your options\u2026')
      })
    })

    describe('非团队/企业用户且无 extra-usage 命令时', () => {
      it('应该返回 upgrade 提示', () => {
        const result = getUpsellMessage({
          shouldShowUpsell: true,
          isMax20x: false,
          isExtraUsageCommandEnabled: false,
          shouldAutoOpenRateLimitOptionsMenu: false,
          isTeamOrEnterprise: false,
          hasBillingAccess: false,
        })
        expect(result).toBe('/upgrade to increase your usage limit.')
      })
    })

    describe('团队/企业用户时', () => {
      it('当无 extra-usage 命令时应该返回 null', () => {
        const result = getUpsellMessage({
          shouldShowUpsell: true,
          isMax20x: false,
          isExtraUsageCommandEnabled: false,
          shouldAutoOpenRateLimitOptionsMenu: false,
          isTeamOrEnterprise: true,
          hasBillingAccess: false,
        })
        expect(result).toBeNull()
      })

      it('当有 extra-usage 命令且有 billing 权限时应该返回 extra-usage 提示', () => {
        const result = getUpsellMessage({
          shouldShowUpsell: true,
          isMax20x: false,
          isExtraUsageCommandEnabled: true,
          shouldAutoOpenRateLimitOptionsMenu: false,
          isTeamOrEnterprise: true,
          hasBillingAccess: true,
        })
        expect(result).toBe('/extra-usage to finish what you\u2019re working on.')
      })

      it('当有 extra-usage 命令但无 billing 权限时应该返回请求管理员提示', () => {
        const result = getUpsellMessage({
          shouldShowUpsell: true,
          isMax20x: false,
          isExtraUsageCommandEnabled: true,
          shouldAutoOpenRateLimitOptionsMenu: false,
          isTeamOrEnterprise: true,
          hasBillingAccess: false,
        })
        expect(result).toBe('/extra-usage to request more usage from your admin.')
      })
    })

    describe('默认情况', () => {
      it('当有 extra-usage 命令但非团队用户时应该返回 upgrade 或 extra-usage 提示', () => {
        const result = getUpsellMessage({
          shouldShowUpsell: true,
          isMax20x: false,
          isExtraUsageCommandEnabled: true,
          shouldAutoOpenRateLimitOptionsMenu: false,
          isTeamOrEnterprise: false,
          hasBillingAccess: false,
        })
        expect(result).toBe('/upgrade or /extra-usage to finish what you\u2019re working on.')
      })
    })
  })
})
