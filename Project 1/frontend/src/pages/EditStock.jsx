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
    Purchase: '',
    LastDiv: '',
    Industry: '',
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
        Purchase: stock.purchase?.toString() || '',
        LastDiv: stock.lastDiv?.toString() || '',
        Industry: stock.industry || '',
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
        Purchase: parseFloat(formData.Purchase),
        LastDiv: parseFloat(formData.LastDiv),
        Industry: formData.Industry,
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
    return <div className="loading">Loading stock...</div>
  }

  return (
    <div className="stock-form-page">
      <div className="stock-form-header">
        <h1>Edit Stock</h1>
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
              {loading ? 'Updating...' : 'Update Stock'}
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








