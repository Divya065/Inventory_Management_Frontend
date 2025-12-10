import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { stockService } from '../services/stockService'
import './StockForm.css'

const CreateStock = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    Symbol: '',
    CompanyName: '',
    Purchase: '',
    LastDiv: '',
    Industry: '',
    MarketCap: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
        ...formData,
        Purchase: parseFloat(formData.Purchase),
        LastDiv: parseFloat(formData.LastDiv),
        MarketCap: parseInt(formData.MarketCap),
      }
      const created = await stockService.create(stockData)
      // Navigate to the stocks list instead of details to avoid loading errors
      navigate('/stocks', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create stock. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="stock-form-page">
      <div className="stock-form-header">
        <h1>Create New Stock</h1>
        <button onClick={() => navigate('/stocks')} className="btn btn-secondary">
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
              <label htmlFor="Purchase">Purchase Price *</label>
              <input
                type="number"
                id="Purchase"
                name="Purchase"
                value={formData.Purchase}
                onChange={handleChange}
                required
                step="0.01"
                min="0"
                placeholder="0.00"
              />
            </div>

            <div className="form-group">
              <label htmlFor="LastDiv">Last Dividend *</label>
              <input
                type="number"
                id="LastDiv"
                name="LastDiv"
                value={formData.LastDiv}
                onChange={handleChange}
                required
                step="0.01"
                min="0"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="Industry">Industry *</label>
            <input
              type="text"
              id="Industry"
              name="Industry"
              value={formData.Industry}
              onChange={handleChange}
              required
              placeholder="e.g., Technology"
            />
          </div>

          <div className="form-group">
            <label htmlFor="MarketCap">Market Cap *</label>
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
              {loading ? 'Creating...' : 'Create Stock'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/stocks')}
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

export default CreateStock













