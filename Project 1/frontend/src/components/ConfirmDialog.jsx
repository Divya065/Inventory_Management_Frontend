import { createPortal } from 'react-dom'
import './ConfirmDialog.css'

export default function ConfirmDialog({
  open,
  title = 'Confirm',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
  alert = false,
  tone = 'confirm',
  onConfirm,
  onCancel,
}) {
  if (!open) return null

  const confirmClass =
    confirmVariant === 'danger'
      ? 'btn btn-danger'
      : confirmVariant === 'primary'
        ? 'btn btn-primary'
        : 'btn btn-secondary'

  const toneClass =
    tone === 'error' ? 'confirm-dialog-box--error' : tone === 'success' ? 'confirm-dialog-box--success' : tone === 'info' ? 'confirm-dialog-box--info' : ''

  return createPortal(
    <div className="modal-overlay" onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      <div className={`modal-box confirm-dialog-box ${toneClass}`} onClick={(e) => e.stopPropagation()}>
        <h3 id="confirm-dialog-title" className="confirm-dialog-title">
          {title}
        </h3>
        {message ? <p className="confirm-dialog-message">{message}</p> : null}
        <div className="confirm-dialog-actions">
          {!alert ? (
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              {cancelText}
            </button>
          ) : null}
          <button type="button" className={confirmClass} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
