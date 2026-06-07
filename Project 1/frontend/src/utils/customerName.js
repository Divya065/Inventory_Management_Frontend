export const CUSTOMER_NAME_PATTERN = /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/

/** Strip digits and symbols while typing; keep letters and spaces only. */
export function sanitizeCustomerNameInput(value) {
  return String(value ?? '').replace(/[^A-Za-z\s]/g, '')
}

export function normalizeCustomerName(value) {
  return sanitizeCustomerNameInput(value).trim().replace(/\s+/g, ' ')
}

export function getCustomerNameError(value) {
  const name = normalizeCustomerName(value)
  if (!name) return 'Please enter customer name'
  if (!CUSTOMER_NAME_PATTERN.test(name)) {
    return 'Name must contain only letters (A–Z). Spaces between words are allowed.'
  }
  return null
}

export function isValidCustomerName(value) {
  return getCustomerNameError(value) === null
}
