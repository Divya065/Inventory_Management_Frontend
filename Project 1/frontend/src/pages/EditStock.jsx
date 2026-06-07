import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { stockService } from '../services/stockService'
import { useCurrency } from '../contexts/CurrencyContext'
import {
  getStockPriceValidationError,
  sanitizeNonNegativeDecimalInput,
} from '../utils/stockPrice'
import './StockForm.css'

const formatForInput = (n, digits = 2) => {
  const v = Number(n)
  if (!Number.isFinite(v)) return ''
  const rounded = Math.round(v * 10 ** digits) / 10 ** digits
  return String(rounded)
}

const EditStock = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currency, convertFromInr, convertToInr } = useCurrency()
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
        // Convert INR base -> selected currency for editing
        Price: formatForInput(convertFromInr(stock.price), 2),
        Quantity: stock.quantity?.toString() || '',
        MarketCap: formatForInput(convertFromInr(stock.marketCap), 2),
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
      const priceError = getStockPriceValidationError(formData.Price, formData.MarketCap)
      if (priceError) {
        setError(priceError)
        setLoading(false)
        return
      }

      const stockData = {
        Symbol: formData.Symbol,
        CompanyName: formData.CompanyName,
        Price: convertToInr(parseFloat(formData.Price)),
        Quantity: parseInt(formData.Quantity, 10),
        MarketCap: Math.round(convertToInr(parseFloat(formData.MarketCap))),
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
              <label htmlFor="CompanyName">Product Name *</label>
              <input
                type="text"
                id="CompanyName"
                name="CompanyName"
                value={formData.CompanyName}
                onChange={handleChange}
                required
                placeholder="Product name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="Symbol">SKU / Code</label>
              <input
                type="text"
                id="Symbol"
                name="Symbol"
                value={formData.Symbol}
                onChange={handleChange}
                required
                placeholder="e.g., AU002"
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








