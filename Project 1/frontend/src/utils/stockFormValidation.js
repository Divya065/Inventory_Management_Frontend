import { parseNonNegativeDecimal } from './stockPrice'

export function validateStockForm(formData, { requireSymbol = false } = {}) {
  const fieldErrors = {}

  const name = String(formData.CompanyName || '').trim()
  if (!name) {
    fieldErrors.CompanyName = 'Product name is required.'
  }

  if (requireSymbol) {
    const symbol = String(formData.Symbol || '').trim()
    if (!symbol) {
      fieldErrors.Symbol = 'SKU / code is required.'
    }
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
