import { createPortal } from 'react-dom'
import { useCurrency } from '../contexts/CurrencyContext'
import './CustomerReceiptModal.css'

function parseReceiptItems(transaction) {
  const raw = transaction?.itemsJson
  if (raw) {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item) => ({
          name: item.name || item.symbol || 'Item',
          quantity: item.quantity > 0 ? item.quantity : 1,
          offerTitle: item.offerTitle || null,
          expiryDate: item.expiryDate || null,
          expiryStatus: item.expiryStatus || item.batchStatus || null,
        }))
      }
    } catch {
      /* fall through to summary */
    }
  }

  const summary = transaction?.itemsSummary
  if (!summary) return []
  return summary
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(.*)\s+x(\d+)\s*$/i)
      if (m) return { name: m[1].trim(), quantity: Number(m[2]) || 1 }
      return { name: line, quantity: 1 }
    })
}

function formatExpiry(value) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function ReceiptBody({ transaction, storeTitle = 'Sales receipt' }) {
  const { formatMoney } = useCurrency()
  const { id, customerName, total, paymentMethod, createdOn } = transaction || {}
  const dateStr = createdOn
    ? new Date(createdOn).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : '—'
  const items = parseReceiptItems(transaction)

  return (
    <div className="customer-receipt-bill">
      <header className="customer-receipt-bill-header">
        <h1 className="customer-receipt-bill-title">{storeTitle}</h1>
        <p className="customer-receipt-bill-sub">Customer copy</p>
      </header>
      <dl className="customer-receipt-bill-meta">
        <div>
          <dt>Bill no.</dt>
          <dd>#{id ?? '—'}</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>{dateStr}</dd>
        </div>
        <div>
          <dt>Customer</dt>
          <dd>{customerName || '—'}</dd>
        </div>
        {paymentMethod ? (
          <div>
            <dt>Payment</dt>
            <dd>{paymentMethod}</dd>
          </div>
        ) : null}
      </dl>
      <section className="customer-receipt-bill-items">
        <h2 className="customer-receipt-bill-items-heading">Items</h2>
        {items.length > 0 ? (
          <ul className="customer-receipt-bill-items-list">
            {items.map((item, i) => (
              <li key={i} className="customer-receipt-bill-item">
                <div className="customer-receipt-bill-item-main">
                  <span className="customer-receipt-bill-item-name">
                    {item.name} × {item.quantity}
                  </span>
                  {item.offerTitle ? (
                    <span className="customer-receipt-bill-item-offer">{item.offerTitle}</span>
                  ) : null}
                </div>
                {(item.expiryDate || item.expiryStatus) && (
                  <div className="customer-receipt-bill-item-meta">
                    {item.expiryDate ? <span>Exp {formatExpiry(item.expiryDate)}</span> : null}
                    {item.expiryStatus ? (
                      <span className={`customer-receipt-expiry-status status-${String(item.expiryStatus).toLowerCase()}`}>
                        {item.expiryStatus}
                      </span>
                    ) : null}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="customer-receipt-bill-items-empty">—</p>
        )}
      </section>
      <footer className="customer-receipt-bill-total">
        <span className="customer-receipt-bill-total-label">Total</span>
        <span className="customer-receipt-bill-total-value">
          {formatMoney(total)}
        </span>
      </footer>
      <p className="customer-receipt-bill-thanks">Thank you for your purchase.</p>
    </div>
  )
}

/**
 * Printable customer receipt. Rendered via portal so @media print can hide #root.
 */
export default function CustomerReceiptModal({ transaction, onClose }) {
  if (!transaction) return null

  const handlePrint = () => {
    window.print()
  }

  return createPortal(
    <div className="customer-receipt-modal-root" role="dialog" aria-labelledby="customer-receipt-title">
      <div className="customer-receipt-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="customer-receipt-sheet">
        <span id="customer-receipt-title" className="visually-hidden">
          Customer receipt
        </span>
        <div className="customer-receipt-print-area">
          <ReceiptBody transaction={transaction} />
        </div>
        <div className="customer-receipt-actions no-print">
          <button type="button" className="btn btn-primary" onClick={handlePrint}>
            Print
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
