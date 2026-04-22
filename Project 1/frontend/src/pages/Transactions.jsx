import { useState, useEffect } from 'react'
import { transactionService } from '../services/transactionService'
import CustomerReceiptModal from '../components/CustomerReceiptModal'
import './Transactions.css'

const Transactions = () => {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [clearing, setClearing] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [detail, setDetail] = useState(null)
  const [receiptTransaction, setReceiptTransaction] = useState(null)

  useEffect(() => {
    loadTransactions()
  }, [])

  const loadTransactions = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await transactionService.getAll()
      const all = Array.isArray(data) ? data : []
      // Show only Buy transactions; Loan records stay on the Loan page
      setTransactions(all.filter((t) => String(t.type || '').toLowerCase() === 'buy'))
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load transactions')
      setTransactions([])
      console.error('Error loading transactions:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleClearAll = async () => {
    const ok = window.confirm('Are you sure you want to delete ALL transactions? This cannot be undone.')
    if (!ok) return

    try {
      setClearing(true)
      setError('')
      await transactionService.deleteAll()
      await loadTransactions()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete transactions')
      console.error('Error deleting all transactions:', err)
    } finally {
      setClearing(false)
    }
  }

  const openDetails = async (id) => {
    setSelectedId(id)
    setDetail(null)
    setDetailError('')
    setDetailLoading(true)
    try {
      const data = await transactionService.getById(id)
      setDetail(data)
    } catch (err) {
      setDetailError(err.response?.data?.message || err.message || 'Failed to load transaction details')
      console.error('Error loading transaction details:', err)
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetails = () => {
    setSelectedId(null)
    setDetail(null)
    setDetailError('')
    setDetailLoading(false)
  }

  const handleDeleteOne = async (id) => {
    const ok = window.confirm('Are you sure you want to delete this transaction?')
    if (!ok) return

    try {
      setError('')
      await transactionService.deleteOne(id)
      if (selectedId === id) {
        closeDetails()
      }
      await loadTransactions()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete transaction')
      console.error('Error deleting transaction:', err)
    }
  }

  if (loading) {
    return <div className="transactions-page"><div className="loading">Loading transactions...</div></div>
  }

  return (
    <div className="transactions-page">
      <div className="transactions-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1>Buy Transactions</h1>
            <p className="transactions-subtitle">Purchase history only. For loans by person, see Loan.</p>
          </div>
          <button
            type="button"
            onClick={handleClearAll}
            className="btn btn-danger"
            disabled={clearing}
            title="Delete all your transactions"
          >
            {clearing ? 'Deleting...' : 'Clear All'}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {transactions.length === 0 ? (
        <div className="empty-state">
          <p>No buy transactions yet.</p>
        </div>
      ) : (
        <div className="transactions-table-wrapper">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Customer Name</th>
                <th>Total (₹)</th>
                <th>Payment</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t, index) => (
                <tr
                  key={t.id}
                  className="clickable-row"
                  onClick={() => openDetails(t.id)}
                  title="Click to view details"
                >
                  <td>{index + 1}</td>
                  <td>{t.createdOn ? new Date(t.createdOn).toLocaleString() : 'N/A'}</td>
                  <td>{t.customerName || 'N/A'}</td>
                  <td>₹{t.total != null ? Number(t.total).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : 'N/A'}</td>
                  <td>{t.paymentMethod || '—'}</td>
                  <td>
                    <button
                      type="button"
                      className="transaction-delete-icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteOne(t.id)
                      }}
                      title="Delete transaction"
                      aria-label="Delete transaction"
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

      {selectedId != null && (
        <div className="modal-overlay" onClick={closeDetails}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0 }}>Transaction Details</h3>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {!detailLoading && !detailError && detail && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setReceiptTransaction(detail)
                    }}
                  >
                    Customer receipt
                  </button>
                )}
                <button type="button" className="btn btn-secondary btn-sm" onClick={closeDetails}>
                  Close
                </button>
              </div>
            </div>

            {detailLoading && <div className="loading" style={{ padding: '1rem 0' }}>Loading details...</div>}
            {detailError && <div className="error" style={{ marginTop: '1rem' }}>{detailError}</div>}

            {!detailLoading && !detailError && detail && (
              <div style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem' }}>
                <div><strong>ID:</strong> {detail.id}</div>
                <div><strong>Date:</strong> {detail.createdOn ? new Date(detail.createdOn).toLocaleString() : 'N/A'}</div>
                <div><strong>Customer Name:</strong> {detail.customerName || 'N/A'}</div>
                <div><strong>Total:</strong> ₹{detail.total != null ? Number(detail.total).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : 'N/A'}</div>
                {detail.paymentMethod && (
                  <div>
                    <strong>Payment:</strong> {detail.paymentMethod}
                  </div>
                )}
                {detail.itemsSummary && (
                  <div>
                    <strong>Items (name × quantity):</strong> {detail.itemsSummary}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Transactions
