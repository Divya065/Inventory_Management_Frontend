import { useEffect, useState } from 'react'
import { offerService } from '../services/offerService'
import { useAppDialog } from '../hooks/useAppDialog'
import { parseNonNegativeDecimal } from '../utils/productPrice'
import './ProductOfferEditor.css'

export const DEAL_OPTIONS = [
  {
    id: 'percent',
    buyQty: 0,
    getQty: 0,
    label: 'Percentage discount',
    description: 'Enter a percent off MRP. Selling price updates automatically from original price.',
  },
  {
    id: 'b1g1',
    buyQty: 1,
    getQty: 1,
    label: 'Buy 1 Get 1 Free',
    description: 'Adding 1 paid unit places 2 in the cart. Customer pays for 1.',
    defaultTitle: 'Buy 1 Get 1 Free',
    defaultContent:
      'Purchase one unit and receive a second unit free. Cart quantity doubles; billing charges one unit.',
  },
  {
    id: 'b2g1',
    buyQty: 2,
    getQty: 1,
    label: 'Buy 2 Get 1 Free',
    description: 'For every 2 paid units, 1 free unit is added. Example: pay for 2, receive 3.',
    defaultTitle: 'Buy 2 Get 1 Free',
    defaultContent:
      'Purchase two units and receive one additional unit free. Billing charges only the paid units.',
  },
  {
    id: 'b3g1',
    buyQty: 3,
    getQty: 1,
    label: 'Buy 3 Get 1 Free',
    description: 'For every 3 paid units, 1 free unit is added. Example: pay for 3, receive 4.',
    defaultTitle: 'Buy 3 Get 1 Free',
    defaultContent:
      'Purchase three units and receive one additional unit free. Billing charges only the paid units.',
  },
]

const resolveDealId = (offer) => {
  const discount = Number(offer?.discountPercent) || 0
  if (discount > 0) return 'percent'
  const buy = Number(offer?.buyQty) || (offer?.isBuyOneGetOne ? 1 : 0)
  const get = Number(offer?.getQty) || (offer?.isBuyOneGetOne ? 1 : 0)
  const match = DEAL_OPTIONS.find((d) => d.buyQty === buy && d.getQty === get && d.id !== 'percent')
  return match?.id || 'percent'
}

const emptyForm = () => ({
  title: '',
  content: '',
  dealId: 'percent',
  buyQty: 0,
  getQty: 0,
  discountPercent: 0,
})

const validateOffer = (form) => {
  const title = String(form.title || '').trim()
  const content = String(form.content || '').trim()
  if (title.length < 5) return 'Title must be at least 5 characters.'
  if (content.length < 5) return 'Content must be at least 5 characters.'
  if (title.length > 280) return 'Title cannot be over 280 characters.'
  if (content.length > 280) return 'Content cannot be over 280 characters.'
  return ''
}

const dealTag = (offer) => {
  const discount = Number(offer.discountPercent) || 0
  if (discount > 0) return `${discount}% OFF`
  const buy = Number(offer.buyQty) || (offer.isBuyOneGetOne ? 1 : 0)
  const get = Number(offer.getQty) || (offer.isBuyOneGetOne ? 1 : 0)
  if (buy >= 1 && get >= 1) return `Buy ${buy} Get ${get}`
  return null
}

const formatPriceInput = (n) => {
  const v = Number(n)
  if (!Number.isFinite(v)) return ''
  return String(Math.round(v * 100) / 100)
}

/**
 * Editable offers for Create (local drafts) or Edit (saved to API).
 * mode: 'local' | 'remote'
 * marketCap: current MRP field value (display currency)
 * onApplyDiscountedPrice: (newSellingPriceString) => void
 */
const ProductOfferEditor = ({
  mode = 'local',
  stockId,
  value = [],
  onChange,
  marketCap,
  onApplyDiscountedPrice,
}) => {
  const { showAlert, showConfirm, AppDialog } = useAppDialog()
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(mode === 'remote')
  const [form, setForm] = useState(emptyForm())
  const [editingId, setEditingId] = useState(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showPercentModal, setShowPercentModal] = useState(false)
  const [percentInput, setPercentInput] = useState('')
  const [percentError, setPercentError] = useState('')
  const [pendingDealId, setPendingDealId] = useState(null)

  const list = mode === 'local' ? value : offers

  const loadRemote = async () => {
    if (mode !== 'remote' || !stockId) return
    try {
      setLoading(true)
      const data = await offerService.getAll()
      setOffers((data || []).filter((o) => Number(o.stockId) === Number(stockId)))
    } catch (err) {
      console.error('Failed to load offers', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRemote()
  }, [mode, stockId])

  const resetForm = () => {
    setForm(emptyForm())
    setEditingId(null)
    setFormError('')
  }

  const applyDealOption = (dealId, prev = {}, discountPercent = 0) => {
    const opt = DEAL_OPTIONS.find((d) => d.id === dealId) || DEAL_OPTIONS[0]
    const isPercent = dealId === 'percent'
    const pct = isPercent ? discountPercent : 0
    const titleFromPct = pct > 0 ? `${pct}% Off` : ''
    const contentFromPct =
      pct > 0
        ? `Save ${pct}% on the original price (MRP). Selling price is updated automatically.`
        : ''

    return {
      ...prev,
      dealId: opt.id,
      buyQty: opt.buyQty,
      getQty: opt.getQty,
      discountPercent: pct,
      title: isPercent
        ? titleFromPct || prev.title
        : !String(prev.title || '').trim() || DEAL_OPTIONS.some((d) => d.defaultTitle === prev.title)
          ? opt.defaultTitle || prev.title
          : prev.title,
      content: isPercent
        ? contentFromPct || prev.content
        : !String(prev.content || '').trim() ||
            DEAL_OPTIONS.some((d) => d.defaultContent === prev.content)
          ? opt.defaultContent || prev.content
          : prev.content,
    }
  }

  const openPercentModal = (dealId = 'percent') => {
    const mrp = parseNonNegativeDecimal(marketCap)
    if (!Number.isFinite(mrp) || mrp <= 0) {
      showAlert('Enter the original price (MRP) first, then apply a percentage discount.', {
        variant: 'error',
      })
      return
    }
    setPendingDealId(dealId)
    setPercentInput(form.discountPercent > 0 ? String(form.discountPercent) : '')
    setPercentError('')
    setShowPercentModal(true)
  }

  const closePercentModal = () => {
    setShowPercentModal(false)
    setPendingDealId(null)
    setPercentError('')
  }

  const confirmPercentModal = () => {
    const pct = parseFloat(String(percentInput).trim())
    if (!Number.isFinite(pct) || pct <= 0 || pct >= 100) {
      setPercentError('Enter a discount between 1 and 99.')
      return
    }
    const mrp = parseNonNegativeDecimal(marketCap)
    if (!Number.isFinite(mrp) || mrp <= 0) {
      setPercentError('Original price (MRP) is required.')
      return
    }
    const roundedPct = Math.round(pct * 100) / 100
    const newPrice = Math.round(mrp * (1 - roundedPct / 100) * 100) / 100
    if (!(newPrice > 0)) {
      setPercentError('Discount is too high for this MRP.')
      return
    }

    setForm((prev) => applyDealOption(pendingDealId || 'percent', prev, roundedPct))
    onApplyDiscountedPrice?.(formatPriceInput(newPrice))
    closePercentModal()
  }

  const handleDealSelect = (dealId) => {
    if (dealId === 'percent') {
      openPercentModal(dealId)
      return
    }
    setForm((prev) => applyDealOption(dealId, { ...prev, discountPercent: 0 }, 0))
  }

  const startEdit = (offer) => {
    setEditingId(offer.id ?? offer.tempId)
    const dealId = resolveDealId(offer)
    const discount = Number(offer.discountPercent) || 0
    setForm({
      title: offer.title || '',
      content: offer.content || '',
      dealId,
      buyQty: Number(offer.buyQty) || (offer.isBuyOneGetOne ? 1 : 0),
      getQty: Number(offer.getQty) || (offer.isBuyOneGetOne ? 1 : 0),
      discountPercent: discount,
    })
    setFormError('')
    if (dealId === 'percent') {
      // allow re-edit of percent via selecting the card again
    }
  }

  const handleSave = async (e) => {
    e?.preventDefault?.()
    const opt = DEAL_OPTIONS.find((d) => d.id === form.dealId) || DEAL_OPTIONS[0]
    let title = form.title.trim()
    let content = form.content.trim()
    const buyQty = form.dealId === 'percent' ? 0 : opt.buyQty
    const getQty = form.dealId === 'percent' ? 0 : opt.getQty
    const discountPercent = form.dealId === 'percent' ? Number(form.discountPercent) || 0 : 0

    if (form.dealId === 'percent') {
      if (!(discountPercent > 0 && discountPercent < 100)) {
        setFormError('Select Percentage discount and enter a valid percent first.')
        openPercentModal('percent')
        return
      }
      if (!title) title = `${discountPercent}% Off`
      if (!content) {
        content = `Save ${discountPercent}% on the original price (MRP). Selling price is updated automatically.`
      }
    } else if (buyQty >= 1 && getQty >= 1) {
      if (!title) title = opt.defaultTitle
      if (!content) content = opt.defaultContent
    }

    const err = validateOffer({ title, content })
    if (err) {
      setFormError(err)
      return
    }

    const payload = {
      title,
      content,
      buyQty,
      getQty,
      discountPercent,
      isBuyOneGetOne: buyQty === 1 && getQty === 1,
    }

    if (mode === 'local') {
      const drafts = [...(value || [])]
      if (editingId != null) {
        const idx = drafts.findIndex((o) => o.tempId === editingId)
        if (idx >= 0) drafts[idx] = { ...drafts[idx], ...payload }
      } else {
        drafts.push({ tempId: `draft-${Date.now()}`, ...payload })
      }
      onChange?.(drafts)
      resetForm()
      return
    }

    setSaving(true)
    try {
      if (editingId != null) {
        await offerService.update(editingId, payload)
      } else {
        await offerService.create(stockId, payload)
      }
      resetForm()
      await loadRemote()
    } catch (ex) {
      const msg =
        ex.response?.data?.message ||
        ex.response?.data?.title?.[0] ||
        ex.message ||
        'Failed to save offer'
      await showAlert(typeof msg === 'string' ? msg : 'Failed to save offer', { variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (offer) => {
    const ok = await showConfirm('Delete this offer?', {
      title: 'Delete offer',
      confirmText: 'Delete',
    })
    if (!ok) return

    if (mode === 'local') {
      onChange?.((value || []).filter((o) => o.tempId !== offer.tempId))
      if (editingId === offer.tempId) resetForm()
      return
    }

    try {
      await offerService.delete(offer.id)
      if (editingId === offer.id) resetForm()
      await loadRemote()
    } catch (ex) {
      await showAlert(ex.response?.data?.message || ex.message || 'Failed to delete offer', {
        variant: 'error',
      })
    }
  }

  const mrpPreview = parseNonNegativeDecimal(marketCap)
  const pctPreview = parseFloat(String(percentInput).trim())
  const previewPrice =
    Number.isFinite(mrpPreview) &&
    mrpPreview > 0 &&
    Number.isFinite(pctPreview) &&
    pctPreview > 0 &&
    pctPreview < 100
      ? Math.round(mrpPreview * (1 - pctPreview / 100) * 100) / 100
      : null

  return (
    <div className="stock-offer-editor">
      <AppDialog />
      <div className="stock-offer-editor-head">
        <div>
          <h3>Offers</h3>
          <p>
            Optional promotions. Apply a percentage off MRP, or a buy-get deal for the cart.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="stock-offer-muted">Loading offers…</p>
      ) : list.length === 0 ? (
        <p className="stock-offer-muted">No offer yet.</p>
      ) : (
        <ul className="stock-offer-list">
          {list.map((offer) => {
            const key = offer.id ?? offer.tempId
            const tag = dealTag(offer)
            return (
              <li key={key} className="stock-offer-item">
                <div className="stock-offer-item-body">
                  <strong>
                    {offer.title}
                    {tag ? <span className="stock-offer-bogo-tag">{tag}</span> : null}
                  </strong>
                  <p>{offer.content}</p>
                </div>
                <div className="stock-offer-item-actions">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEdit(offer)}>
                    Edit
                  </button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDelete(offer)}>
                    Delete
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="stock-offer-form">
        <h4>{editingId != null ? 'Edit offer' : 'Add offer'}</h4>
        {formError ? <div className="stock-offer-form-error">{formError}</div> : null}

        <div className="form-group">
          <span className="stock-offer-deal-label">Offer type</span>
          <div className="stock-offer-deal-grid" role="radiogroup" aria-label="Offer type">
            {DEAL_OPTIONS.map((opt) => {
              const selected = form.dealId === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`stock-offer-deal-card${selected ? ' is-selected' : ''}`}
                  onClick={() => handleDealSelect(opt.id)}
                  aria-pressed={selected}
                >
                  <span className="stock-offer-deal-card-title">{opt.label}</span>
                  <span className="stock-offer-deal-card-desc">{opt.description}</span>
                  {opt.id === 'percent' && form.dealId === 'percent' && form.discountPercent > 0 ? (
                    <span className="stock-offer-deal-card-meta">{form.discountPercent}% selected</span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="stock-offer-title">Title</label>
          <input
            id="stock-offer-title"
            type="text"
            value={form.title}
            onChange={(e) => {
              setForm((f) => ({ ...f, title: e.target.value }))
              if (formError) setFormError('')
            }}
            placeholder="e.g. 10% Off"
            maxLength={280}
            autoComplete="off"
          />
        </div>
        <div className="form-group">
          <label htmlFor="stock-offer-content">Details</label>
          <textarea
            id="stock-offer-content"
            value={form.content}
            onChange={(e) => {
              setForm((f) => ({ ...f, content: e.target.value }))
              if (formError) setFormError('')
            }}
            placeholder="Describe the promotion for staff and customers"
            rows={3}
            maxLength={280}
          />
        </div>
        <div className="stock-offer-form-actions">
          {editingId != null ? (
            <button type="button" className="btn btn-secondary" onClick={resetForm} disabled={saving}>
              Cancel edit
            </button>
          ) : null}
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : editingId != null ? 'Update offer' : 'Add offer'}
          </button>
        </div>
      </div>

      {showPercentModal && (
        <div className="modal-overlay" onClick={closePercentModal}>
          <div
            className="modal-box stock-offer-percent-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="discount-percent-title"
          >
            <h3 id="discount-percent-title">Percentage discount</h3>
            <p className="stock-offer-percent-lead">
              Enter the discount percent. Selling price will be calculated from the original price
              (MRP).
            </p>
            <div className="form-group">
              <label htmlFor="offer-discount-percent">Discount (%)</label>
              <input
                id="offer-discount-percent"
                type="number"
                min={1}
                max={99}
                step={0.01}
                value={percentInput}
                autoFocus
                onChange={(e) => {
                  setPercentInput(e.target.value)
                  if (percentError) setPercentError('')
                }}
                placeholder="e.g. 10"
              />
              {percentError ? <span className="field-error">{percentError}</span> : null}
            </div>
            <div className="stock-offer-percent-preview">
              <div>
                <span>Original price (MRP)</span>
                <strong>{Number.isFinite(mrpPreview) ? mrpPreview : '—'}</strong>
              </div>
              <div>
                <span>New selling price</span>
                <strong>{previewPrice != null ? previewPrice : '—'}</strong>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={closePercentModal}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={confirmPercentModal}>
                Apply discount
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductOfferEditor
