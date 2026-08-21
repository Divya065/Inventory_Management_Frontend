import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { productService } from '../services/productService'
import { offerService } from '../services/offerService'
import { useCurrency } from '../contexts/CurrencyContext'
import FormValidationBanner from '../components/FormValidationBanner'
import ProductOfferEditor from '../components/ProductOfferEditor'
import { sanitizeNonNegativeDecimalInput } from '../utils/productPrice'
import { normalizeBarcode, sanitizeBarcodeInput, validateProductForm } from '../utils/productFormValidation'
import { getDateFieldError } from '../utils/dateValidation'
import './ProductForm.css'

const CreateProduct = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { currency, convertToInr } = useCurrency()
  const [formData, setFormData] = useState({
    Symbol: '',
    Brand: '',
    CompanyName: '',
    Barcode: sanitizeBarcodeInput(searchParams.get('barcode') || ''),
    Price: '',
    Quantity: '',
    MarketCap: '',
    ExpiryDate: '',
  })
  const [serverError, setServerError] = useState('')
  const [validationSummary, setValidationSummary] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [offerDrafts, setOfferDrafts] = useState([])

  useEffect(() => {
    const fromQuery = sanitizeBarcodeInput(searchParams.get('barcode') || '')
    if (!fromQuery) return
    setFormData((prev) => (prev.Barcode === fromQuery ? prev : { ...prev, Barcode: fromQuery }))
  }, [searchParams])

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
      const brand = String(formData.Brand || '').trim()
      const name = String(formData.CompanyName || '').trim()
      const symbol = generateSku(name)
      const barcode = normalizeBarcode(formData.Barcode)
      const stockData = {
        Symbol: symbol,
        Brand: brand,
        CompanyName: name,
        Barcode: barcode || null,
        Price: convertToInr(parseFloat(formData.Price)),
        Quantity: parseInt(formData.Quantity, 10),
        MarketCap: Math.round(convertToInr(parseFloat(formData.MarketCap))),
        ExpiryDate: formData.ExpiryDate ? formData.ExpiryDate : null,
      }
      const created = await productService.create(stockData)
      const newId = created?.id
      if (newId && offerDrafts.length > 0) {
        for (const offer of offerDrafts) {
          try {
            await offerService.create(newId, {
              title: offer.title,
              content: offer.content,
              buyQty: Number(offer.buyQty) || 0,
              getQty: Number(offer.getQty) || 0,
              discountPercent: Number(offer.discountPercent) || 0,
              isBuyOneGetOne:
                !!offer.isBuyOneGetOne ||
                (Number(offer.buyQty) === 1 && Number(offer.getQty) === 1),
            })
          } catch (offerErr) {
            console.error('Offer create failed after item create', offerErr)
          }
        }
      }
      navigate('/products', { replace: true })
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
        <button onClick={() => navigate('/products')} className="btn btn-secondary">
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
            mode="local"
            value={offerDrafts}
            onChange={setOfferDrafts}
            marketCap={formData.MarketCap}
            onApplyDiscountedPrice={(price) => {
              setFormData((prev) => ({ ...prev, Price: price }))
              clearErrors()
            }}
          />

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Item'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/products')}
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

export default CreateProduct
