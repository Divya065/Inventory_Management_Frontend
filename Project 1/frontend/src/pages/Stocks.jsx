import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { stockService } from '../services/stockService'
import { tokenHelper } from '../utils/tokenHelper'
import './Stocks.css'

const Stocks = () => {
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // Load stocks directly on mount
    console.log('=== Loading Stocks ===')
    loadStocks()
  }, [])

  const loadStocks = async () => {
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
      const decoded = tokenHelper.decodeToken(token)
      
      if (decoded) {
        console.log('Token info:', {
          email: decoded.email,
          username: decoded.given_name,
          expires: new Date(decoded.exp * 1000).toLocaleString(),
          isExpired: tokenHelper.isTokenExpired(token)
        })
      }
      
      if (tokenHelper.isTokenExpired(token)) {
        setError('Your session has expired. Please login again.')
        tokenHelper.clearToken()
        setLoading(false)
        return
      }
      
      console.log('Fetching stocks from API...')
      const data = await stockService.getAll()
      console.log('Stocks received:', data)
      console.log('Number of stocks:', data?.length || 0)
      
      if (Array.isArray(data)) {
        setStocks(data)
        setError('') // Clear any previous errors on successful load
      } else {
        console.warn('Unexpected data format:', data)
        setStocks([])
        setError('') // Clear error even if data format is unexpected
      }
    } catch (err) {
      console.error('Error loading stocks:', err)
      console.error('Full error object:', err)
      
      // Extract specific error message
      let errorMessage = 'Failed to load stocks. Please try again.'
      
      if (err.response) {
        const status = err.response.status
        if (status === 401) {
          errorMessage = 'You are not authenticated. Please login again. (Error 401: Unauthorized)'
          console.error('401 Error Details:', {
            responseData: err.response.data,
            headers: err.response.headers,
            tokenExists: tokenHelper.hasToken(),
            tokenValue: token ? token.substring(0, 20) + '...' : 'null'
          })
          // Clear invalid token
          tokenHelper.clearToken()
        } else if (status === 403) {
          errorMessage = 'You do not have permission to view stocks. (Error 403: Forbidden)'
        } else if (status === 500) {
          errorMessage = 'Server error. Please try again later. (Error 500: Internal Server Error)'
          if (err.response.data?.message) {
            errorMessage += ` - ${err.response.data.message}`
          }
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
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this stock?')) {
      try {
        setError('') // Clear previous errors
        await stockService.delete(id)
        await loadStocks() // Reload stocks after successful deletion
      } catch (err) {
        const errorMsg = err.response?.data?.message || err.response?.data || err.message || 'Failed to delete stock'
        alert(`Error: ${errorMsg}`)
        console.error('Error deleting stock:', err)
      }
    }
  }
  
  // Debug: Log the stocks data structure
  useEffect(() => {
    if (stocks.length > 0) {
      console.log('Sample stock structure:', stocks[0])
      console.log('Available properties:', Object.keys(stocks[0]))
    }
  }, [stocks])

  if (loading) {
    return <div className="loading">Loading stocks...</div>
  }

  if (error) {
    return (
      <div className="stocks-page">
        <div className="error-container">
          <h2 style={{ color: '#e74c3c', marginBottom: '1rem' }}>Error Loading Stocks</h2>
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
            {!error.includes('No authentication token') && (
              <button onClick={loadStocks} className="btn btn-secondary">
                Retry
              </button>
            )}
          </div>
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8f9fa', borderRadius: '5px' }}>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#7f8c8d', fontWeight: '600' }}>
              Debugging Information:
            </p>
            <ul style={{ margin: '0', paddingLeft: '1.5rem', fontSize: '0.85rem', color: '#7f8c8d' }}>
              <li>Check the browser console (F12) for detailed error logs</li>
              <li>Verify your token is valid in sessionStorage (F12 → Application → Session Storage)</li>
              <li>Check the backend terminal for server-side errors</li>
              <li>Make sure the backend is running on http://localhost:5032</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="stocks-page">
      <div className="stocks-header">
        <h1>Stocks</h1>
        <Link to="/stocks/create" className="btn btn-primary">
          Add New Stock
        </Link>
      </div>

      {stocks.length === 0 ? (
        <div className="empty-state">
          <p>No stocks found. Create your first stock to get started!</p>
          <Link to="/stocks/create" className="btn btn-primary">
            Create Stock
          </Link>
        </div>
      ) : (
        <div className="stocks-grid">
          {stocks.map((stock) => (
            <div key={stock.id} className="stock-card">
              <div className="stock-card-header">
                <h3>{stock.symbol}</h3>
                <span className="stock-id">#{stock.id}</span>
              </div>
              <div className="stock-card-body">
                <p className="stock-company">{stock.companyName || 'N/A'}</p>
                <div className="stock-details">
                  <div className="stock-detail-item">
                    <span className="label">Industry:</span>
                    <span className="value">{stock.industry || 'N/A'}</span>
                  </div>
                  <div className="stock-detail-item">
                    <span className="label">Purchase:</span>
                    <span className="value">
                      {stock.purchase != null ? `$${stock.purchase}` : 'N/A'}
                    </span>
                  </div>
                  <div className="stock-detail-item">
                    <span className="label">Last Div:</span>
                    <span className="value">
                      {stock.lastDiv != null ? `$${stock.lastDiv}` : 'N/A'}
                    </span>
                  </div>
                  <div className="stock-detail-item">
                    <span className="label">Market Cap:</span>
                    <span className="value">
                      {stock.marketCap != null 
                        ? `$${stock.marketCap.toLocaleString()}` 
                        : 'N/A'}
                    </span>
                  </div>
                  {stock.comments && stock.comments.length > 0 && (
                    <div className="stock-detail-item">
                      <span className="label">Comments:</span>
                      <span className="value">{stock.comments.length}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="stock-card-actions">
                <Link to={`/stocks/${stock.id}`} className="btn btn-secondary btn-sm">
                  View Details
                </Link>
                <Link to={`/stocks/${stock.id}/edit`} className="btn btn-secondary btn-sm">
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(stock.id)}
                  className="btn btn-danger btn-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Stocks




