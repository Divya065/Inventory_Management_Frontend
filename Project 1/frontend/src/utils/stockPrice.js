/** Allow digits and one decimal point; block minus and other symbols while typing. */
export function sanitizeNonNegativeDecimalInput(value) {
  let text = String(value ?? '').replace(/[^\d.]/g, '')
  const dotIndex = text.indexOf('.')
  if (dotIndex !== -1) {
    text = `${text.slice(0, dotIndex + 1)}${text.slice(dotIndex + 1).replace(/\./g, '')}`
  }
  return text
}

export function parseNonNegativeDecimal(value) {
  const n = parseFloat(String(value ?? '').trim())
  return Number.isFinite(n) ? n : NaN
}

export function getStockPriceValidationError(priceValue, marketCapValue) {
  const price = parseNonNegativeDecimal(priceValue)
  const marketCap = parseNonNegativeDecimal(marketCapValue)

  if (!Number.isFinite(price)) return 'Price is required.'
  if (price < 0) return 'Price cannot be negative.'
  if (!Number.isFinite(marketCap)) return 'Original price (MRP) is required.'
  if (marketCap < 0) return 'Original price (MRP) cannot be negative.'

  return null
}

export function displayPrice(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return n < 0 ? 0 : n
}
