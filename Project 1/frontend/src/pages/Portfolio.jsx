import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { portfolioService } from '../services/portfolioService'
import { stockService } from '../services/stockService'
import { transactionService } from '../services/transactionService'
import { paymentService } from '../services/paymentService'
import CustomerReceiptModal from '../components/CustomerReceiptModal'
import './Portfolio.css'

const Portfolio = () => {
  // portfolio = your current cart items (loaded from backend)
  const [portfolio, setPortfolio] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [symbol, setSymbol] = useState('')
  const [adding, setAdding] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  // Controls the modal where you enter customer name and confirm Buy/Loan
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [transactionType, setTransactionType] = useState('Buy')
  const [customerName, setCustomerName] = useState('')
  const [transactionSubmitting, setTransactionSubmitting] = useState(false)
  const [showBuyPaymentModal, setShowBuyPaymentModal] = useState(false)

  // For Buy: how payment happens
  // - Cash: record immediately
  // - Razorpay: open Razorpay payment popup, then record only after verify succeeds
  const [buyPaymentMethod, setBuyPaymentMethod] = useState(null)
  const [razorpayStarting, setRazorpayStarting] = useState(false)
  const [razorpayError, setRazorpayError] = useState('')

  // After a successful Buy, show a printable customer receipt
  const [receiptTransaction, setReceiptTransaction] = useState(null)
  const [addQuantity, setAddQuantity] = useState(1)
  const [selectedStock, setSelectedStock] = useState(null) // for max quantity from inventory
  const searchTimeoutRef = useRef(null)
  const searchInputRef = useRef(null)

  useEffect(() => {
    // Load cart once when page opens
    loadPortfolio()
  }, [])

  // Search stocks by symbol
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // If search query is empty, clear results
    if (!searchQuery.trim()) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    // Debounce search - wait 300ms after user stops typing
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setSearching(true)
        const results = await stockService.getAll({ Symbol: searchQuery.trim() })
        setSearchResults(results || [])
        setShowResults(true)
      } catch (err) {
        console.error('Error searching stocks:', err)
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)

    // Cleanup timeout on unmount or when query changes
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const loadPortfolio = async () => {
    try {
      setLoading(true)
      setError('') // Clear previous errors
      // Fetch cart items from backend API
      const data = await portfolioService.getUserPortfolio()
      if (Array.isArray(data)) {
        setPortfolio(data)
      } else {
        console.warn('Unexpected portfolio data format:', data)
        setPortfolio([])
      }
    } catch (err) {
      // Only set error if it's not a silent reload after successful add
      const errorMsg = err.response?.data?.message || err.message || 'Failed to load cart. Please try again.'
      setError(errorMsg)
      console.error('Error loading portfolio:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddStock = async (e) => {
    e.preventDefault()
    if (!symbol.trim()) {
      alert('Please enter a stock symbol')
      return
    }
    const raw = Math.max(1, parseInt(addQuantity, 10) || 1)
    const qty = maxQuantity != null ? Math.min(raw, maxQuantity) : raw

    try {
      setAdding(true)
      setError('') // Clear any previous errors
      await portfolioService.addToPortfolio(symbol.trim(), qty)
      setSymbol('')
      setSearchQuery('') // Clear search
      setSelectedStock(null)
      setSearchResults([]) // Clear search results
      setShowResults(false) // Hide search results
      setAddQuantity(1)
      // Reload portfolio after successful addition
      await loadPortfolio()
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.response?.data || err.message || 'Failed to add item to cart'
      alert(`Error: ${errorMsg}`)
      console.error('Error adding stock to portfolio:', err)
    } finally {
      setAdding(false)
    }
  }

  // Total = sum of (price × quantity) for each cart item
  const cartTotal = portfolio.reduce((sum, item) => {
    const price = Number(item.price) || 0
    const qty = Number(item.quantity) || 1
    return sum + price * qty
  }, 0)

  const openTransactionModal = (type) => {
    if (type === 'Loan') {
      setBuyPaymentMethod(null)
    }
    setTransactionType(type)
    setCustomerName('')
    setShowTransactionModal(true)
  }

  const closeTransactionModal = () => {
    setShowTransactionModal(false)
    setCustomerName('')
    setBuyPaymentMethod(null)
    setRazorpayError('')
  }

  const openBuyPaymentChoice = () => {
    setShowBuyPaymentModal(true)
  }

  const closeBuyPaymentModal = () => {
    setShowBuyPaymentModal(false)
  }

  const handleChooseCashBuy = () => {
    // Cash = save Buy transaction immediately (backend also reduces stock + clears cart)
    setBuyPaymentMethod('Cash')
    setShowBuyPaymentModal(false)
    openTransactionModal('Buy')
  }

  const handleChooseUpiBuy = async () => {
    // Online payment via Razorpay (UPI supported inside Razorpay popup)
    setBuyPaymentMethod('Razorpay')
    setShowBuyPaymentModal(false)
    setRazorpayError('')
    openTransactionModal('Buy')
  }

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      // Razorpay checkout is loaded from their official CDN script.
      // After it loads, `window.Razorpay` becomes available.
      if (window.Razorpay) return resolve(true)
      const existing = document.querySelector('script[data-razorpay-checkout]')
      if (existing) {
        existing.addEventListener('load', () => resolve(true))
        existing.addEventListener('error', () => resolve(false))
        return
      }
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      script.dataset.razorpayCheckout = 'true'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })

  const handleTransactionSubmit = async (e) => {
    e.preventDefault()
    const name = customerName.trim()
    if (!name) {
      alert('Please enter customer name')
      return
    }
    if (cartTotal <= 0) {
      alert('Cart total must be greater than 0')
      return
    }
    setTransactionSubmitting(true)
    try {
      if (transactionType === 'Buy' && buyPaymentMethod === 'Razorpay') {
        // Razorpay flow:
        // 1) load Razorpay Checkout script
        // 2) ask backend to create a Razorpay Order using the current cart in DB
        // 3) open Razorpay popup
        // 4) after payment success, verify signature on backend
        // 5) backend reduces stock + clears cart + saves Buy transaction
        setRazorpayStarting(true)
        setRazorpayError('')

        const ok = await loadRazorpayScript()
        if (!ok) throw new Error('Could not load Razorpay checkout script.')

        // Check if backend has Razorpay keys configured
        const config = await paymentService.getRazorpayConfig()
        if (!config?.configured || !config?.keyId) {
          throw new Error('Razorpay is not configured on the server. Add Razorpay KeyId/KeySecret in appsettings and restart API.')
        }

        // Backend creates Razorpay order + saves a PaymentOrder record for later
        const order = await paymentService.createRazorpayOrder({ customerName: name })

        const options = {
          key: order.keyId,
          amount: order.amountPaise,
          currency: order.currency || 'INR',
          name: 'Payment',
          description: 'Cart purchase',
          order_id: order.orderId,
          prefill: { name: order.customerName || name },
          notes: { items: order.itemsSummary || '' },
          // This handler runs after Razorpay says "payment success" in the popup.
          // We still verify signature with our backend before we trust it.
          handler: async function (response) {
            try {
              // Verify signature then create the actual Transaction
              const saved = await paymentService.verifyRazorpayPayment({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              })
              closeTransactionModal()
              await loadPortfolio()
              window.dispatchEvent(new CustomEvent('inventory-should-refresh'))
              // Show printable receipt for customer
              setReceiptTransaction(saved)
            } catch (err) {
              const data = err.response?.data
              const msg = data?.message || err.message || 'Payment verification failed.'
              alert(msg)
            }
          },
          modal: {
            ondismiss: function () {
              // user closed payment window
            },
          },
          theme: { color: '#667eea' },
        }

        setRazorpayError('')
        // eslint-disable-next-line no-undef
        const rzp = new window.Razorpay(options)
        rzp.open()
        return
      }

      const body = {
        customerName: name,
        total: cartTotal,
        type: transactionType,
      }
      if (transactionType === 'Buy') {
        body.paymentMethod = buyPaymentMethod || 'Cash'
      }
      const saved = await transactionService.create(body)
      closeTransactionModal()
      // After any successful transaction, reload the cart so it becomes empty
      await loadPortfolio()
      if (transactionType === 'Buy') {
        window.dispatchEvent(new CustomEvent('inventory-should-refresh'))
        if (saved && String(saved.type || '').toLowerCase() === 'buy') {
          setReceiptTransaction(saved)
        } else {
          alert('Buy transaction saved successfully!')
        }
      } else {
        alert(`${transactionType} transaction saved successfully!`)
      }
    } catch (err) {
      const data = err.response?.data
      let msg = data?.message || err.message || `Failed to save ${transactionType} transaction`
      if (data?.error) msg += ` (${data.error})`
      if (data?.inner) msg += ` [${data.inner}]`
      if (transactionType === 'Buy' && buyPaymentMethod === 'Razorpay') setRazorpayError(msg)
      alert(msg)
      console.error(err)
    } finally {
      setTransactionSubmitting(false)
      setRazorpayStarting(false)
    }
  }

  const maxQuantity = selectedStock != null
    ? Math.max(0, parseInt(selectedStock.quantity, 10) || 0)
    : null

  const handleSelectStock = (stock) => {
    setSymbol(stock.symbol)
    setSearchQuery(stock.symbol) // Keep the symbol in search query for display
    setSelectedStock(stock)
    setSearchResults([])
    setShowResults(false)
    const avail = Math.max(0, parseInt(stock.quantity, 10) || 0)
    setAddQuantity((prev) => (avail > 0 ? Math.min(prev, avail) : 0))
  }

  const handleSearchChange = (e) => {
    const value = e.target.value.toUpperCase()
    setSearchQuery(value)
    setSymbol(value) // Update symbol as user types
    setSelectedStock(null) // Clear so max quantity is unknown until they pick from list
  }

  const handleRemoveStock = async (stockSymbol) => {
    if (window.confirm(`Are you sure you want to remove ${stockSymbol} from your cart?`)) {
      try {
        setError('') // Clear previous errors
        await portfolioService.removeFromPortfolio(stockSymbol)
        await loadPortfolio() // Reload portfolio after successful removal
        alert('Item removed from cart successfully!')
      } catch (err) {
        const errorMsg = err.response?.data?.message || err.response?.data || err.message || 'Failed to remove item from cart'
        alert(`Error: ${errorMsg}`)
        console.error('Error removing stock from portfolio:', err)
      }
    }
  }

  if (loading) {
    return <div className="loading">Loading cart...</div>
  }

  return (
    <div className="portfolio-page">
      {receiptTransaction ? (
        <CustomerReceiptModal transaction={receiptTransaction} onClose={() => setReceiptTransaction(null)} />
      ) : null}

      <div className="portfolio-header">
        <h1>My Cart</h1>
      </div>

      <div className="add-stock-section">
        <h2>Add Item to Cart</h2>
        <div className="search-stock-container" ref={searchInputRef}>
          <form onSubmit={handleAddStock} className="add-stock-form">
            <div className="search-input-wrapper">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => {
                  if (searchResults.length > 0 && searchQuery.trim()) {
                    setShowResults(true)
                  }
                }}
                placeholder="Search by symbol (e.g., AAPL)"
                required
                className="symbol-input"
              />
              {searching && (
                <span className="search-loading">Searching...</span>
              )}
            </div>
            {showResults && searchResults.length > 0 && (
              <div className="search-results-dropdown">
                {searchResults.map((stock) => (
                  <div
                    key={stock.id}
                    className="search-result-item"
                    onClick={() => handleSelectStock(stock)}
                  >
                    <div className="search-result-symbol">{stock.symbol}</div>
                    <div className="search-result-company">{stock.companyName || 'N/A'}</div>
                    <div className="search-result-industry">₹{stock.price != null ? Number(stock.price).toLocaleString() : 'N/A'} · Qty: {stock.quantity ?? 'N/A'}</div>
                  </div>
                ))}
              </div>
            )}
            {showResults && searchResults.length === 0 && searchQuery.trim() && !searching && (
              <div className="search-results-dropdown">
                <div className="search-result-item no-results">
                  No items found matching "{searchQuery}"
                </div>
              </div>
            )}
            {symbol.trim() && (
              <div className="add-quantity-row">
                <label htmlFor="add-quantity">Quantity</label>
                <input
                  id="add-quantity"
                  type="number"
                  min={maxQuantity === 0 ? 0 : 1}
                  max={maxQuantity != null && maxQuantity > 0 ? maxQuantity : undefined}
                  value={addQuantity}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10)
                    if (!Number.isInteger(v) || v < 0) {
                      setAddQuantity(maxQuantity === 0 ? 0 : 1)
                      return
                    }
                    const capped = maxQuantity != null ? Math.min(v, maxQuantity) : v
                    setAddQuantity(capped)
                  }}
                  className="quantity-input"
                />
                {maxQuantity != null && (
                  <span className="quantity-hint">Max: {maxQuantity} (inventory)</span>
                )}
              </div>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={adding || !symbol.trim() || maxQuantity === 0}
            >
              {adding ? 'Adding...' : maxQuantity === 0 ? 'Out of stock' : 'Add Item'}
            </button>
          </form>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {portfolio.length > 0 && (
        <div className="cart-actions">
          <button type="button" onClick={openBuyPaymentChoice} className="btn btn-primary">
            Buy
          </button>
          <button type="button" onClick={() => openTransactionModal('Loan')} className="btn btn-secondary">
            Loan
          </button>
        </div>
      )}

      {showBuyPaymentModal && (
        <div className="modal-overlay" onClick={closeBuyPaymentModal}>
          <div className="modal-box modal-box--wide" onClick={(e) => e.stopPropagation()}>
            <h3>How will the customer pay?</h3>
            <p className="modal-total">Total: ₹{cartTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            <p className="modal-hint">
              Cash records the sale immediately. Online opens Razorpay’s payment window (UPI, card, etc.)—not a QR on this page. Configure{' '}
              <code>Razorpay:KeyId</code> and <code>Razorpay:KeySecret</code> in <code>appsettings.json</code> and restart the API.
            </p>
            <div className="buy-payment-actions">
              <button type="button" className="btn btn-secondary" onClick={handleChooseCashBuy}>
                Cash
              </button>
              <button type="button" className="btn btn-primary" onClick={handleChooseUpiBuy}>
                Online (Razorpay)
              </button>
            </div>
            <div className="modal-actions" style={{ marginTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={closeBuyPaymentModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showTransactionModal && (
        <div className="modal-overlay" onClick={closeTransactionModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>{transactionType} Transaction</h3>
            {transactionType === 'Buy' && buyPaymentMethod && (
              <p className="modal-hint">Payment: {buyPaymentMethod === 'Razorpay' ? 'Online (Razorpay)' : buyPaymentMethod}</p>
            )}
            <p className="modal-total">Total: ₹{cartTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            {transactionType === 'Buy' && buyPaymentMethod === 'Razorpay' && (
              <p className="modal-hint">
                After you click <strong>Pay Online</strong>, Razorpay opens in a popup. UPI QR (if shown) appears inside Razorpay, not here.
              </p>
            )}
            {transactionType === 'Buy' && buyPaymentMethod === 'Razorpay' && razorpayError && (
              <div className="error">{razorpayError}</div>
            )}
            <form onSubmit={handleTransactionSubmit}>
              <div className="form-group">
                <label htmlFor="customer-name">Customer Name *</label>
                <input
                  id="customer-name"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                  required
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={closeTransactionModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={transactionSubmitting}>
                  {transactionSubmitting
                    ? buyPaymentMethod === 'Razorpay'
                      ? 'Opening...'
                      : 'Saving...'
                    : buyPaymentMethod === 'Razorpay' && transactionType === 'Buy'
                      ? 'Pay Online'
                      : `Confirm ${transactionType}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {portfolio.length === 0 ? (
        <div className="empty-portfolio">
          <p>Your cart is empty. Add items to get started!</p>
        </div>
      ) : (
        <div className="portfolio-grid">
          {portfolio.map((stock) => (
            <div key={stock.id || stock.symbol} className="portfolio-card">
              <div className="portfolio-card-header">
                <h3>{stock.symbol}</h3>
                <button
                  onClick={() => handleRemoveStock(stock.symbol)}
                  className="btn btn-danger btn-sm"
                >
                  Remove
                </button>
              </div>
              <div className="portfolio-card-body">
                <p className="portfolio-company">{stock.companyName || 'N/A'}</p>
                <div className="portfolio-details">
                  <div className="portfolio-detail-item">
                    <span className="label">Price:</span>
                    <span className="value">₹{stock.price != null ? Number(stock.price).toLocaleString() : 'N/A'}</span>
                  </div>
                  <div className="portfolio-detail-item">
                    <span className="label">Quantity in cart:</span>
                    <span className="value">{stock.quantity != null ? stock.quantity : 1}</span>
                  </div>
                  <div className="portfolio-detail-item">
                    <span className="label">Market Price:</span>
                    <span className="value">₹{stock.marketCap != null ? Number(stock.marketCap).toLocaleString() : 'N/A'}</span>
                  </div>
                </div>
              </div>
              <div className="portfolio-card-actions">
                <Link to={`/stocks/${stock.id || stock.stockId}`} className="btn btn-secondary btn-sm">
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Portfolio








