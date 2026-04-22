import { useState, useEffect } from 'react'
import { transactionService } from '../services/transactionService'
import './Loans.css'

const Loans = () => {
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [clearing, setClearing] = useState(false)
  const [detailModal, setDetailModal] = useState(null) // { customerName, transactions: [] }
  const [detailLoading, setDetailLoading] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
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
    loadLoans()
  }

  const handleClearAllLoans = async () => {
    const ok = window.confirm('Are you sure you want to delete ALL loan and payment records? This cannot be undone.')
    if (!ok) return
    try {
      setClearing(true)
      setError('')
      await transactionService.deleteAllLoans()
      setDetailModal(null)
      await loadLoans()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete loan records')
      console.error('Error deleting all loans:', err)
    } finally {
      setClearing(false)
    }
  }

  const handleDeleteLoanEntry = async (id) => {
    const ok = window.confirm('Delete this loan/payment entry?')
    if (!ok) return
    try {
      setError('')
      await transactionService.deleteOne(id)
      if (detailModal?.customerName) {
        const data = await transactionService.getLoansByCustomer(detailModal.customerName)
        setDetailModal(prev => ({ ...prev, transactions: Array.isArray(data) ? data : [] }))
      }
      await loadLoans()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete entry')
      console.error('Error deleting loan entry:', err)
    }
  }

  const handleDeleteCustomerLoans = async (customerName) => {
    const ok = window.confirm(`Delete all loan and payment records for "${customerName}"? This cannot be undone.`)
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
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount greater than 0')
      return
    }
    setPaymentSubmitting(true)
    try {
      await transactionService.create({
        customerName: detailModal.customerName,
        total: amount,
        type: 'LoanPayment'
      })
      setPaymentAmount('')
      const data = await transactionService.getLoansByCustomer(detailModal.customerName)
      setDetailModal(prev => ({ ...prev, transactions: Array.isArray(data) ? data : [] }))
      loadLoans()
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to record payment')
    } finally {
      setPaymentSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="loans-page">
        <div className="loading">Loading loans...</div>
      </div>
    )
  }

  return (
    <div className="loans-page">
      <div className="loans-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1>Loans by Person</h1>
            <p className="loans-subtitle">Click a row to see each time they took a loan or made a payment. Total = loans taken − payments.</p>
          </div>
          {loans.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllLoans}
              className="btn btn-danger"
              disabled={clearing}
              title="Delete all loan and payment records"
            >
              {clearing ? 'Deleting...' : 'Clear All'}
            </button>
          )}
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {loans.length === 0 ? (
        <div className="empty-state">
          <p>No loans recorded yet.</p>
        </div>
      ) : (
        <div className="loans-table-wrapper">
          <table className="loans-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Customer Name</th>
                <th>Total Loan (₹)</th>
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
                  className="loans-row-clickable"
                  onClick={() => openDetail(row.customerName)}
                >
                  <td>{index + 1}</td>
                  <td>{row.customerName || 'N/A'}</td>
                  <td className="total-cell">₹{row.totalLoan != null ? Number(row.totalLoan).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : 'N/A'}</td>
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
                      className="loan-delete-icon"
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
        <div className="loan-detail-overlay" onClick={closeDetail}>
          <div className="loan-detail-modal" onClick={e => e.stopPropagation()}>
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
                        <th>Amount (₹)</th>
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
                              {t.type === 'LoanPayment' ? '−' : ''}₹{t.total != null ? Number(t.total).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : 'N/A'}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="loan-delete-icon"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteLoanEntry(t.id)
                                }}
                                title="Delete this entry"
                                aria-label="Delete this entry"
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
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="loan-detail-record-payment">
                  <h4>Record payment</h4>
                  <form onSubmit={handleRecordPayment}>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="Amount (₹)"
                      value={paymentAmount}
                      onChange={e => setPaymentAmount(e.target.value)}
                      className="loan-payment-input"
                    />
                    <button type="submit" className="btn btn-primary" disabled={paymentSubmitting}>
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
