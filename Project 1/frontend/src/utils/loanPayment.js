export function getOutstandingLoanInr(transactions) {
  if (!Array.isArray(transactions)) return 0

  return transactions.reduce((balance, t) => {
    const total = Number(t.total) || 0
    const type = String(t.type || '').toLowerCase()
    if (type === 'loanpayment') return balance - total
    if (type === 'loan') return balance + total
    return balance
  }, 0)
}

export function validateLoanPaymentAmount(amountText, outstandingInr, convertToInr, formatMoney) {
  const trimmed = String(amountText ?? '').trim()
  if (!trimmed) {
    return 'Payment amount is required.'
  }

  const amount = parseFloat(trimmed)
  if (!Number.isFinite(amount) || amount <= 0) {
    return 'Payment amount must be greater than 0.'
  }

  if (outstandingInr <= 0) {
    return 'This customer has no outstanding loan to pay.'
  }

  const paymentInr = convertToInr(amount)
  if (paymentInr > outstandingInr + 0.005) {
    return `Payment cannot exceed outstanding loan of ${formatMoney(outstandingInr)}.`
  }

  return null
}
