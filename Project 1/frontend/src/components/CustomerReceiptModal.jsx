import { createPortal } from 'react-dom'
import './CustomerReceiptModal.css'

function ReceiptBody({ transaction, storeTitle = 'Sales receipt' }) {
  const { id, customerName, total, itemsSummary, paymentMethod, createdOn } = transaction || {}
  const dateStr = createdOn
    ? new Date(createdOn).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : '—'
  const itemsLines = itemsSummary
    ? itemsSummary
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : []

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
        {itemsLines.length > 0 ? (
          <ul className="customer-receipt-bill-items-list">
            {itemsLines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="customer-receipt-bill-items-empty">—</p>
        )}
      </section>
      <footer className="customer-receipt-bill-total">
        <span className="customer-receipt-bill-total-label">Total</span>
        <span className="customer-receipt-bill-total-value">
          ₹{total != null ? Number(total).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}
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
