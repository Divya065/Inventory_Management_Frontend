import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { productService } from '../services/productService'
import { offerService } from '../services/offerService'
import { useAuth } from '../contexts/AuthContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { displayPrice } from '../utils/productPrice'
import './ProductDetails.css'
import '../components/ProductOfferEditor.css'

const ProductDetails = () => {
  const { id } = useParams()
  const { isAuthenticated } = useAuth()
  const { currency, formatMoney } = useCurrency()
  const [stock, setStock] = useState(null)
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadStock()
    loadOffers()
  }, [id])

  const loadStock = async () => {
    try {
      setError('')
      const data = await productService.getById(id)
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
      const stockOffers = (data || []).filter((c) => Number(c.stockId) === parseInt(id, 10))
      setOffers(stockOffers)
    } catch (err) {
      console.error('Failed to load offers', err)
      setOffers([])
    }
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  if (error || !stock) {
    return (
      <div className="error-container">
        <div className="error">{error || 'Item not found'}</div>
        <Link to="/products" className="btn btn-secondary">
          Back to Inventory
        </Link>
      </div>
    )
  }

  return (
    <div className="stock-details-page">
      <div className="stock-details-header">
        <Link to="/products" className="btn btn-secondary">
          ← Back to Inventory
        </Link>
        {isAuthenticated && (
          <Link to={`/products/${id}/edit`} className="btn btn-primary">
            Edit Item
          </Link>
        )}
      </div>

      <div className="stock-details-card">
        <div className="stock-details-main">
          <h1>{stock.companyName || stock.symbol || 'Item'}</h1>
          <div className="stock-info-grid">
            <div className="info-item">
              <span className="info-label">ID</span>
              <span className="info-value">#{stock.id}</span>
            </div>
            {stock.barcode ? (
              <div className="info-item">
                <span className="info-label">Barcode</span>
                <span className="info-value">{stock.barcode}</span>
              </div>
            ) : null}
            {stock.brand ? (
              <div className="info-item">
                <span className="info-label">Company</span>
                <span className="info-value">{stock.brand}</span>
              </div>
            ) : null}
            <div className="info-item">
              <span className="info-label">Price ({currency})</span>
              <span className="info-value">{formatMoney(displayPrice(stock.price))}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Quantity</span>
              <span className="info-value">{stock.quantity != null ? stock.quantity : 'N/A'}</span>
            </div>
            {stock.expiryDate ? (
              <div className="info-item">
                <span className="info-label">Expiry</span>
                <span className="info-value">
                  {new Date(stock.expiryDate).toLocaleDateString()}
                  {stock.expiryStatus ? ` · ${stock.expiryStatus}` : ''}
                </span>
              </div>
            ) : null}
            <div className="info-item">
              <span className="info-label">Original price (MRP) ({currency})</span>
              <span className="info-value">
                {(() => {
                  const p = displayPrice(stock.price)
                  const m = displayPrice(stock.marketCap)
                  const original =
                    !Number.isFinite(m) ||
                    m <= 0 ||
                    m > 100000 ||
                    (Number.isFinite(p) && p > 0 && m > p * 50)
                      ? Number.isFinite(p) && p > 0
                        ? p * 1.25
                        : m
                      : m
                  return formatMoney(original)
                })()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="comments-section">
        <div className="comments-header">
          <h2>Offers ({offers.length})</h2>
          {isAuthenticated ? (
            <Link to={`/products/${id}/edit`} className="btn btn-secondary btn-sm">
              Edit offers
            </Link>
          ) : null}
        </div>

        {offers.length === 0 ? (
          <div className="no-comments">No offer</div>
        ) : (
          <div className="comments-list">
            {offers.map((offer) => (
              <div key={offer.id} className="comment-card">
                <div className="comment-header">
                  <h4>
                    {offer.title}
                    {offer.isBuyOneGetOne ||
                    (offer.buyQty >= 1 && offer.getQty >= 1) ||
                    Number(offer.discountPercent) > 0 ? (
                      <span className="stock-offer-bogo-tag">
                        {Number(offer.discountPercent) > 0
                          ? `${offer.discountPercent}% OFF`
                          : offer.buyQty >= 1 && offer.getQty >= 1
                            ? `Buy ${offer.buyQty} Get ${offer.getQty}`
                            : 'Buy 1 Get 1'}
                      </span>
                    ) : null}
                  </h4>
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

export default ProductDetails
