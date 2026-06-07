import { createPortal } from 'react-dom'

export default function ConfirmDialog({
  open,
  title = 'Confirm',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
}) {
  if (!open) return null

  const confirmClass =
    confirmVariant === 'danger' ? 'btn btn-danger' : confirmVariant === 'primary' ? 'btn btn-primary' : 'btn btn-secondary'

  return createPortal(
    <div className="modal-overlay" onClick={onCancel} role="dialog" aria-modal="true">
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        {message ? (
          <p style={{ marginTop: '0.65rem', color: 'var(--color-text-muted)', lineHeight: 1.55 }}>{message}</p>
        ) : null}
        <div className="modal-actions" style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {cancelText}
          </button>
          <button type="button" className={confirmClass} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

