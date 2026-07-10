import { useState, useCallback } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'

export function useAppDialog() {
  const [dialog, setDialog] = useState(null)

  const showAlert = useCallback((message, options = {}) => {
    const variant = options.variant || 'info'
    const defaultTitle =
      variant === 'error' ? 'Error' : variant === 'success' ? 'Success' : options.title || 'Notice'

    return new Promise((resolve) => {
      setDialog({
        mode: 'alert',
        title: options.title ?? defaultTitle,
        message,
        confirmText: options.confirmText || 'OK',
        confirmVariant: variant === 'error' ? 'danger' : 'primary',
        tone: variant,
        onResolve: () => resolve(true),
      })
    })
  }, [])

  const showConfirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      setDialog({
        mode: 'confirm',
        title: options.title || 'Confirm',
        message,
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        confirmVariant: options.confirmVariant || 'danger',
        tone: 'confirm',
        onResolve: (confirmed) => resolve(confirmed),
      })
    })
  }, [])

  const closeDialog = (confirmed) => {
    setDialog((current) => {
      current?.onResolve?.(confirmed)
      return null
    })
  }

  const AppDialog = () => {
    if (!dialog) return null

    return (
      <ConfirmDialog
        open
        alert={dialog.mode === 'alert'}
        title={dialog.title}
        message={dialog.message}
        confirmText={dialog.confirmText}
        cancelText={dialog.cancelText}
        confirmVariant={dialog.confirmVariant}
        tone={dialog.tone}
        onConfirm={() => closeDialog(true)}
        onCancel={() => closeDialog(dialog.mode === 'alert')}
      />
    )
  }

  return { showAlert, showConfirm, AppDialog }
}
