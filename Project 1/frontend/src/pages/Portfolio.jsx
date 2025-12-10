import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { portfolioService } from '../services/portfolioService'
import { stockService } from '../services/stockService'
import './Portfolio.css'

const Portfolio = () => {
  const [portfolio, setPortfolio] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [symbol, setSymbol] = useState('')
  const [adding, setAdding] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchTimeoutRef = useRef(null)
  const searchInputRef = useRef(null)

  useEffect(() => {
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
      const data = await portfolioService.getUserPortfolio()
      if (Array.isArray(data)) {
        setPortfolio(data)
      } else {
        console.warn('Unexpected portfolio data format:', data)
        setPortfolio([])
      }
    } catch (err) {
      // Only set error if it's not a silent reload after successful add
      const errorMsg = err.response?.data?.message || err.message || 'Failed to load portfolio. Please try again.'
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

    try {
      setAdding(true)
      setError('') // Clear any previous errors
      await portfolioService.addToPortfolio(symbol.trim())
      setSymbol('')
      setSearchQuery('') // Clear search
      setSearchResults([]) // Clear search results
      setShowResults(false) // Hide search results
      // Reload portfolio after successful addition
      await loadPortfolio()
      alert('Stock added to portfolio successfully!')
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.response?.data || err.message || 'Failed to add stock to portfolio'
      alert(`Error: ${errorMsg}`)
      console.error('Error adding stock to portfolio:', err)
    } finally {
      setAdding(false)
    }
  }

  const handleSelectStock = (stock) => {
    setSymbol(stock.symbol)
    setSearchQuery(stock.symbol) // Keep the symbol in search query for display
    setSearchResults([])
    setShowResults(false)
  }

  const handleSearchChange = (e) => {
    const value = e.target.value.toUpperCase()
    setSearchQuery(value)
    setSymbol(value) // Update symbol as user types
  }

  const handleRemoveStock = async (stockSymbol) => {
    if (window.confirm(`Are you sure you want to remove ${stockSymbol} from your portfolio?`)) {
      try {
        setError('') // Clear previous errors
        await portfolioService.removeFromPortfolio(stockSymbol)
        await loadPortfolio() // Reload portfolio after successful removal
        alert('Stock removed from portfolio successfully!')
      } catch (err) {
        const errorMsg = err.response?.data?.message || err.response?.data || err.message || 'Failed to remove stock from portfolio'
        alert(`Error: ${errorMsg}`)
        console.error('Error removing stock from portfolio:', err)
      }
    }
  }

  if (loading) {
    return <div className="loading">Loading portfolio...</div>
  }

  return (
    <div className="portfolio-page">
      <div className="portfolio-header">
        <h1>My Portfolio</h1>
      </div>

      <div className="add-stock-section">
        <h2>Add Stock to Portfolio</h2>
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
                    <div className="search-result-industry">{stock.industry || 'N/A'}</div>
                  </div>
                ))}
              </div>
            )}
            {showResults && searchResults.length === 0 && searchQuery.trim() && !searching && (
              <div className="search-results-dropdown">
                <div className="search-result-item no-results">
                  No stocks found matching "{searchQuery}"
                </div>
              </div>
            )}
            <button type="submit" className="btn btn-primary" disabled={adding || !symbol.trim()}>
              {adding ? 'Adding...' : 'Add Stock'}
            </button>
          </form>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {portfolio.length === 0 ? (
        <div className="empty-portfolio">
          <p>Your portfolio is empty. Add stocks to get started!</p>
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
                    <span className="label">Industry:</span>
                    <span className="value">{stock.industry || 'N/A'}</span>
                  </div>
                  <div className="portfolio-detail-item">
                    <span className="label">Purchase:</span>
                    <span className="value">${stock.purchase || 'N/A'}</span>
                  </div>
                  <div className="portfolio-detail-item">
                    <span className="label">Last Div:</span>
                    <span className="value">${stock.lastDiv || 'N/A'}</span>
                  </div>
                  <div className="portfolio-detail-item">
                    <span className="label">Market Cap:</span>
                    <span className="value">${stock.marketCap?.toLocaleString() || 'N/A'}</span>
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








