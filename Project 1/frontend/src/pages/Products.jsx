import { useMemo, useState, useEffect, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { productService } from '../services/productService'
import { tokenHelper } from '../utils/tokenHelper'
import { useCurrency } from '../contexts/CurrencyContext'
import ConfirmDialog from '../components/ConfirmDialog'
import { useAppDialog } from '../hooks/useAppDialog'
import { displayPrice } from '../utils/productPrice'
import './Products.css'

const getAvatarText = (symbol, name) => {
  const s = String(symbol || '').trim()
  if (s) return s.slice(0, 2).toUpperCase()
  const n = String(name || '').trim()
  if (!n) return 'PR'
  const words = n.split(/\s+/).filter(Boolean)
  const initials = (words[0]?.[0] || '') + (words[1]?.[0] || '')
  return initials.trim().toUpperCase().slice(0, 2) || n.slice(0, 2).toUpperCase()
}

const getOriginalPrice = (price, marketCap) => {
  const p = displayPrice(price)
  const m = displayPrice(marketCap)
  if (!Number.isFinite(p) || p <= 0) return Number.isFinite(m) ? m : 0
  // If seed/backing data still has "market cap" style numbers, normalize to a reasonable MRP.
  if (!Number.isFinite(m) || m <= 0 || m > 100000) return p * 1.25
  // If market value is suspiciously higher than unit price, treat it as cap and normalize.
  if (m > p * 50) return p * 1.25
  return m
}

const Products = () => {
  const { formatMoney, formatCompactMoney } = useCurrency()
  const { showAlert, AppDialog } = useAppDialog()
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null) // { id, name }
  const [query, setQuery] = useState('')
  const [view, setView] = useState('compact')
  const location = useLocation()

  const filteredStocks = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = Array.isArray(stocks) ? stocks : []
    if (!q) return list
    return list.filter((s) => {
      const brand = String(s.brand || '').toLowerCase()
      const name = String(s.companyName || '').toLowerCase()
      return brand.includes(q) || name.includes(q)
    })
  }, [stocks, query])

  const loadStocks = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      
      // Check token before making request
      if (!tokenHelper.hasToken()) {
        setError('No authentication token found. Please login again.')
        setLoading(false)
        return
      }
      
      const token = tokenHelper.getToken()
      
      if (tokenHelper.isTokenExpired(token)) {
        setError('Your session has expired. Please login again.')
        tokenHelper.clearToken()
        setLoading(false)
        return
      }
      
      const data = await productService.getAll()
      
      if (Array.isArray(data)) {
        setStocks(data)
        setError('') // Clear any previous errors on successful load
      } else {
        setStocks([])
        setError('') // Clear error even if data format is unexpected
      }
    } catch (err) {
      // Extract specific error message
      let errorMessage = 'Failed to load stocks. Please try again.'
      
      if (err.response) {
        const status = err.response.status
        if (status === 401) {
          errorMessage = 'You are not authenticated. Please login again. (Error 401: Unauthorized)'
          // Clear invalid token
          tokenHelper.clearToken()
        } else if (status === 403) {
          errorMessage = 'You do not have permission to view stocks. (Error 403: Forbidden)'
        } else if (status === 500) {
          const data = err.response.data
          errorMessage = data?.message || 'Server error. Please try again later.'
          if (data?.error) errorMessage += ` (${data.error})`
          if (data?.inner) errorMessage += ` [${data.inner}]`
        } else if (err.response.data?.message) {
          errorMessage = `${err.response.data.message} (Error ${status})`
        } else {
          errorMessage = `Request failed with status ${status}`
        }
      } else if (err.code === 'ERR_NETWORK' || err.code === 'ECONNREFUSED') {
        errorMessage = 'Cannot connect to the server. Make sure the backend is running on http://localhost:5032'
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Refetch on mount and whenever user navigates to Inventory (e.g. after a purchase from Cart)
  useEffect(() => {
    if (location.pathname === '/products') loadStocks()
  }, [location.pathname, loadStocks])

  // Refetch when a Buy completed (e.g. user had Inventory open and did Buy in another tab, or will navigate here next)
  useEffect(() => {
    const onRefresh = () => loadStocks()
    window.addEventListener('inventory-should-refresh', onRefresh)
    return () => window.removeEventListener('inventory-should-refresh', onRefresh)
  }, [loadStocks])

  const requestDelete = (id, name) => {
    setConfirmDelete({ id, name: name || 'this item' })
  }

  const handleConfirmDelete = async () => {
    if (!confirmDelete?.id) return
    try {
      setError('')
      await productService.delete(confirmDelete.id)
      setConfirmDelete(null)
      await loadStocks()
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.response?.data || err.message || 'Failed to delete item'
      setConfirmDelete(null)
      await showAlert(errorMsg, { variant: 'error' })
    }
  }

  if (loading) {
    return <div className="loading">Loading inventory...</div>
  }

  if (error) {
    return (
      <div className="stocks-page">
        <div className="error-container">
          <h2 style={{ color: '#e74c3c', marginBottom: '1rem' }}>Error Loading Inventory</h2>
          <div className="error">{error}</div>
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {error.includes('No authentication token') || error.includes('401') || error.includes('not authenticated') ? (
              <Link to="/login" className="btn btn-primary">
                Go to Login
              </Link>
            ) : (
              <button onClick={loadStocks} className="btn btn-primary">
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="stocks-page page">
      <AppDialog />
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete item?"
        message={confirmDelete ? `Are you sure you want to delete "${confirmDelete.name}"? This cannot be undone.` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      <div className="stocks-header">
        <h1>Products</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div className="stocks-tools">
            <div className="stocks-search">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search company or product…"
                aria-label="Search company or product"
              />
            </div>
            <div className="stocks-view-toggle" role="group" aria-label="Inventory view">
              <button type="button" className={view === 'compact' ? 'active' : ''} onClick={() => setView('compact')}>
                Compact
              </button>
              <button type="button" className={view === 'showcase' ? 'active' : ''} onClick={() => setView('showcase')}>
                Showcase
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadStocks()}
            disabled={loading}
            className="btn btn-secondary"
            title="Refresh to see updated quantities after a purchase"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <Link to="/products/create" className="btn btn-primary">
            Add New Item
          </Link>
        </div>
      </div>

      {stocks.length === 0 ? (
        <div className="empty-state">
          <p>No inventory items found. Create your first item to get started!</p>
          <Link to="/products/create" className="btn btn-primary">
            Create Item
          </Link>
        </div>
      ) : (
        <div className="stocks-grid">
          {filteredStocks.map((stock) => {
            const quantity = Number(stock.quantity) || 0
            const stockStatus = quantity === 0 ? 'Out of stock' : quantity <= 5 ? 'Low stock' : 'Available'
            const statusClass = quantity === 0 ? 'danger' : quantity <= 5 ? 'warning' : 'success'
            const offerCount = stock.offers?.length || 0
            const stockLevel = Math.min(100, Math.max(0, quantity))

            return (
              <article
                key={stock.id}
                className={`stock-card stock-card--${statusClass} ${view === 'compact' ? 'stock-card--compact' : 'stock-card--showcase'}`}
              >
                <div className="stock-card-glow" aria-hidden />
                <div className="stock-card-topline">
                  <span className="stock-id">#{stock.id}</span>
                </div>

                <div className="stock-hero">
                  <span className="stock-symbol-avatar">{getAvatarText(stock.symbol, stock.companyName)}</span>
                  <div className="stock-hero-copy">
                    <strong>{stock.companyName || 'Unnamed item'}</strong>
                    {stock.brand ? <small>{stock.brand}</small> : null}
                  </div>
                </div>

                <div className="stock-card-header">
                  <div className="stock-identity">
                    <h3>{stock.companyName || 'Unnamed item'}</h3>
                    {stock.brand ? <p className="stock-brand-line">{stock.brand}</p> : null}
                  </div>
                  <span className={`stock-status stock-status--${statusClass}`}>{stockStatus}</span>
                </div>

                <div className="stock-price-panel">
                  <div>
                    <span className="stock-price-label">Selling price</span>
                    <strong>{formatMoney(displayPrice(stock.price))}</strong>
                  </div>
                  <div className="stock-market-chip">
                    <span>Original price (MRP)</span>
                    <strong>{formatMoney(getOriginalPrice(stock.price, stock.marketCap))}</strong>
                  </div>
                </div>

                <div className="stock-health">
                  <div className="stock-health-label">
                    <span>Stock health</span>
                    <strong>{quantity} units</strong>
                  </div>
                  <div className="stock-health-track" aria-hidden>
                    <span style={{ width: `${stockLevel}%` }} />
                  </div>
                </div>

                <div className="stock-metrics">
                  <div className="stock-metric">
                    <span>Qty</span>
                    <strong>{quantity}</strong>
                  </div>
                  <div className="stock-metric">
                    <span>Offers</span>
                    <strong>{offerCount}</strong>
                  </div>
                </div>

                <div className="stock-card-actions">
                  <Link to={`/products/${stock.id}`} className="stock-action stock-action--primary">
                    View details
                  </Link>
                  <Link to={`/products/${stock.id}/edit`} className="stock-action">
                    Edit
                  </Link>
                  <button
                    onClick={() => requestDelete(stock.id, stock.companyName || stock.symbol)}
                    className="stock-action stock-action--danger"
                  >
                    Delete
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Products




