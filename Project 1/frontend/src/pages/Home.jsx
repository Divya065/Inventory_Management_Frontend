import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { stockService } from '../services/stockService'
import { portfolioService } from '../services/portfolioService'
import { transactionService } from '../services/transactionService'
import './Home.css'

const SHORTCUTS = [
  { to: '/stocks', label: 'Inventory' },
  { to: '/stocks/create', label: 'Add item' },
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
      else if (method.includes('razorpay') || method.includes('online') || method.includes('upi')) acc.online += amount
      return acc
    },
    { cash: 0, online: 0 }
  )

  return [
    { label: 'Cash', value: totals.cash },
    { label: 'Online', value: totals.online },
  ]
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
  const [stockCount, setStockCount] = useState(0)
  const [cartCount, setCartCount] = useState(0)
  const [buyCount, setBuyCount] = useState(0)
  const [loanCount, setLoanCount] = useState(0)
  const [allBuys, setAllBuys] = useState([])
  const [recentBuys, setRecentBuys] = useState([])
  const [lowStockItems, setLowStockItems] = useState([])
  const [comparisonMode, setComparisonMode] = useState('weeks')

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    setLoading(true)
    setError('')

    try {
      const [stocks, cart, transactions, loans] = await Promise.all([
        stockService.getAll().catch(() => []),
        portfolioService.getUserPortfolio().catch(() => []),
        transactionService.getAll().catch(() => []),
        transactionService.getLoanSummary().catch(() => []),
      ])

      const stockList = Array.isArray(stocks) ? stocks : []
      const cartList = Array.isArray(cart) ? cart : []
      const buys = (Array.isArray(transactions) ? transactions : []).filter(
        (t) => String(t.type || '').toLowerCase() === 'buy'
      )
      const loanList = Array.isArray(loans) ? loans : []

      setStockCount(stockList.length)
      setCartCount(cartList.length)
      setBuyCount(buys.length)
      setLoanCount(loanList.length)
      setLowStockItems(
        stockList
          .filter((stock) => Number(stock.quantity) <= 5)
          .sort((a, b) => (Number(a.quantity) || 0) - (Number(b.quantity) || 0))
          .slice(0, 5)
      )

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
        <Link to="/stocks" className="dashboard-stat card">
          <span className="dashboard-stat-label">Low Stock</span>
          <span className="dashboard-stat-value">{loading ? '…' : lowStockItems.length}</span>
          <span className="dashboard-stat-meta">{stockCount} products in catalog</span>
        </Link>
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
        <section className="dashboard-panel card">
          <div className="dashboard-panel-head">
            <div>
              <h2 className="dashboard-panel-title">Low stock alerts</h2>
              <p className="dashboard-panel-subtitle">Items with 5 or fewer units</p>
            </div>
            <Link to="/stocks" className="dashboard-text-link">Inventory</Link>
          </div>

          {loading && lowStockItems.length === 0 ? (
            <p className="dashboard-muted">Checking stock levels…</p>
          ) : lowStockItems.length === 0 ? (
            <div className="dashboard-empty dashboard-empty--compact">
              <p>All products have healthy stock.</p>
            </div>
          ) : (
            <div className="dashboard-alert-list">
              {lowStockItems.map((stock) => (
                <Link key={stock.id} to={`/stocks/${stock.id}`} className="dashboard-alert-item">
                  <span className="dashboard-alert-symbol">{stock.symbol?.slice(0, 2).toUpperCase() || 'IT'}</span>
                  <span>
                    <strong>{stock.symbol}</strong>
                    <small>{stock.companyName || 'Unnamed item'}</small>
                  </span>
                  <em className={Number(stock.quantity) === 0 ? 'danger' : ''}>
                    {Number(stock.quantity) === 0 ? 'Out' : `${stock.quantity} left`}
                  </em>
                </Link>
              ))}
            </div>
          )}
        </section>

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
