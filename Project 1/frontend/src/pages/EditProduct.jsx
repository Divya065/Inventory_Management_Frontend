import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { productService } from '../services/productService'
import { useCurrency } from '../contexts/CurrencyContext'
import FormValidationBanner from '../components/FormValidationBanner'
import ProductOfferEditor from '../components/ProductOfferEditor'
import { sanitizeNonNegativeDecimalInput } from '../utils/productPrice'
import { normalizeBarcode, sanitizeBarcodeInput, validateProductForm } from '../utils/productFormValidation'
import { getDateFieldError } from '../utils/dateValidation'
import './ProductForm.css'

const formatForInput = (n, digits = 2) => {
  const v = Number(n)
  if (!Number.isFinite(v)) return ''
  const rounded = Math.round(v * 10 ** digits) / 10 ** digits
  return String(rounded)
}

const EditProduct = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currency, convertFromInr, convertToInr } = useCurrency()
  const [formData, setFormData] = useState({
    Symbol: '',
    Brand: '',
    CompanyName: '',
    Barcode: '',
    Price: '',
    Quantity: '',
    MarketCap: '',
    ExpiryDate: '',
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
      const stock = await productService.getById(id)
      setFormData({
        Symbol: stock.symbol || '',
        Brand: stock.brand || '',
        CompanyName: stock.companyName || '',
        Barcode: stock.barcode || '',
        Price: formatForInput(convertFromInr(stock.price), 2),
        Quantity: stock.quantity?.toString() || '',
        MarketCap: formatForInput(convertFromInr(stock.marketCap), 2),
        ExpiryDate: stock.expiryDate ? String(stock.expiryDate).slice(0, 10) : '',
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
    let nextValue = value
    if (name === 'Price' || name === 'MarketCap') {
      nextValue = sanitizeNonNegativeDecimalInput(value)
    } else if (name === 'Barcode') {
      nextValue = sanitizeBarcodeInput(value)
    }
    setFormData({
      ...formData,
      [name]: nextValue,
    })
    if (name === 'ExpiryDate') {
      const expiryError = getDateFieldError(nextValue, { required: false })
      setFieldErrors((prev) => {
        const next = { ...prev }
        if (expiryError) next.ExpiryDate = expiryError
        else delete next.ExpiryDate
        return next
      })
      setValidationSummary('')
      return
    }
    clearErrors()
  }

  const inputClass = (name) => (fieldErrors[name] ? 'input-invalid' : '')

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearErrors()

    const validation = validateProductForm(formData)
    if (!validation.valid) {
      setValidationSummary(validation.summary)
      setFieldErrors(validation.fieldErrors)
      return
    }

    setLoading(true)

    try {
      const stockData = {
        Symbol: String(formData.Symbol || '').trim(),
        Brand: String(formData.Brand || '').trim(),
        CompanyName: formData.CompanyName.trim(),
        Barcode: normalizeBarcode(formData.Barcode) || null,
        Price: convertToInr(parseFloat(formData.Price)),
        Quantity: parseInt(formData.Quantity, 10),
        MarketCap: Math.round(convertToInr(parseFloat(formData.MarketCap))),
        ExpiryDate: formData.ExpiryDate ? formData.ExpiryDate : null,
      }
      await productService.update(id, stockData)
      navigate(`/products/${id}`)
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
        <button onClick={() => navigate(`/products/${id}`)} className="btn btn-secondary">
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
              <label htmlFor="Brand">Company name *</label>
              <input
                type="text"
                id="Brand"
                name="Brand"
                value={formData.Brand}
                onChange={handleChange}
                className={inputClass('Brand')}
                aria-invalid={!!fieldErrors.Brand}
                autoComplete="off"
                placeholder="e.g. Nestlé"
                maxLength={120}
              />
              {fieldErrors.Brand ? <span className="field-error">{fieldErrors.Brand}</span> : null}
              <span className="field-hint">
                Search &quot;Nestlé&quot; to find Maggi, Nescafé, and all other Nestlé products.
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="CompanyName">Product name *</label>
              <input
                type="text"
                id="CompanyName"
                name="CompanyName"
                value={formData.CompanyName}
                onChange={handleChange}
                className={inputClass('CompanyName')}
                aria-invalid={!!fieldErrors.CompanyName}
                autoComplete="off"
                placeholder="e.g. Maggi 70g"
              />
              {fieldErrors.CompanyName ? <span className="field-error">{fieldErrors.CompanyName}</span> : null}
              <span className="field-hint">Only the product — company goes in the field above.</span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="Barcode">Barcode (optional)</label>
            <input
              type="text"
              id="Barcode"
              name="Barcode"
              value={formData.Barcode}
              onChange={handleChange}
              className={inputClass('Barcode')}
              aria-invalid={!!fieldErrors.Barcode}
              autoComplete="off"
              placeholder="Scan packet barcode here"
              maxLength={64}
            />
            {fieldErrors.Barcode ? <span className="field-error">{fieldErrors.Barcode}</span> : null}
            <span className="field-hint">USB scanner: click field, then scan the packet.</span>
          </div>

          <div className="form-group">
            <label htmlFor="ExpiryDate">Expiry date (optional)</label>
            <input
              type="date"
              id="ExpiryDate"
              name="ExpiryDate"
              value={formData.ExpiryDate}
              onChange={handleChange}
              min="2000-01-01"
              max="2100-12-31"
              className={inputClass('ExpiryDate')}
              aria-invalid={!!fieldErrors.ExpiryDate}
            />
            {fieldErrors.ExpiryDate ? <span className="field-error">{fieldErrors.ExpiryDate}</span> : null}
            <span className="field-hint">Status New / Old updates automatically from this date.</span>
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

          <ProductOfferEditor
            mode="remote"
            stockId={id}
            marketCap={formData.MarketCap}
            onApplyDiscountedPrice={(price) => {
              setFormData((prev) => ({ ...prev, Price: price }))
              clearErrors()
            }}
          />

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Updating...' : 'Update Item'}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/products/${id}`)}
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

export default EditProduct
