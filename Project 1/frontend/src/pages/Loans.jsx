import { useState, useEffect } from 'react'
import { transactionService } from '../services/transactionService'
import { useCurrency } from '../contexts/CurrencyContext'
import { useAppDialog } from '../hooks/useAppDialog'
import { getOutstandingLoanInr, validateLoanPaymentAmount } from '../utils/loanPayment'
import './Loans.css'

const Loans = () => {
  const { currency, formatMoney, convertToInr, convertFromInr } = useCurrency()
  const { showConfirm, showAlert, AppDialog } = useAppDialog()
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [detailModal, setDetailModal] = useState(null) // { customerName, transactions: [] }
  const [detailLoading, setDetailLoading] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentError, setPaymentError] = useState('')
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)

  useEffect(() => {
    loadLoans()
  }, [])

  const loadLoans = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await transactionService.getLoanSummary()
      setLoans(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load loans')
      setLoans([])
      console.error('Error loading loans:', err)
    } finally {
      setLoading(false)
    }
  }

  const openDetail = async (customerName) => {
    if (!customerName) return
    setDetailLoading(true)
    setDetailModal({ customerName, transactions: [] })
    setPaymentAmount('')
    setPaymentError('')
    try {
      const data = await transactionService.getLoansByCustomer(customerName)
      const list = Array.isArray(data) ? data : []
      setDetailModal({ customerName, transactions: list })
    } catch (err) {
      const msg = err.response?.status === 404
        ? 'Loan history endpoint not found. Make sure the backend is updated and restarted.'
        : (err.response?.data?.message || err.response?.data?.error || err.message)
      setDetailModal({ customerName, transactions: [], error: msg })
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetail = () => {
    setDetailModal(null)
    setPaymentAmount('')
    setPaymentError('')
    loadLoans()
  }

  const handleDeleteLoanEntry = async (id) => {
    const ok = await showConfirm(
      'Delete removes this entry from history only. Inventory / outstanding is not corrected. Use Revert to undo properly.',
      {
        title: 'Delete entry?',
        confirmText: 'Delete',
      }
    )
    if (!ok) return
    try {
      setError('')
      await transactionService.deleteOne(id)
      if (detailModal?.customerName) {
        const data = await transactionService.getLoansByCustomer(detailModal.customerName)
        setDetailModal((prev) => ({ ...prev, transactions: Array.isArray(data) ? data : [] }))
      }
      await loadLoans()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete entry')
      console.error('Error deleting loan entry:', err)
    }
  }

  const handleRevertLoanEntry = async (id, type) => {
    const isPayment = String(type || '').toLowerCase() === 'loanpayment'
    const ok = await showConfirm(
      isPayment
        ? 'Revert payment removes this payment so the outstanding loan increases again.'
        : 'Revert loan puts items back into inventory and removes this loan record.',
      {
        title: isPayment ? 'Revert payment?' : 'Revert loan?',
        confirmText: 'Revert',
      }
    )
    if (!ok) return
    try {
      setError('')
      const result = await transactionService.revert(id)
      if (detailModal?.customerName) {
        const data = await transactionService.getLoansByCustomer(detailModal.customerName)
        setDetailModal((prev) => ({ ...prev, transactions: Array.isArray(data) ? data : [] }))
      }
      await loadLoans()
      await showAlert(result?.message || 'Reverted successfully.', { variant: 'success' })
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to revert'
      setError(msg)
      await showAlert(msg, { variant: 'error' })
      console.error('Error reverting loan entry:', err)
    }
  }

  const handleDeleteCustomerLoans = async (customerName) => {
    const ok = await showConfirm(
      `Delete all loan and payment records for "${customerName}"? This cannot be undone.`,
      { title: 'Delete all records', confirmText: 'Delete all' }
    )
    if (!ok) return
    try {
      setError('')
      await transactionService.deleteAllLoansForCustomer(customerName)
      if (detailModal?.customerName && detailModal.customerName === customerName) {
        setDetailModal(null)
      }
      await loadLoans()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete')
      console.error('Error deleting customer loans:', err)
    }
  }

  const handleRecordPayment = async (e) => {
    e.preventDefault()
    if (!detailModal?.customerName) return

    const outstandingInr = getOutstandingLoanInr(detailModal.transactions)
    const validationError = validateLoanPaymentAmount(
      paymentAmount,
      outstandingInr,
      convertToInr,
      formatMoney
    )
    if (validationError) {
      setPaymentError(validationError)
      return
    }

    const amount = parseFloat(paymentAmount)
    setPaymentSubmitting(true)
    setPaymentError('')
    try {
      await transactionService.create({
        customerName: detailModal.customerName,
        total: convertToInr(amount),
        type: 'LoanPayment'
      })
      setPaymentAmount('')
      const data = await transactionService.getLoansByCustomer(detailModal.customerName)
      setDetailModal(prev => ({ ...prev, transactions: Array.isArray(data) ? data : [] }))
      loadLoans()
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to record payment'
      setPaymentError(msg)
    } finally {
      setPaymentSubmitting(false)
    }
  }

  const outstandingInr = detailModal?.transactions
    ? getOutstandingLoanInr(detailModal.transactions)
    : 0
  const maxPaymentDisplay =
    outstandingInr > 0
      ? Math.round(convertFromInr(outstandingInr) * 100) / 100
      : undefined

  if (loading) {
    return (
      <div className="loans-page page">
        <div className="loading">Loading loans...</div>
      </div>
    )
  }

  return (
    <div className="loans-page page">
      <AppDialog />
      <div className="loans-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1>Loans by Person</h1>
            <p className="loans-subtitle">Click a row to see each time they took a loan or made a payment. Total = loans taken − payments.</p>
          </div>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {loans.length === 0 ? (
        <div className="empty-state">
          <p>No loans recorded yet.</p>
        </div>
      ) : (
        <div className="transactions-table-wrapper">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Customer Name</th>
                <th>Total Loan ({currency})</th>
                <th>Status</th>
                <th># of Entries</th>
                <th>Last Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loans.map((row, index) => (
                <tr
                  key={row.customerName || index}
                  className="clickable-row"
                  onClick={() => openDetail(row.customerName)}
                >
                  <td>{index + 1}</td>
                  <td>{row.customerName || 'N/A'}</td>
                  <td className="total-cell">{formatMoney(row.totalLoan)}</td>
                  <td>
                    <span className={`loan-status-badge ${(row.status || '').toLowerCase()}`}>
                      {row.status || 'Pending'}
                    </span>
                  </td>
                  <td>{row.transactionCount ?? 0}</td>
                  <td>{row.lastLoanDate ? new Date(row.lastLoanDate).toLocaleString() : 'N/A'}</td>
                  <td>
                    <button
                      type="button"
                      className="transaction-delete-icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteCustomerLoans(row.customerName)
                      }}
                      title="Delete all loans for this customer"
                      aria-label="Delete all loans for this customer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detailModal && (
        <div className="modal-overlay" onClick={closeDetail}>
          <div className="modal-box modal-box--wide" onClick={(e) => e.stopPropagation()}>
            <div className="loan-detail-header">
              <h3>Loan history — {detailModal.customerName}</h3>
              <button type="button" className="loan-detail-close" onClick={closeDetail} aria-label="Close">×</button>
            </div>
            {detailLoading ? (
              <div className="loan-detail-loading">Loading...</div>
            ) : detailModal.error ? (
              <div className="loan-detail-error-wrap">
                <div className="loan-detail-error">{detailModal.error}</div>
                <button type="button" className="btn btn-primary" onClick={() => openDetail(detailModal.customerName)}>
                  Retry
                </button>
              </div>
            ) : (
              <>
                <div className="loan-detail-table-wrap">
                  <table className="loan-detail-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Amount ({currency})</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailModal.transactions.length === 0 ? (
                        <tr><td colSpan={4} className="loan-detail-empty">No loan or payment entries for this customer yet.</td></tr>
                      ) : (
                        detailModal.transactions.map((t) => (
                          <tr key={t.id}>
                            <td>{t.createdOn ? new Date(t.createdOn).toLocaleString() : 'N/A'}</td>
                            <td>
                              <span className={`loan-detail-type ${(t.type || '').toLowerCase()}`}>
                                {t.type === 'LoanPayment' ? 'Payment' : 'Loan'}
                              </span>
                            </td>
                            <td className={t.type === 'LoanPayment' ? 'loan-detail-payment' : ''}>
                              {t.type === 'LoanPayment' ? '−' : ''}{formatMoney(t.total)}
                            </td>
                            <td>
                              <div className="transaction-row-actions">
                                {t.canRevert ? (
                                  <button
                                    type="button"
                                    className="transaction-revert-btn"
                                    onClick={() => handleRevertLoanEntry(t.id, t.type)}
                                    title={
                                      String(t.type || '').toLowerCase() === 'loanpayment'
                                        ? 'Revert payment'
                                        : 'Revert loan — restore stock'
                                    }
                                  >
                                    Revert
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  className="transaction-delete-icon"
                                  onClick={() => handleDeleteLoanEntry(t.id)}
                                  title="Delete history only"
                                  aria-label="Delete this entry"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    <line x1="10" y1="11" x2="10" y2="17" />
                                    <line x1="14" y1="11" x2="14" y2="17" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="loan-detail-record-payment">
                  <h4>Record payment</h4>
                  <p className="loan-outstanding-text">
                    Outstanding loan: <strong>{formatMoney(outstandingInr)}</strong>
                  </p>
                  {paymentError ? (
                    <div className="loan-payment-error" role="alert">
                      {paymentError}
                    </div>
                  ) : null}
                  <form onSubmit={handleRecordPayment} noValidate>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={maxPaymentDisplay}
                      placeholder={`Amount (${currency})`}
                      value={paymentAmount}
                      onChange={(e) => {
                        setPaymentAmount(e.target.value)
                        setPaymentError('')
                      }}
                      className={`loan-payment-input${paymentError ? ' loan-payment-input--invalid' : ''}`}
                      aria-invalid={!!paymentError}
                      disabled={outstandingInr <= 0}
                    />
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={paymentSubmitting || outstandingInr <= 0}
                    >
                      {paymentSubmitting ? 'Saving...' : 'Record payment'}
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Loans
