import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { stockService } from '../services/stockService'
import { offerService } from '../services/offerService'
import { useAuth } from '../contexts/AuthContext'
import './StockDetails.css'

const StockDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [stock, setStock] = useState(null)
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [offerForm, setOfferForm] = useState({ title: '', content: '' })
  const [showOfferForm, setShowOfferForm] = useState(false)

  useEffect(() => {
    loadStock()
    loadOffers()
  }, [id])

  const loadStock = async () => {
    try {
      setError('') // Clear previous errors
      const data = await stockService.getById(id)
      if (data) {
        setStock(data)
      } else {
        setError('Item not found')
      }
    } catch (err) {
      console.error('Error loading stock:', err)
      let errorMessage = 'Failed to load item details'
      
      if (err.response) {
        const status = err.response.status
        if (status === 404) {
          errorMessage = 'Item not found'
        } else if (status === 401) {
          errorMessage = 'You are not authenticated. Please login again.'
        } else if (status === 403) {
          errorMessage = 'You do not have permission to view this item.'
        } else if (err.response.data?.message) {
          errorMessage = err.response.data.message
        } else {
          errorMessage = `Failed to load stock (Error ${status})`
        }
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const loadOffers = async () => {
    try {
      const data = await offerService.getAll()
      const stockOffers = data.filter(c => c.stockId === parseInt(id))
      setOffers(stockOffers)
    } catch (err) {
      console.error('Failed to load offers', err)
    }
  }

  const handleOfferSubmit = async (e) => {
    e.preventDefault()
    if (!isAuthenticated) {
      alert('Please login to add offers')
      return
    }

    if (!offerForm.title || offerForm.title.trim().length < 5) {
      alert('Title must be at least 5 characters long')
      return
    }
    if (!offerForm.content || offerForm.content.trim().length < 5) {
      alert('Content must be at least 5 characters long')
      return
    }

    try {
      await offerService.create(id, offerForm)
      setOfferForm({ title: '', content: '' })
      setShowOfferForm(false)
      loadOffers()
    } catch (err) {
      console.error('Offer creation error:', err)
      console.error('Error response data:', err.response?.data)
      
      // Extract validation errors from ModelState
      let errorMessage = 'Failed to create offer'
      if (err.response?.data) {
        const data = err.response.data
        // Check for ModelState errors (ASP.NET Core format)
        if (data.title && Array.isArray(data.title)) {
          errorMessage = data.title[0]
        } else if (data.content && Array.isArray(data.content)) {
          errorMessage = data.content[0]
        } else if (data.Title && Array.isArray(data.Title)) {
          errorMessage = data.Title[0]
        } else if (data.Content && Array.isArray(data.Content)) {
          errorMessage = data.Content[0]
        } else if (data.message) {
          errorMessage = data.message
        } else if (typeof data === 'string') {
          errorMessage = data
        } else {
          // Try to extract any error message
          const errorKeys = Object.keys(data)
          if (errorKeys.length > 0) {
            const firstError = data[errorKeys[0]]
            if (Array.isArray(firstError)) {
              errorMessage = firstError[0]
            } else if (typeof firstError === 'string') {
              errorMessage = firstError
            }
          }
        }
      }
      alert(`Error: ${errorMessage}`)
    }
  }

  const handleDeleteOffer = async (offerId) => {
    if (window.confirm('Are you sure you want to delete this offer?')) {
      try {
        await offerService.delete(offerId)
        await loadOffers()
      } catch (err) {
        const errorMsg = err.response?.data?.message || err.response?.data || err.message || 'Failed to delete offer'
        alert(`Error: ${errorMsg}`)
        console.error('Error deleting offer:', err)
      }
    }
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  if (error || !stock) {
    return (
      <div className="error-container">
        <div className="error">{error || 'Item not found'}</div>
        <Link to="/stocks" className="btn btn-secondary">Back to Inventory</Link>
      </div>
    )
  }

  return (
    <div className="stock-details-page">
      <div className="stock-details-header">
        <Link to="/stocks" className="btn btn-secondary">← Back to Inventory</Link>
        {isAuthenticated && (
          <Link to={`/stocks/${id}/edit`} className="btn btn-primary">
            Edit Item
          </Link>
        )}
      </div>

      <div className="stock-details-card">
        <div className="stock-details-main">
          <h1>{stock.symbol}</h1>
          <h2>{stock.companyName}</h2>
          <div className="stock-info-grid">
            <div className="info-item">
              <span className="info-label">ID</span>
              <span className="info-value">#{stock.id}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Price (₹)</span>
              <span className="info-value">₹{stock.price != null ? Number(stock.price).toLocaleString() : 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Quantity</span>
              <span className="info-value">{stock.quantity != null ? stock.quantity : 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Market Price</span>
              <span className="info-value">₹{stock.marketCap != null ? Number(stock.marketCap).toLocaleString() : 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="comments-section">
        <div className="comments-header">
          <h2>Offers ({offers.length})</h2>
          {isAuthenticated && (
            <button
              onClick={() => setShowOfferForm(!showOfferForm)}
              className="btn btn-primary"
            >
              {showOfferForm ? 'Cancel' : 'Add Offer'}
            </button>
          )}
        </div>

        {showOfferForm && isAuthenticated && (
          <form onSubmit={handleOfferSubmit} className="comment-form">
            <div className="form-group">
              <label htmlFor="offer-title">Title</label>
              <input
                type="text"
                id="offer-title"
                value={offerForm.title}
                onChange={(e) => setOfferForm({ ...offerForm, title: e.target.value })}
                required
                placeholder="Offer title"
                minLength={5}
                maxLength={280}
              />
            </div>
            <div className="form-group">
              <label htmlFor="offer-content">Content</label>
              <textarea
                id="offer-content"
                value={offerForm.content}
                onChange={(e) => setOfferForm({ ...offerForm, content: e.target.value })}
                required
                placeholder="Write your offer..."
                rows="4"
                minLength={5}
                maxLength={280}
              />
            </div>
            <button type="submit" className="btn btn-primary">Submit Offer</button>
          </form>
        )}

        {offers.length === 0 ? (
          <div className="no-comments">No offers yet. Be the first to add an offer!</div>
        ) : (
          <div className="comments-list">
            {offers.map((offer) => (
              <div key={offer.id} className="comment-card">
                <div className="comment-header">
                  <h4>{offer.title}</h4>
                  {isAuthenticated && (
                    <button
                      onClick={() => handleDeleteOffer(offer.id)}
                      className="btn btn-danger btn-sm"
                    >
                      Delete
                    </button>
                  )}
                </div>
                <p className="comment-content">{offer.content}</p>
                <div className="comment-footer">
                  <span className="comment-author">By: {offer.createdBy || 'Unknown'}</span>
                  <span className="comment-date">
                    {offer.createdOn ? new Date(offer.createdOn).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default StockDetails








