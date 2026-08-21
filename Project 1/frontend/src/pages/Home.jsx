import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { productService } from '../services/productService'
import { cartService } from '../services/cartService'
import { transactionService } from '../services/transactionService'
import { getDateFieldError, isValidYmd } from '../utils/dateValidation'
import './Home.css'

const SHORTCUTS = [
  { to: '/products', label: 'Products' },
  { to: '/products/create', label: 'Add item' },
  { to: '/cart', label: 'Cart' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/loans', label: 'Loans' },
]

const formatDate = (d) => {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

const getTransactionDate = (t) => t.createdOn || t.date || t.createdAt

const paymentBadgeClass = (method) => {
  const m = String(method || '').toLowerCase()
  if (m.includes('razorpay') || m.includes('online')) return 'badge badge-success'
  if (m.includes('card')) return 'badge badge-info'
  if (m.includes('cash')) return 'badge badge-warning'
  return 'badge'
}

const startOfDay = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

const startOfWeek = (date) => {
  const d = startOfDay(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1)

/** Matches backend ExpiryFreshness.NearExpiryDays */
const NEAR_EXPIRY_DAYS = 30

const resolveExpiryStatus = (stock) => {
  const fromApi = String(stock?.expiryStatus || '').trim()
  if (fromApi === 'Expired' || fromApi === 'Old' || fromApi === 'New') return fromApi

  const raw = stock?.expiryDate
  if (!raw) return null
  const today = startOfDay(new Date())
  const exp = startOfDay(new Date(raw))
  if (Number.isNaN(exp.getTime())) return null
  if (exp < today) return 'Expired'
  const limit = new Date(today)
  limit.setDate(limit.getDate() + NEAR_EXPIRY_DAYS)
  if (exp <= limit) return 'Old'
  return 'New'
}

const expirySortTime = (stock) => {
  const t = new Date(stock?.expiryDate || 0).getTime()
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t
}

const formatExpiryShort = (d) => {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

const toYmd = (date) => {
  const d = date instanceof Date ? date : new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const shiftYmd = (ymd, deltaDays) => {
  const d = new Date(`${ymd}T12:00:00`)
  d.setDate(d.getDate() + deltaDays)
  return toYmd(d)
}

const formatDayCloseLabel = (ymd) => {
  if (!isValidYmd(ymd)) return 'Invalid date'
  try {
    return new Date(`${ymd}T12:00:00`).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return 'Invalid date'
  }
}

const buildPurchaseTimeline = (buys) => {
  const today = startOfDay(new Date())
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today)
    day.setDate(today.getDate() - (6 - index))
    const nextDay = new Date(day)
    nextDay.setDate(day.getDate() + 1)
    const count = buys.filter((t) => {
      const date = new Date(getTransactionDate(t) || 0)
      return date >= day && date < nextDay
    }).length

    return {
      label: day.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      count,
    }
  })
}

const buildSalesComparison = (buys, mode) => {
  const now = new Date()
  const periods = Array.from({ length: 6 }, (_, index) => {
    if (mode === 'months') {
      const start = startOfMonth(new Date(now.getFullYear(), now.getMonth() - (5 - index), 1))
      const end = startOfMonth(new Date(start.getFullYear(), start.getMonth() + 1, 1))
      return {
        start,
        end,
        label: start.toLocaleDateString('en-IN', { month: 'short' }),
      }
    }

    const start = startOfWeek(new Date(now))
    start.setDate(start.getDate() - (5 - index) * 7)
    const end = new Date(start)
    end.setDate(start.getDate() + 7)
    return {
      start,
      end,
      label: start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    }
  })

  return periods.map((period) => {
    const total = buys.reduce((sum, t) => {
      const date = new Date(getTransactionDate(t) || 0)
      if (date >= period.start && date < period.end) {
        return sum + (Number(t.total) || 0)
      }
      return sum
    }, 0)

    return { label: period.label, total }
  })
}

const getTimelinePoints = (items) => {
  const max = Math.max(...items.map((item) => item.count), 1)
  const width = 320
  const height = 120
  const padX = 18
  const padY = 16
  return items
    .map((item, index) => {
      const x = padX + (index * (width - padX * 2)) / Math.max(items.length - 1, 1)
      const y = height - padY - (item.count / max) * (height - padY * 2)
      return `${x},${y}`
    })
    .join(' ')
}

const getSalesBetween = (buys, start, end) =>
  buys.reduce((sum, t) => {
    const date = new Date(getTransactionDate(t) || 0)
    return date >= start && date < end ? sum + (Number(t.total) || 0) : sum
  }, 0)

const buildPaymentBreakdown = (buys) => {
  const totals = buys.reduce(
    (acc, t) => {
      const method = String(t.paymentMethod || '').toLowerCase()
      const amount = Number(t.total) || 0
      if (method.includes('cash')) acc.cash += amount
      else if (method.includes('card') || method.includes('debit') || method.includes('credit')) acc.card += amount
      else if (method.includes('razorpay') || method.includes('online') || method.includes('upi')) acc.online += amount
      else acc.other += amount
      return acc
    },
    { cash: 0, card: 0, online: 0, other: 0 }
  )

  const rows = [
    { label: 'Cash', value: totals.cash },
    { label: 'Card', value: totals.card },
    { label: 'Online', value: totals.online },
  ]
  if (totals.other > 0) rows.push({ label: 'Other', value: totals.other })
  return rows
}

const buildTopCustomers = (buys) => {
  const map = new Map()
  buys.forEach((t) => {
    const name = (t.customerName || 'Unknown').trim() || 'Unknown'
    const existing = map.get(name) || { name, total: 0, count: 0 }
    existing.total += Number(t.total) || 0
    existing.count += 1
    map.set(name, existing)
  })

  return Array.from(map.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
}

const DashboardHome = ({ userName }) => {
  const { formatMoney } = useCurrency()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cartCount, setCartCount] = useState(0)
  const [buyCount, setBuyCount] = useState(0)
  const [loanCount, setLoanCount] = useState(0)
  const [allBuys, setAllBuys] = useState([])
  const [recentBuys, setRecentBuys] = useState([])
  const [lowStockItems, setLowStockItems] = useState([])
  const [outOfStockItems, setOutOfStockItems] = useState([])
  const [expiringSoonItems, setExpiringSoonItems] = useState([])
  const [expiredItems, setExpiredItems] = useState([])
  const [stockModal, setStockModal] = useState(null) // 'low' | 'out' | 'expiring' | 'expired' | null
  const [comparisonMode, setComparisonMode] = useState('weeks')
  const [dayCloseDate, setDayCloseDate] = useState(() => toYmd(new Date()))
  const [dayClosePreset, setDayClosePreset] = useState('today') // today | yesterday | custom
  const [dayClose, setDayClose] = useState(null)
  const [dayCloseLoading, setDayCloseLoading] = useState(false)
  const [dayCloseDateError, setDayCloseDateError] = useState('')
  const todayYmd = toYmd(new Date())
  const yesterdayYmd = shiftYmd(todayYmd, -1)

  const applyDayClosePreset = (preset) => {
    setDayClosePreset(preset)
    setDayCloseDateError('')
    if (preset === 'today') setDayCloseDate(todayYmd)
    if (preset === 'yesterday') setDayCloseDate(yesterdayYmd)
  }

  const onDayCloseDateChange = (value) => {
    setDayCloseDate(value)
    const err = getDateFieldError(value, { required: true, maxYmd: todayYmd })
    setDayCloseDateError(err || '')
    if (err) {
      setDayClosePreset('custom')
      return
    }
    if (value === todayYmd) setDayClosePreset('today')
    else if (value === yesterdayYmd) setDayClosePreset('yesterday')
    else setDayClosePreset('custom')
  }

  const stepDayClose = (delta) => {
    if (getDateFieldError(dayCloseDate, { required: true, maxYmd: todayYmd })) return
    const next = shiftYmd(dayCloseDate, delta)
    if (next > todayYmd) return
    onDayCloseDateChange(next)
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  useEffect(() => {
    const err = getDateFieldError(dayCloseDate, { required: true, maxYmd: todayYmd })
    if (err) {
      setDayCloseDateError(err)
      setDayClose(null)
      setDayCloseLoading(false)
      return
    }
    setDayCloseDateError('')
    loadDayClose(dayCloseDate)
  }, [dayCloseDate])

  const loadDayClose = async (date) => {
    if (getDateFieldError(date, { required: true, maxYmd: todayYmd })) {
      setDayClose(null)
      return
    }
    setDayCloseLoading(true)
    try {
      const data = await transactionService.getDayClose(date)
      setDayClose(data)
    } catch (err) {
      setDayClose(null)
      const msg = err.response?.data?.message || ''
      if (/invalid date/i.test(msg)) setDayCloseDateError('Invalid date')
    } finally {
      setDayCloseLoading(false)
    }
  }

  const loadDashboard = async () => {
    setLoading(true)
    setError('')

    try {
      const [stocks, cart, transactions, loans] = await Promise.all([
        productService.getAll().catch(() => []),
        cartService.getUserCart().catch(() => []),
        transactionService.getAll().catch(() => []),
        transactionService.getLoanSummary().catch(() => []),
      ])
      loadDayClose(dayCloseDate)

      const stockList = Array.isArray(stocks) ? stocks : []
      const cartList = Array.isArray(cart) ? cart : []
      const buys = (Array.isArray(transactions) ? transactions : []).filter(
        (t) => String(t.type || '').toLowerCase() === 'buy'
      )
      const loanList = Array.isArray(loans) ? loans : []

      setCartCount(cartList.length)
      setBuyCount(buys.length)
      setLoanCount(loanList.length)

      const out = stockList
        .filter((stock) => Number(stock.quantity) === 0)
        .sort((a, b) =>
          String(a.companyName || a.symbol || '').localeCompare(String(b.companyName || b.symbol || ''))
        )
      const low = stockList
        .filter((stock) => {
          const q = Number(stock.quantity)
          return q > 0 && q <= 5
        })
        .sort((a, b) => (Number(a.quantity) || 0) - (Number(b.quantity) || 0))

      const expiring = stockList
        .filter((stock) => resolveExpiryStatus(stock) === 'Old')
        .sort((a, b) => expirySortTime(a) - expirySortTime(b))
      const expired = stockList
        .filter((stock) => resolveExpiryStatus(stock) === 'Expired')
        .sort((a, b) => expirySortTime(a) - expirySortTime(b))

      setOutOfStockItems(out)
      setLowStockItems(low)
      setExpiringSoonItems(expiring)
      setExpiredItems(expired)

      const sorted = [...buys].sort(
        (a, b) =>
          new Date(getTransactionDate(b) || 0).getTime() -
          new Date(getTransactionDate(a) || 0).getTime()
      )
      setAllBuys(sorted)
      setRecentBuys(sorted.slice(0, 5))
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const purchaseTimeline = useMemo(() => buildPurchaseTimeline(allBuys), [allBuys])
  const salesComparison = useMemo(
    () => buildSalesComparison(allBuys, comparisonMode),
    [allBuys, comparisonMode]
  )
  const timelinePoints = useMemo(() => getTimelinePoints(purchaseTimeline), [purchaseTimeline])
  const maxSales = Math.max(...salesComparison.map((item) => item.total), 1)
  const totalSales = allBuys.reduce((sum, t) => sum + (Number(t.total) || 0), 0)
  const now = new Date()
  const todaySales = getSalesBetween(allBuys, startOfDay(now), new Date(startOfDay(now).getTime() + 24 * 60 * 60 * 1000))
  const weekSales = getSalesBetween(allBuys, startOfWeek(now), new Date(startOfWeek(now).getTime() + 7 * 24 * 60 * 60 * 1000))
  const monthSales = getSalesBetween(allBuys, startOfMonth(now), new Date(now.getFullYear(), now.getMonth() + 1, 1))
  const paymentBreakdown = useMemo(() => buildPaymentBreakdown(allBuys), [allBuys])
  const topCustomers = useMemo(() => buildTopCustomers(allBuys), [allBuys])
  const maxPayment = Math.max(...paymentBreakdown.map((item) => item.value), 1)

  const stockModalMeta = {
    low: {
      title: 'Low stock',
      subtitle: `${lowStockItems.length} item(s) with 1–5 units`,
      items: lowStockItems,
      badge: (stock) => `${Number(stock.quantity)} left`,
      danger: false,
    },
    out: {
      title: 'Out of stock',
      subtitle: `${outOfStockItems.length} item(s) with 0 units`,
      items: outOfStockItems,
      badge: () => 'Out',
      danger: true,
    },
    expiring: {
      title: 'Expiring soon',
      subtitle: `${expiringSoonItems.length} item(s) within ${NEAR_EXPIRY_DAYS} days`,
      items: expiringSoonItems,
      badge: (stock) => formatExpiryShort(stock.expiryDate),
      danger: false,
      warning: true,
    },
    expired: {
      title: 'Expired',
      subtitle: `${expiredItems.length} item(s) past expiry`,
      items: expiredItems,
      badge: (stock) => formatExpiryShort(stock.expiryDate),
      danger: true,
    },
  }
  const activeStockModal = stockModal ? stockModalMeta[stockModal] : null

  return (
    <div className="dashboard page">
      <header className="page-header dashboard-header">
        <div>
          <h1>Overview</h1>
          <p className="page-subtitle">
            {userName ? `Welcome, ${userName}.` : 'Inventory Management dashboard.'}
          </p>
        </div>
        <div className="dashboard-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadDashboard}
            disabled={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <Link to="/cart" className="btn btn-primary">
            New Sale
          </Link>
        </div>
      </header>

      {error && <div className="error dashboard-error">{error}</div>}

      <div className="dashboard-stats">
        <Link to="/transactions" className="dashboard-stat card dashboard-stat--accent">
          <span className="dashboard-stat-label">Today&apos;s Sales</span>
          <span className="dashboard-stat-value dashboard-stat-value--money">
            {loading ? '…' : formatMoney(todaySales)}
          </span>
          <span className="dashboard-stat-meta">Current business day</span>
        </Link>
        <Link to="/transactions" className="dashboard-stat card">
          <span className="dashboard-stat-label">This Week</span>
          <span className="dashboard-stat-value dashboard-stat-value--money">
            {loading ? '…' : formatMoney(weekSales)}
          </span>
          <span className="dashboard-stat-meta">Week-to-date sales</span>
        </Link>
        <Link to="/transactions" className="dashboard-stat card">
          <span className="dashboard-stat-label">This Month</span>
          <span className="dashboard-stat-value dashboard-stat-value--money">
            {loading ? '…' : formatMoney(monthSales)}
          </span>
          <span className="dashboard-stat-meta">{buyCount} total purchases</span>
        </Link>
        <button
          type="button"
          className="dashboard-stat card"
          onClick={() => setStockModal('low')}
        >
          <span className="dashboard-stat-label">Low Stock</span>
          <span className="dashboard-stat-value">{loading ? '…' : lowStockItems.length}</span>
          <span className="dashboard-stat-meta">1–5 units left · click to view</span>
        </button>
        <button
          type="button"
          className="dashboard-stat card"
          onClick={() => setStockModal('out')}
        >
          <span className="dashboard-stat-label">Out of Stock</span>
          <span className="dashboard-stat-value">{loading ? '…' : outOfStockItems.length}</span>
          <span className="dashboard-stat-meta">0 units · click to view</span>
        </button>
        <button
          type="button"
          className="dashboard-stat card dashboard-stat--expiring"
          onClick={() => setStockModal('expiring')}
        >
          <span className="dashboard-stat-label">Expiring soon</span>
          <span className="dashboard-stat-value">{loading ? '…' : expiringSoonItems.length}</span>
          <span className="dashboard-stat-meta">Within {NEAR_EXPIRY_DAYS} days · click to view</span>
        </button>
        <button
          type="button"
          className="dashboard-stat card dashboard-stat--expired"
          onClick={() => setStockModal('expired')}
        >
          <span className="dashboard-stat-label">Expired</span>
          <span className="dashboard-stat-value">{loading ? '…' : expiredItems.length}</span>
          <span className="dashboard-stat-meta">Past expiry · click to view</span>
        </button>
      </div>

      <div className="dashboard-secondary-stats">
        <Link to="/cart" className="dashboard-mini-stat card">
          <span>Cart Items</span>
          <strong>{loading ? '…' : cartCount}</strong>
        </Link>
        <Link to="/loans" className="dashboard-mini-stat card">
          <span>Loan Accounts</span>
          <strong>{loading ? '…' : loanCount}</strong>
        </Link>
        <Link to="/transactions" className="dashboard-mini-stat card">
          <span className="dashboard-stat-label">Total Sales</span>
          <strong>{loading ? '…' : formatMoney(totalSales)}</strong>
        </Link>
      </div>

      <nav className="dashboard-shortcuts" aria-label="Shortcuts">
        {SHORTCUTS.map((s) => (
          <Link key={s.to} to={s.to} className="btn btn-secondary btn-sm">
            {s.label}
          </Link>
        ))}
      </nav>

      <section className="dashboard-panel card day-close">
        <div className="dashboard-panel-head">
          <div>
            <h2 className="dashboard-panel-title">Day close</h2>
            <p className="dashboard-panel-subtitle">
              Shift summary for {formatDayCloseLabel(dayCloseDate)}
            </p>
          </div>
          <div className="dashboard-panel-tools day-close-tools">
            <div className="day-close-controls" role="group" aria-label="Business day">
              <div className="day-close-presets">
                <button
                  type="button"
                  className={`day-close-preset${dayClosePreset === 'today' ? ' is-active' : ''}`}
                  onClick={() => applyDayClosePreset('today')}
                >
                  Today
                </button>
                <button
                  type="button"
                  className={`day-close-preset${dayClosePreset === 'yesterday' ? ' is-active' : ''}`}
                  onClick={() => applyDayClosePreset('yesterday')}
                >
                  Yesterday
                </button>
              </div>

              <div className="day-close-nav">
                <button
                  type="button"
                  className="day-close-nav-btn"
                  onClick={() => stepDayClose(-1)}
                  disabled={!!dayCloseDateError}
                  aria-label="Previous day"
                  title="Previous day"
                >
                  ‹
                </button>
                <div className={`day-close-date-field${dayCloseDateError ? ' is-invalid' : ''}`}>
                  <span className="day-close-date-caption">Date</span>
                  <input
                    type="date"
                    className="day-close-date-input"
                    value={dayCloseDate}
                    onChange={(e) => onDayCloseDateChange(e.target.value)}
                    onBlur={(e) => {
                      const err = getDateFieldError(e.target.value, {
                        required: true,
                        maxYmd: todayYmd,
                      })
                      setDayCloseDateError(err || '')
                    }}
                    onClick={(e) => {
                      try {
                        e.currentTarget.showPicker?.()
                      } catch {
                        /* native picker unavailable */
                      }
                    }}
                    max={todayYmd}
                    min="2000-01-01"
                    aria-invalid={!!dayCloseDateError}
                    aria-label="Choose any business day"
                  />
                </div>
                <button
                  type="button"
                  className="day-close-nav-btn"
                  onClick={() => stepDayClose(1)}
                  disabled={!!dayCloseDateError || dayCloseDate >= todayYmd}
                  aria-label="Next day"
                  title="Next day"
                >
                  ›
                </button>
              </div>
            </div>

          </div>
        </div>

        {dayCloseDateError ? (
          <p className="day-close-error" role="alert">
            {dayCloseDateError}
          </p>
        ) : dayCloseLoading && !dayClose ? (
          <p className="dashboard-muted">Loading day close…</p>
        ) : !dayClose ? (
          <p className="dashboard-muted">Could not load day close.</p>
        ) : (
          <>
            <div className="day-close-grid">
              <div className="day-close-cell">
                <span className="day-close-label">Cash sales</span>
                <strong className="day-close-value">{formatMoney(dayClose.cashSales)}</strong>
                <span className="day-close-meta">Drawer</span>
              </div>
              <div className="day-close-cell">
                <span className="day-close-label">Card sales</span>
                <strong className="day-close-value">{formatMoney(dayClose.cardSales)}</strong>
                <span className="day-close-meta">POS / card</span>
              </div>
              <div className="day-close-cell">
                <span className="day-close-label">Online / UPI</span>
                <strong className="day-close-value">{formatMoney(dayClose.onlineSales)}</strong>
                <span className="day-close-meta">Razorpay &amp; UPI</span>
              </div>
              <div className="day-close-cell day-close-cell--accent">
                <span className="day-close-label">Total sales</span>
                <strong className="day-close-value">{formatMoney(dayClose.totalSales)}</strong>
                <span className="day-close-meta">{dayClose.buyCount} buy bill(s)</span>
              </div>
              <div className="day-close-cell">
                <span className="day-close-label">Loans given</span>
                <strong className="day-close-value">{formatMoney(dayClose.loansGiven)}</strong>
                <span className="day-close-meta">{dayClose.loanCount} loan(s)</span>
              </div>
              <div className="day-close-cell">
                <span className="day-close-label">Loan payments</span>
                <strong className="day-close-value">{formatMoney(dayClose.loanPayments)}</strong>
                <span className="day-close-meta">{dayClose.loanPaymentCount} payment(s)</span>
              </div>
              <div className="day-close-cell day-close-cell--cash">
                <span className="day-close-label">Expected cash in drawer</span>
                <strong className="day-close-value">
                  {formatMoney(dayClose.expectedCashInDrawer)}
                </strong>
                <span className="day-close-meta">Cash sales + loan payments</span>
              </div>
              {Number(dayClose.otherSales) > 0 && (
                <div className="day-close-cell">
                  <span className="day-close-label">Other / unknown</span>
                  <strong className="day-close-value">{formatMoney(dayClose.otherSales)}</strong>
                  <span className="day-close-meta">No payment method</span>
                </div>
              )}
            </div>
          </>
        )}
      </section>

      <div className="dashboard-analytics">
        <section className="dashboard-panel card">
          <div className="dashboard-panel-head">
            <div>
              <h2 className="dashboard-panel-title">Purchase timeline</h2>
              <p className="dashboard-panel-subtitle">Purchases in the last 7 days</p>
            </div>
          </div>

          {loading && allBuys.length === 0 ? (
            <p className="dashboard-muted">Loading purchase timeline…</p>
          ) : (
            <div className="dashboard-line-chart">
              <svg viewBox="0 0 320 120" role="img" aria-label="Purchase timeline">
                <defs>
                  <linearGradient id="lineGradient" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#0ea5e9" />
                  </linearGradient>
                </defs>
                <polyline className="dashboard-line-fill" points={`18,104 ${timelinePoints} 302,104`} />
                <polyline className="dashboard-line" points={timelinePoints} />
                {purchaseTimeline.map((item, index) => {
                  const [x, y] = timelinePoints.split(' ')[index].split(',')
                  return (
                    <circle
                      key={item.label}
                      className="dashboard-line-dot"
                      cx={x}
                      cy={y}
                      r="4"
                    />
                  )
                })}
              </svg>
              <div className="dashboard-line-labels">
                {purchaseTimeline.map((item) => (
                  <span key={item.label}>
                    <strong>{item.count}</strong>
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="dashboard-panel card">
          <div className="dashboard-panel-head">
            <div>
              <h2 className="dashboard-panel-title">Sales comparison</h2>
              <p className="dashboard-panel-subtitle">
                Compare sales between {comparisonMode === 'weeks' ? 'weeks' : 'months'}
              </p>
            </div>
            <div className="dashboard-toggle" role="group" aria-label="Sales comparison range">
              <button
                type="button"
                className={comparisonMode === 'weeks' ? 'active' : ''}
                onClick={() => setComparisonMode('weeks')}
              >
                Weeks
              </button>
              <button
                type="button"
                className={comparisonMode === 'months' ? 'active' : ''}
                onClick={() => setComparisonMode('months')}
              >
                Months
              </button>
            </div>
          </div>

          {loading && allBuys.length === 0 ? (
            <p className="dashboard-muted">Loading sales comparison…</p>
          ) : (
            <div className="dashboard-bar-chart">
              {salesComparison.map((item) => (
                <div key={item.label} className="dashboard-bar-item">
                  <div className="dashboard-bar-wrap">
                    <div
                      className="dashboard-bar"
                      style={{ height: `${Math.max((item.total / maxSales) * 100, item.total > 0 ? 8 : 0)}%` }}
                      title={`${item.label}: ${formatMoney(item.total)}`}
                    />
                  </div>
                  <span className="dashboard-bar-value">{formatMoney(item.total)}</span>
                  <span className="dashboard-bar-label">{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="dashboard-insights">
        <button
          type="button"
          className="dashboard-stock-section-btn"
          onClick={() => setStockModal('low')}
        >
          <section className="dashboard-panel card dashboard-panel--clickable">
            <div className="dashboard-panel-head">
              <div>
                <h2 className="dashboard-panel-title">Low stock</h2>
                <p className="dashboard-panel-subtitle">1–5 units left (not zero)</p>
                <p className="dashboard-view-all-hint">Click to view all</p>
              </div>
            </div>

            <div className="dashboard-stock-body">
              {loading && lowStockItems.length === 0 ? (
                <p className="dashboard-muted">Checking stock levels…</p>
              ) : lowStockItems.length === 0 ? (
                <div className="dashboard-empty dashboard-empty--compact">
                  <p>No low-stock items.</p>
                </div>
              ) : (
                <div className="dashboard-alert-list">
                  {lowStockItems.map((stock) => (
                    <div key={stock.id} className="dashboard-alert-item dashboard-alert-item--static">
                      <span className="dashboard-alert-symbol">
                        {(stock.companyName || stock.symbol || 'IT').slice(0, 2).toUpperCase()}
                      </span>
                      <span>
                        <strong>{stock.companyName || stock.symbol}</strong>
                        <small>{stock.brand || stock.symbol || '—'}</small>
                      </span>
                      <em>{Number(stock.quantity)} left</em>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </button>

        <button
          type="button"
          className="dashboard-stock-section-btn"
          onClick={() => setStockModal('out')}
        >
          <section className="dashboard-panel card dashboard-panel--clickable">
            <div className="dashboard-panel-head">
              <div>
                <h2 className="dashboard-panel-title">Out of stock</h2>
                <p className="dashboard-panel-subtitle">0 units in inventory</p>
                <p className="dashboard-view-all-hint">Click to view all</p>
              </div>
            </div>

            <div className="dashboard-stock-body">
              {loading && outOfStockItems.length === 0 ? (
                <p className="dashboard-muted">Checking stock levels…</p>
              ) : outOfStockItems.length === 0 ? (
                <div className="dashboard-empty dashboard-empty--compact">
                  <p>Nothing is fully out of stock.</p>
                </div>
              ) : (
                <div className="dashboard-alert-list">
                  {outOfStockItems.map((stock) => (
                    <div key={stock.id} className="dashboard-alert-item dashboard-alert-item--static">
                      <span className="dashboard-alert-symbol">
                        {(stock.companyName || stock.symbol || 'IT').slice(0, 2).toUpperCase()}
                      </span>
                      <span>
                        <strong>{stock.companyName || stock.symbol}</strong>
                        <small>{stock.brand || stock.symbol || '—'}</small>
                      </span>
                      <em className="danger">Out</em>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </button>

        <section className="dashboard-panel card">
          <div className="dashboard-panel-head">
            <div>
              <h2 className="dashboard-panel-title">Payment split</h2>
              <p className="dashboard-panel-subtitle">Sales by payment method</p>
            </div>
          </div>

          <div className="dashboard-payment-list">
            {paymentBreakdown.map((item) => (
              <div key={item.label} className="dashboard-payment-item">
                <div>
                  <span>{item.label}</span>
                  <strong>{formatMoney(item.value)}</strong>
                </div>
                <div className="dashboard-payment-track">
                  <span style={{ width: `${Math.max((item.value / maxPayment) * 100, item.value > 0 ? 6 : 0)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="dashboard-panel card">
          <div className="dashboard-panel-head">
            <div>
              <h2 className="dashboard-panel-title">Top customers</h2>
              <p className="dashboard-panel-subtitle">By purchase value</p>
            </div>
          </div>

          {topCustomers.length === 0 ? (
            <div className="dashboard-empty dashboard-empty--compact">
              <p>No customer purchases yet.</p>
            </div>
          ) : (
            <div className="dashboard-customer-list">
              {topCustomers.map((customer, index) => (
                <div key={customer.name} className="dashboard-customer-item">
                  <span className="dashboard-customer-rank">{index + 1}</span>
                  <span>
                    <strong>{customer.name}</strong>
                    <small>{customer.count} purchase{customer.count === 1 ? '' : 's'}</small>
                  </span>
                  <em>{formatMoney(customer.total)}</em>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="dashboard-insights dashboard-insights--expiry">
        <button
          type="button"
          className="dashboard-stock-section-btn"
          onClick={() => setStockModal('expiring')}
        >
          <section className="dashboard-panel card dashboard-panel--clickable">
            <div className="dashboard-panel-head">
              <div>
                <h2 className="dashboard-panel-title">Expiring soon</h2>
                <p className="dashboard-panel-subtitle">
                  Expires within {NEAR_EXPIRY_DAYS} days
                </p>
                <p className="dashboard-view-all-hint">Click to view all</p>
              </div>
            </div>

            <div className="dashboard-stock-body">
              {loading && expiringSoonItems.length === 0 ? (
                <p className="dashboard-muted">Checking expiry…</p>
              ) : expiringSoonItems.length === 0 ? (
                <div className="dashboard-empty dashboard-empty--compact">
                  <p>No products expiring soon.</p>
                </div>
              ) : (
                <div className="dashboard-alert-list">
                  {expiringSoonItems.map((stock) => (
                    <div key={stock.id} className="dashboard-alert-item dashboard-alert-item--static">
                      <span className="dashboard-alert-symbol dashboard-alert-symbol--warn">
                        {(stock.companyName || stock.symbol || 'IT').slice(0, 2).toUpperCase()}
                      </span>
                      <span>
                        <strong>{stock.companyName || stock.symbol}</strong>
                        <small>
                          {stock.brand || stock.symbol || '—'} · Exp {formatExpiryShort(stock.expiryDate)}
                        </small>
                      </span>
                      <em className="warning">Soon</em>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </button>

        <button
          type="button"
          className="dashboard-stock-section-btn"
          onClick={() => setStockModal('expired')}
        >
          <section className="dashboard-panel card dashboard-panel--clickable">
            <div className="dashboard-panel-head">
              <div>
                <h2 className="dashboard-panel-title">Expired</h2>
                <p className="dashboard-panel-subtitle">Past expiry date</p>
                <p className="dashboard-view-all-hint">Click to view all</p>
              </div>
            </div>

            <div className="dashboard-stock-body">
              {loading && expiredItems.length === 0 ? (
                <p className="dashboard-muted">Checking expiry…</p>
              ) : expiredItems.length === 0 ? (
                <div className="dashboard-empty dashboard-empty--compact">
                  <p>No expired products.</p>
                </div>
              ) : (
                <div className="dashboard-alert-list">
                  {expiredItems.map((stock) => (
                    <div key={stock.id} className="dashboard-alert-item dashboard-alert-item--static">
                      <span className="dashboard-alert-symbol dashboard-alert-symbol--danger">
                        {(stock.companyName || stock.symbol || 'IT').slice(0, 2).toUpperCase()}
                      </span>
                      <span>
                        <strong>{stock.companyName || stock.symbol}</strong>
                        <small>
                          {stock.brand || stock.symbol || '—'} · Exp {formatExpiryShort(stock.expiryDate)}
                        </small>
                      </span>
                      <em className="danger">Expired</em>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </button>
      </div>

      {activeStockModal ? (
        <div
          className="modal-overlay"
          onClick={() => setStockModal(null)}
          role="presentation"
        >
          <div
            className="modal-box dashboard-stock-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-stock-modal-title"
          >
            <div className="dashboard-stock-modal-head">
              <div>
                <h3 id="dashboard-stock-modal-title">{activeStockModal.title}</h3>
                <p>{activeStockModal.subtitle}</p>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setStockModal(null)}
              >
                Close
              </button>
            </div>
            {activeStockModal.items.length === 0 ? (
              <div className="dashboard-empty dashboard-empty--compact">
                <p>No items in this list.</p>
              </div>
            ) : (
              <div className="dashboard-stock-modal-list">
                {activeStockModal.items.map((stock) => (
                  <Link
                    key={stock.id}
                    to={`/products/${stock.id}`}
                    className="dashboard-alert-item"
                    onClick={() => setStockModal(null)}
                  >
                    <span className="dashboard-alert-symbol">
                      {(stock.companyName || stock.symbol || 'IT').slice(0, 2).toUpperCase()}
                    </span>
                    <span>
                      <strong>{stock.companyName || stock.symbol}</strong>
                      <small>
                        {stock.brand || stock.symbol || '—'}
                        {stock.expiryDate ? ` · Exp ${formatExpiryShort(stock.expiryDate)}` : ''}
                        {stock.quantity != null ? ` · Qty ${stock.quantity}` : ''}
                      </small>
                    </span>
                    <em
                      className={
                        activeStockModal.danger ? 'danger' : activeStockModal.warning ? 'warning' : ''
                      }
                    >
                      {activeStockModal.badge(stock)}
                    </em>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      <section className="dashboard-panel card">
        <div className="dashboard-panel-head">
          <h2 className="dashboard-panel-title">Recent purchases</h2>
          <div className="dashboard-panel-tools">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={loadDashboard}
              disabled={loading}
            >
              {loading ? 'Loading…' : 'Refresh'}
            </button>
            <Link to="/transactions" className="dashboard-text-link">
              View all
            </Link>
          </div>
        </div>

        {loading && recentBuys.length === 0 ? (
          <p className="dashboard-muted">Loading recent purchases…</p>
        ) : recentBuys.length === 0 ? (
          <div className="dashboard-empty">
            <p>No purchases recorded yet.</p>
            <Link to="/cart" className="btn btn-primary btn-sm">
              Go to cart
            </Link>
          </div>
        ) : (
          <div className="transactions-table-wrapper">
            <table className="transactions-table dashboard-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {recentBuys.map((t) => (
                  <tr key={t.id}>
                    <td>{formatDate(getTransactionDate(t))}</td>
                    <td>{t.customerName || '—'}</td>
                    <td>{formatMoney(t.total)}</td>
                    <td>
                      <span className={paymentBadgeClass(t.paymentMethod)}>
                        {t.paymentMethod || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

const GuestHome = () => (
  <div className="dashboard page">
    <header className="page-header dashboard-header">
      <div>
        <h1>Dashboard</h1>
        <p className="page-subtitle">Sign in to manage inventory, cart, and sales.</p>
      </div>
    </header>

    <div className="dashboard-guest card">
      <p>Inventory Management keeps your stock, cart, transactions, and loans in one place.</p>
      <div className="dashboard-guest-actions">
        <Link to="/login" className="btn btn-primary">
          Sign in
        </Link>
        <Link to="/register" className="btn btn-secondary">
          Register
        </Link>
        <Link to="/about" className="btn btn-secondary">
          About
        </Link>
      </div>
    </div>
  </div>
)

const Home = () => {
  const { isAuthenticated, user } = useAuth()
  const userName = user?.UserName || user?.userName || ''

  if (isAuthenticated) {
    return <DashboardHome userName={userName} />
  }

  return <GuestHome />
}

export default Home
