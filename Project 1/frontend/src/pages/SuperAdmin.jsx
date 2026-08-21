import { useEffect, useState } from 'react'
import { superAdminService } from '../services/superAdminService'
import { statusLabel, shopStatus, canAssignPlan } from '../utils/subscription'
import './SuperAdmin.css'

const PLAN_OPTIONS = ['Trial', 'Monthly', 'Yearly']

const formatDate = (value) => {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

const SuperAdmin = () => {
  const [overview, setOverview] = useState(null)
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')
  const [planDraft, setPlanDraft] = useState({})

  const load = async () => {
    setError('')
    setLoading(true)
    try {
      const [overviewData, shopsData] = await Promise.all([
        superAdminService.getOverview(),
        superAdminService.getShops(),
      ])
      setOverview(overviewData)
      setShops(Array.isArray(shopsData) ? shopsData : [])
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load platform data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const toggleShop = async (shop) => {
    setBusyId(shop.id)
    setError('')
    try {
      if (shop.isActive) {
        await superAdminService.suspendShop(shop.id)
      } else {
        await superAdminService.activateShop(shop.id)
      }
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update shop status.')
    } finally {
      setBusyId('')
    }
  }

  const assignPlan = async (shop) => {
    const plan = planDraft[shop.id] || 'Monthly'
    setBusyId(shop.id)
    setError('')
    try {
      await superAdminService.assignPlan(shop.id, plan)
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not assign plan.')
    } finally {
      setBusyId('')
    }
  }

  return (
    <div className="super-admin page">
      <header className="super-admin-hero">
        <div>
          <p className="super-admin-kicker">Platform</p>
          <h1>Super Admin</h1>
          <p className="page-subtitle">
            Track shop subscriptions: who is on a plan, how many days are left, and who needs renew.
          </p>
        </div>
      </header>

      {error ? <div className="error-message">{error}</div> : null}

      <section className="super-admin-stats">
        <article className="card super-admin-stat">
          <span>Shops</span>
          <strong>{overview?.shopCount ?? '—'}</strong>
        </article>
        <article className="card super-admin-stat">
          <span>Active plans</span>
          <strong>{overview?.activePlans ?? '—'}</strong>
        </article>
        <article className="card super-admin-stat">
          <span>Expiring soon</span>
          <strong>{overview?.expiringSoon ?? '—'}</strong>
        </article>
        <article className="card super-admin-stat">
          <span>Expired</span>
          <strong>{overview?.expired ?? '—'}</strong>
        </article>
        <article className="card super-admin-stat">
          <span>Suspended</span>
          <strong>{overview?.suspendedShopCount ?? '—'}</strong>
        </article>
      </section>

      <section className="card super-admin-table-wrap">
        <div className="super-admin-table-head">
          <h2>Shop subscriptions</h2>
          <p>Apply a plan only when a shop is suspended or the subscription has expired.</p>
        </div>

        {loading ? (
          <p className="super-admin-muted">Loading shops…</p>
        ) : shops.length === 0 ? (
          <p className="super-admin-muted">No shops yet. They appear here after register.</p>
        ) : (
          <div className="super-admin-table-scroll">
            <table className="super-admin-table">
              <thead>
                <tr>
                  <th>Shop</th>
                  <th>Plan</th>
                  <th>Days left</th>
                  <th>Ends on</th>
                  <th>Status</th>
                  <th>Assign</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {shops.map((shop) => {
                  const status = shopStatus(shop)
                  const showAssign = canAssignPlan(shop)
                  return (
                    <tr key={shop.id}>
                      <td>
                        <strong>{shop.shopName || shop.userName}</strong>
                        <span className="super-admin-email">{shop.userName}</span>
                      </td>
                      <td>{shop.plan === 'None' ? '—' : shop.plan}</td>
                      <td>{shop.isActive ? shop.daysLeft || 0 : '—'}</td>
                      <td>{shop.isActive ? formatDate(shop.planExpiresAt) : '—'}</td>
                      <td>
                        <span className={`super-admin-badge is-${status.toLowerCase()}`}>
                          {statusLabel(status)}
                        </span>
                      </td>
                      <td>
                        {showAssign ? (
                          <div className="super-admin-assign">
                            <select
                              value={planDraft[shop.id] || 'Monthly'}
                              onChange={(e) =>
                                setPlanDraft((current) => ({ ...current, [shop.id]: e.target.value }))
                              }
                            >
                              {PLAN_OPTIONS.map((plan) => (
                                <option key={plan} value={plan}>
                                  {plan}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="btn btn-primary"
                              disabled={busyId === shop.id}
                              onClick={() => assignPlan(shop)}
                            >
                              {busyId === shop.id ? 'Saving…' : 'Apply'}
                            </button>
                          </div>
                        ) : (
                          <span className="super-admin-muted">—</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={shop.isActive ? 'btn btn-secondary' : 'btn btn-primary'}
                          disabled={busyId === shop.id}
                          onClick={() => toggleShop(shop)}
                        >
                          {shop.isActive ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default SuperAdmin
