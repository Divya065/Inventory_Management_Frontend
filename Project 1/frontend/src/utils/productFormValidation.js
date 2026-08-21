import { parseNonNegativeDecimal } from './productPrice'
import { getDateFieldError } from './dateValidation'



/** Keep digits/letters; strip spaces and odd symbols while typing/scanning. */

export function sanitizeBarcodeInput(value) {

  return String(value ?? '').replace(/\s+/g, '').replace(/[^A-Za-z0-9\-_]/g, '')

}



export function normalizeBarcode(value) {

  const code = sanitizeBarcodeInput(value).trim()

  return code || ''

}



export function getBarcodeFieldError(value) {

  const code = normalizeBarcode(value)

  if (!code) return null

  if (code.length < 4) return 'Barcode looks too short.'

  if (code.length > 64) return 'Barcode cannot be over 64 characters.'

  return null

}



export function validateProductForm(formData, { requireSymbol = false } = {}) {

  const fieldErrors = {}



  const brand = String(formData.Brand || '').trim()

  if (!brand) {

    fieldErrors.Brand = 'Company name is required.'

  } else if (brand.length > 120) {

    fieldErrors.Brand = 'Company name cannot be over 120 characters.'

  }



  const name = String(formData.CompanyName || '').trim()

  if (!name) {

    fieldErrors.CompanyName = 'Product name is required.'

  }



  if (requireSymbol) {

    const symbol = String(formData.Symbol || '').trim()

    if (!symbol) {

      fieldErrors.Symbol = 'Internal code is required.'

    }

  }



  const barcodeError = getBarcodeFieldError(formData.Barcode)

  if (barcodeError) {

    fieldErrors.Barcode = barcodeError

  }

  const expiryError = getDateFieldError(formData.ExpiryDate, { required: false })

  if (expiryError) {

    fieldErrors.ExpiryDate = expiryError

  }



  const price = parseNonNegativeDecimal(formData.Price)

  if (String(formData.Price ?? '').trim() === '' || !Number.isFinite(price)) {

    fieldErrors.Price = 'Selling price is required.'

  } else if (price <= 0) {

    fieldErrors.Price = 'Selling price must be greater than 0.'

  }



  const marketCap = parseNonNegativeDecimal(formData.MarketCap)

  if (String(formData.MarketCap ?? '').trim() === '' || !Number.isFinite(marketCap)) {

    fieldErrors.MarketCap = 'Original price (MRP) is required.'

  } else if (marketCap <= 0) {

    fieldErrors.MarketCap = 'Original price (MRP) must be greater than 0.'

  }



  const qtyText = String(formData.Quantity ?? '').trim()

  const qty = parseInt(qtyText, 10)

  if (!qtyText || !Number.isFinite(qty)) {

    fieldErrors.Quantity = 'Quantity is required.'

  } else if (qty < 1) {

    fieldErrors.Quantity = 'Quantity must be at least 1.'

  }



  const valid = Object.keys(fieldErrors).length === 0



  return {

    valid,

    fieldErrors,

    summary: valid ? '' : 'Please fill in all required fields correctly before saving.',

  }

}


