import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { stockService } from '../services/stockService'
import { useCurrency } from '../contexts/CurrencyContext'
import FormValidationBanner from '../components/FormValidationBanner'
import { sanitizeNonNegativeDecimalInput } from '../utils/stockPrice'
import { validateStockForm } from '../utils/stockFormValidation'
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
  const [serverError, setServerError] = useState('')
  const [validationSummary, setValidationSummary] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
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

  const clearErrors = () => {
    setServerError('')
    setValidationSummary('')
    setFieldErrors({})
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
    clearErrors()
  }

  const inputClass = (name) => (fieldErrors[name] ? 'input-invalid' : '')

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearErrors()

    const validation = validateStockForm(formData)
    if (!validation.valid) {
      setValidationSummary(validation.summary)
      setFieldErrors(validation.fieldErrors)
      return
    }

    setLoading(true)

    try {
      const name = String(formData.CompanyName || '').trim()
      const symbol = String(formData.Symbol || '').trim() || generateSku(name)
      const stockData = {
        ...formData,
        Symbol: symbol,
        CompanyName: name,
        Price: convertToInr(parseFloat(formData.Price)),
        Quantity: parseInt(formData.Quantity, 10),
        MarketCap: Math.round(convertToInr(parseFloat(formData.MarketCap))),
      }
      await stockService.create(stockData)
      navigate('/stocks', { replace: true })
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to create item. Please try again.')
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
        <form onSubmit={handleSubmit} className="stock-form" noValidate>
          <FormValidationBanner
            title="Unable to create item"
            message={validationSummary}
            fieldErrors={fieldErrors}
          />
          {serverError ? <div className="form-server-error">{serverError}</div> : null}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="CompanyName">Product Name *</label>
              <input
                type="text"
                id="CompanyName"
                name="CompanyName"
                value={formData.CompanyName}
                onChange={handleChange}
                className={inputClass('CompanyName')}
                aria-invalid={!!fieldErrors.CompanyName}
                autoComplete="off"
                placeholder="e.g., Tim Tam Original Biscuits"
              />
              {fieldErrors.CompanyName ? <span className="field-error">{fieldErrors.CompanyName}</span> : null}
            </div>

            <div className="form-group">
              <label htmlFor="Symbol">SKU / Code (optional)</label>
              <input
                type="text"
                id="Symbol"
                name="Symbol"
                value={formData.Symbol}
                onChange={handleChange}
                autoComplete="off"
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
                className={inputClass('Price')}
                aria-invalid={!!fieldErrors.Price}
                step="0.01"
                min="0.01"
                placeholder="Enter selling price"
              />
              {fieldErrors.Price ? <span className="field-error">{fieldErrors.Price}</span> : null}
            </div>

            <div className="form-group">
              <label htmlFor="Quantity">Quantity *</label>
              <input
                type="number"
                id="Quantity"
                name="Quantity"
                value={formData.Quantity}
                onChange={handleChange}
                className={inputClass('Quantity')}
                aria-invalid={!!fieldErrors.Quantity}
                min="1"
                placeholder="Enter quantity"
              />
              {fieldErrors.Quantity ? <span className="field-error">{fieldErrors.Quantity}</span> : null}
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
              className={inputClass('MarketCap')}
              aria-invalid={!!fieldErrors.MarketCap}
              step="0.01"
              min="0.01"
              placeholder="Enter MRP"
            />
            {fieldErrors.MarketCap ? <span className="field-error">{fieldErrors.MarketCap}</span> : null}
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
