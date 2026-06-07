import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { stockService } from '../services/stockService'
import { useCurrency } from '../contexts/CurrencyContext'
import {
  getStockPriceValidationError,
  sanitizeNonNegativeDecimalInput,
} from '../utils/stockPrice'
import './StockForm.css'

const CreateStock = () => {
  const navigate = useNavigate()
  const { currency, convertToInr } = useCurrency()
  const [formData, setFormData] = useState({
    Symbol: '',
    CompanyName: '',
    Price: '',
    Quantity: '',
    MarketCap: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const generateSku = (name) => {
    const base = String(name || '')
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .map((w) => w.slice(0, 3))
      .join('')
      .slice(0, 6) || 'PRD'
    const suffix = String(Date.now()).slice(-4)
    return `${base}${suffix}`
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    const nextValue =
      name === 'Price' || name === 'MarketCap'
        ? sanitizeNonNegativeDecimalInput(value)
        : value
    setFormData({
      ...formData,
      [name]: nextValue,
    })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const name = String(formData.CompanyName || '').trim()
      if (!name) {
        setError('Product name is required.')
        setLoading(false)
        return
      }

      const priceError = getStockPriceValidationError(formData.Price, formData.MarketCap)
      if (priceError) {
        setError(priceError)
        setLoading(false)
        return
      }

      const symbol = String(formData.Symbol || '').trim() || generateSku(name)
      const stockData = {
        ...formData,
        Symbol: symbol,
        // User enters selected currency; backend stores INR base
        Price: convertToInr(parseFloat(formData.Price)),
        Quantity: parseInt(formData.Quantity, 10),
        MarketCap: Math.round(convertToInr(parseFloat(formData.MarketCap))),
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
        <h1>Create New Item</h1>
        <button onClick={() => navigate('/stocks')} className="btn btn-secondary">
          Cancel
        </button>
      </div>

      <div className="stock-form-card">
        <form onSubmit={handleSubmit} className="stock-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="CompanyName">Product Name *</label>
              <input
                type="text"
                id="CompanyName"
                name="CompanyName"
                value={formData.CompanyName}
                onChange={handleChange}
                required
                placeholder="e.g., Tim Tam Original Biscuits"
              />
            </div>

            <div className="form-group">
              <label htmlFor="Symbol">SKU / Code (optional)</label>
              <input
                type="text"
                id="Symbol"
                name="Symbol"
                value={formData.Symbol}
                onChange={handleChange}
                placeholder="Auto-generated if empty"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="Price">Price ({currency}) *</label>
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
            <label htmlFor="MarketCap">Original price (MRP) ({currency}) *</label>
            <input
              type="number"
              id="MarketCap"
              name="MarketCap"
              value={formData.MarketCap}
              onChange={handleChange}
              required
              step="0.01"
              min="0"
              placeholder="0.00"
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Item'}
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













