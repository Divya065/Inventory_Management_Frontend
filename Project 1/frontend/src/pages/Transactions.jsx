import { useState, useEffect, useCallback } from 'react'
import { transactionService } from '../services/transactionService'
import CustomerReceiptModal from '../components/CustomerReceiptModal'
import { useCurrency } from '../contexts/CurrencyContext'
import { useAppDialog } from '../hooks/useAppDialog'
import { getDateFieldError, isValidYmd } from '../utils/dateValidation'
import './Transactions.css'

const PAGE_SIZE = 10

const formatLocalYmd = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const Transactions = () => {
  const { currency, formatMoney } = useCurrency()
  const { showConfirm, showAlert, AppDialog } = useAppDialog()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [detail, setDetail] = useState(null)
  const [receiptTransaction, setReceiptTransaction] = useState(null)

  const [filterMode, setFilterMode] = useState('today') // 'today' | 'range'
  const [rangeStart, setRangeStart] = useState(() => formatLocalYmd(new Date()))
  const [rangeStartError, setRangeStartError] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      let range
      if (filterMode === 'today') {
        range = transactionService.todayRangeParams()
      } else {
        const dateErr = getDateFieldError(rangeStart, { required: true })
        if (dateErr) {
          setRangeStartError(dateErr)
          setError(dateErr)
          setTransactions([])
          setTotalCount(0)
          return
        }
        setRangeStartError('')
        range = transactionService.thirtyDayRangeParams(rangeStart)
        if (!range) {
          setRangeStartError('Invalid date')
          setError('Invalid date')
          setTransactions([])
          setTotalCount(0)
          return
        }
      }

      const data = await transactionService.getPaged({
        type: 'Buy',
        from: range.from,
        to: range.to,
        page,
        pageSize: PAGE_SIZE,
      })

      const items = Array.isArray(data?.items) ? data.items : []
      setTransactions(items)
      setTotalCount(Number(data?.totalCount) || 0)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load transactions')
      setTransactions([])
      setTotalCount(0)
      console.error('Error loading transactions:', err)
    } finally {
      setLoading(false)
    }
  }, [filterMode, rangeStart, page])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  const selectToday = () => {
    setFilterMode('today')
    setPage(1)
  }

  const selectRangeMode = () => {
    setFilterMode('range')
    setPage(1)
  }

  const onRangeStartChange = (e) => {
    const value = e.target.value
    setRangeStart(value)
    setPage(1)
    setRangeStartError(getDateFieldError(value, { required: true }) || '')
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const rangeEndLabel = (() => {
    if (filterMode !== 'range' || !isValidYmd(rangeStart)) return ''
    const start = new Date(`${rangeStart}T00:00:00`)
    if (Number.isNaN(start.getTime())) return ''
    const end = new Date(start)
    end.setDate(end.getDate() + 29) // inclusive display of 30-day window
    return end.toLocaleDateString()
  })()

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
    const ok = await showConfirm(
      'Delete removes this record from history only. Inventory is not changed. Use Revert if you want stock put back.',
      {
        title: 'Delete transaction?',
        confirmText: 'Delete',
      }
    )
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

  const handleRevertOne = async (id) => {
    const ok = await showConfirm(
      'Revert puts sold items back into inventory and removes this transaction.',
      {
        title: 'Revert sale?',
        confirmText: 'Revert',
      }
    )
    if (!ok) return

    try {
      setError('')
      const result = await transactionService.revert(id)
      if (selectedId === id) {
        closeDetails()
      }
      await loadTransactions()
      await showAlert(result?.message || 'Sale reverted. Stock restored.', { variant: 'success' })
    } catch (err) {
      const msg =
        err.response?.data?.message || err.message || 'Failed to revert transaction'
      setError(msg)
      await showAlert(msg, { variant: 'error' })
      console.error('Error reverting transaction:', err)
    }
  }

  return (
    <div className="transactions-page page">
      <AppDialog />
      {receiptTransaction ? (
        <CustomerReceiptModal
          transaction={receiptTransaction}
          onClose={() => setReceiptTransaction(null)}
        />
      ) : null}

      <div className="transactions-header">
        <div>
          <h1>Buy Transactions</h1>
          <p className="transactions-subtitle">
            Purchase history only. For loans by person, see Loan.
          </p>
        </div>
      </div>

      <div className="transactions-filters">
        <div className="transactions-filter-tabs" role="tablist" aria-label="Date filter">
          <button
            type="button"
            role="tab"
            aria-selected={filterMode === 'today'}
            className={`transactions-filter-tab${filterMode === 'today' ? ' is-active' : ''}`}
            onClick={selectToday}
          >
            Today
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filterMode === 'range'}
            className={`transactions-filter-tab${filterMode === 'range' ? ' is-active' : ''}`}
            onClick={selectRangeMode}
          >
            30 days
          </button>
        </div>

        {filterMode === 'range' ? (
          <div className="transactions-range-picker">
            <label htmlFor="tx-range-start">From date</label>
            <input
              id="tx-range-start"
              type="date"
              value={rangeStart}
              min="2000-01-01"
              max="2100-12-31"
              aria-invalid={!!rangeStartError}
              className={rangeStartError ? 'input-invalid' : undefined}
              onChange={onRangeStartChange}
              onBlur={(e) =>
                setRangeStartError(getDateFieldError(e.target.value, { required: true }) || '')
              }
            />
            {rangeStartError ? (
              <span className="field-error" role="alert">
                {rangeStartError}
              </span>
            ) : rangeEndLabel ? (
              <span className="transactions-range-hint">
                Showing {new Date(`${rangeStart}T00:00:00`).toLocaleDateString()} → {rangeEndLabel}{' '}
                (30 days)
              </span>
            ) : null}
          </div>
        ) : (
          <p className="transactions-range-hint">Showing all purchases from today</p>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="loading">Loading transactions...</div>
      ) : transactions.length === 0 ? (
        <div className="empty-state">
          <p>
            {filterMode === 'today'
              ? 'No buy transactions today.'
              : 'No buy transactions in this 30-day window.'}
          </p>
        </div>
      ) : (
        <>
          <div className="transactions-table-wrapper">
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Customer Name</th>
                  <th>Total ({currency})</th>
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
                    <td>{(page - 1) * PAGE_SIZE + index + 1}</td>
                    <td>{t.createdOn ? new Date(t.createdOn).toLocaleString() : 'N/A'}</td>
                    <td>{t.customerName || 'N/A'}</td>
                    <td>{formatMoney(t.total)}</td>
                    <td>{t.paymentMethod || '—'}</td>
                    <td>
                      <div className="transaction-row-actions" onClick={(e) => e.stopPropagation()}>
                        {t.canRevert ? (
                          <button
                            type="button"
                            className="transaction-revert-btn"
                            onClick={() => handleRevertOne(t.id)}
                            title="Revert — restore stock and remove record"
                          >
                            Revert
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="transaction-delete-icon"
                          onClick={() => handleDeleteOne(t.id)}
                          title="Delete history only (stock unchanged)"
                          aria-label="Delete transaction"
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
                ))}
              </tbody>
            </table>
          </div>

          <div className="transactions-pagination">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span className="transactions-pagination-meta">
              Page {page} of {totalPages} · {totalCount} total
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </>
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
                <div><strong>Total:</strong> {formatMoney(detail.total)}</div>
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
