export function mapSubscription(raw) {
  const sub = raw?.subscription || raw?.Subscription || {}
  return {
    plan: sub.plan || sub.Plan || 'None',
    status: sub.status || sub.Status || 'NeverSubscribed',
    daysLeft: sub.daysLeft ?? sub.DaysLeft ?? 0,
    expiresAt: sub.expiresAt || sub.ExpiresAt || null,
    startedAt: sub.startedAt || sub.StartedAt || null,
    hasUsedTrial: sub.hasUsedTrial ?? sub.HasUsedTrial ?? false,
    hasAccess: !!(sub.hasAccess ?? sub.HasAccess),
  }
}

export function statusLabel(status) {
  if (status === 'ExpiringSoon') return 'Expiring soon'
  if (status === 'NeverSubscribed') return 'No plan yet'
  if (status === 'Expired') return 'Expired'
  if (status === 'Active') return 'Active'
  if (status === 'Suspended') return 'Suspended'
  return status || '—'
}

/** Super Admin table status: Suspended wins over plan status. */
export function shopStatus(shop) {
  if (shop && shop.isActive === false) return 'Suspended'
  return shop?.planStatus || 'Expired'
}

export function canAssignPlan(shop) {
  if (!shop) return false
  if (shop.isActive === false) return true
  const status = shop.planStatus
  return status === 'Expired' || status === 'NeverSubscribed'
}
