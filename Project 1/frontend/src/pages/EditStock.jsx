import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { stockService } from '../services/stockService'
import { useCurrency } from '../contexts/CurrencyContext'
import FormValidationBanner from '../components/FormValidationBanner'
import { sanitizeNonNegativeDecimalInput } from '../utils/stockPrice'
import { validateStockForm } from '../utils/stockFormValidation'
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
  const [serverError, setServerError] = useState('')
  const [validationSummary, setValidationSummary] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
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
        Price: formatForInput(convertFromInr(stock.price), 2),
        Quantity: stock.quantity?.toString() || '',
        MarketCap: formatForInput(convertFromInr(stock.marketCap), 2),
      })
      setServerError('')
      setValidationSummary('')
      setFieldErrors({})
    } catch (err) {
      setServerError('Failed to load item details.')
      console.error(err)
    } finally {
      setLoadingStock(false)
    }
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

    const validation = validateStockForm(formData, { requireSymbol: true })
    if (!validation.valid) {
      setValidationSummary(validation.summary)
      setFieldErrors(validation.fieldErrors)
      return
    }

    setLoading(true)

    try {
      const stockData = {
        Symbol: formData.Symbol.trim(),
        CompanyName: formData.CompanyName.trim(),
        Price: convertToInr(parseFloat(formData.Price)),
        Quantity: parseInt(formData.Quantity, 10),
        MarketCap: Math.round(convertToInr(parseFloat(formData.MarketCap))),
      }
      await stockService.update(id, stockData)
      navigate(`/stocks/${id}`)
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to update item. Please try again.')
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
        <form onSubmit={handleSubmit} className="stock-form" noValidate>
          <FormValidationBanner
            title="Unable to save changes"
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
                placeholder="Product name"
              />
              {fieldErrors.CompanyName ? <span className="field-error">{fieldErrors.CompanyName}</span> : null}
            </div>

            <div className="form-group">
              <label htmlFor="Symbol">SKU / Code *</label>
              <input
                type="text"
                id="Symbol"
                name="Symbol"
                value={formData.Symbol}
                onChange={handleChange}
                className={inputClass('Symbol')}
                aria-invalid={!!fieldErrors.Symbol}
                autoComplete="off"
                placeholder="e.g., AU002"
              />
              {fieldErrors.Symbol ? <span className="field-error">{fieldErrors.Symbol}</span> : null}
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
