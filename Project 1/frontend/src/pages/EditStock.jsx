import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { stockService } from '../services/stockService'
import './StockForm.css'

const EditStock = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    Symbol: '',
    CompanyName: '',
    Price: '',
    Quantity: '',
    MarketCap: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStock, setLoadingStock] = useState(true)

  useEffect(() => {
    loadStock()
  }, [id])

  const loadStock = async () => {
    try {
      const stock = await stockService.getById(id)
      setFormData({
        Symbol: stock.symbol || '',
        CompanyName: stock.companyName || '',
        Price: stock.price?.toString() || '',
        Quantity: stock.quantity?.toString() || '',
        MarketCap: stock.marketCap?.toString() || '',
      })
      setError('')
    } catch (err) {
      setError('Failed to load stock')
      console.error(err)
    } finally {
      setLoadingStock(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const stockData = {
        Symbol: formData.Symbol,
        CompanyName: formData.CompanyName,
        Price: parseFloat(formData.Price),
        Quantity: parseInt(formData.Quantity, 10),
        MarketCap: parseInt(formData.MarketCap),
      }
      await stockService.update(id, stockData)
      navigate(`/stocks/${id}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update stock. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loadingStock) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="stock-form-page">
      <div className="stock-form-header">
        <h1>Edit Item</h1>
        <button onClick={() => navigate(`/stocks/${id}`)} className="btn btn-secondary">
          Cancel
        </button>
      </div>

      <div className="stock-form-card">
        <form onSubmit={handleSubmit} className="stock-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="Symbol">Symbol *</label>
              <input
                type="text"
                id="Symbol"
                name="Symbol"
                value={formData.Symbol}
                onChange={handleChange}
                required
                placeholder="e.g., AAPL"
              />
            </div>

            <div className="form-group">
              <label htmlFor="CompanyName">Company Name *</label>
              <input
                type="text"
                id="CompanyName"
                name="CompanyName"
                value={formData.CompanyName}
                onChange={handleChange}
                required
                placeholder="e.g., Apple Inc."
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="Price">Price (₹) *</label>
              <input
                type="number"
                id="Price"
                name="Price"
                value={formData.Price}
                onChange={handleChange}
                required
                step="0.01"
                min="0"
                placeholder="0.00"
              />
            </div>

            <div className="form-group">
              <label htmlFor="Quantity">Quantity *</label>
              <input
                type="number"
                id="Quantity"
                name="Quantity"
                value={formData.Quantity}
                onChange={handleChange}
                required
                min="1"
                placeholder="1"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="MarketCap">Market Price *</label>
            <input
              type="number"
              id="MarketCap"
              name="MarketCap"
              value={formData.MarketCap}
              onChange={handleChange}
              required
              min="0"
              placeholder="e.g., 3000000000000"
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Updating...' : 'Update Item'}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/stocks/${id}`)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditStock








