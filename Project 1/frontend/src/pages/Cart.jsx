import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { cartService } from '../services/cartService'
import { cartParkingService } from '../services/cartParkingService'
import { productService } from '../services/productService'
import { transactionService } from '../services/transactionService'
import { paymentService } from '../services/paymentService'
import CustomerReceiptModal from '../components/CustomerReceiptModal'
import BarcodeCameraModal from '../components/BarcodeCameraModal'
import { useCurrency } from '../contexts/CurrencyContext'
import {
  getCustomerNameError,
  normalizeCustomerName,
  sanitizeCustomerNameInput,
} from '../utils/customerName'
import { displayPrice } from '../utils/productPrice'
import { useAppDialog } from '../hooks/useAppDialog'
import './Cart.css'

const Cart = () => {
  const navigate = useNavigate()
  const { currency, formatMoney } = useCurrency()
  const { showAlert, showConfirm, AppDialog } = useAppDialog()
  // portfolio = your current cart items (loaded from backend)
  const [cartItems, setCartItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [symbol, setSymbol] = useState('')
  const [adding, setAdding] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  // Controls the modal where you enter customer name and confirm Buy/Loan
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [transactionType, setTransactionType] = useState('Buy')
  const [customerName, setCustomerName] = useState('')
  const [customerNameError, setCustomerNameError] = useState('')
  const [transactionSubmitting, setTransactionSubmitting] = useState(false)
  const [showBuyPaymentModal, setShowBuyPaymentModal] = useState(false)

  // For Buy: how payment happens
  // - Cash: record immediately
  // - Razorpay: open Razorpay payment popup, then record only after verify succeeds
  const [buyPaymentMethod, setBuyPaymentMethod] = useState(null)
  const [razorpayStarting, setRazorpayStarting] = useState(false)
  const [razorpayError, setRazorpayError] = useState('')

  // After a successful Buy, show a printable customer receipt
  const [receiptTransaction, setReceiptTransaction] = useState(null)
  const [addQuantity, setAddQuantity] = useState(1)
  const [selectedStock, setSelectedStock] = useState(null) // for max quantity from inventory
  const searchTimeoutRef = useRef(null)
  const searchInputRef = useRef(null)

  // USB barcode scanner (keyboard wedge: types code + Enter)
  const [scanCode, setScanCode] = useState('')
  const [scanLookingUp, setScanLookingUp] = useState(false)
  const [scanError, setScanError] = useState('')
  const [scannedItem, setScannedItem] = useState(null)
  const [scanQuantity, setScanQuantity] = useState(1)
  const [scanAdding, setScanAdding] = useState(false)
  const [notFoundBarcode, setNotFoundBarcode] = useState('')
  const [showCameraScan, setShowCameraScan] = useState(false)
  const scanInputRef = useRef(null)

  // Multi-cart parking
  const [parkedCarts, setParkedCarts] = useState([])
  const [activeCustomerName, setActiveCustomerName] = useState('')
  const [hasSavedCustomerName, setHasSavedCustomerName] = useState(false)
  const [showParkModal, setShowParkModal] = useState(false)
  const [parkName, setParkName] = useState('')
  const [parkNameError, setParkNameError] = useState('')
  const [parkSubmitting, setParkSubmitting] = useState(false)
  const [workspaceLoading, setWorkspaceLoading] = useState(false)

  useEffect(() => {
    loadCart()
    loadWorkspace()
  }, [])

  // Keep barcode input ready — no click needed to scan (USB keyboard wedge)
  useEffect(() => {
    const blocked =
      !!scannedItem ||
      !!notFoundBarcode ||
      showTransactionModal ||
      showBuyPaymentModal ||
      showParkModal ||
      showCameraScan ||
      !!receiptTransaction

    const isEditable = (el) => {
      if (!el || el === document.body) return false
      if (el === scanInputRef.current) return false
      const tag = String(el.tagName || '').toUpperCase()
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
      if (el.isContentEditable) return true
      return !!el.closest?.('input, textarea, select, [contenteditable="true"]')
    }

    const focusScan = () => {
      if (blocked || loading) return
      scanInputRef.current?.focus({ preventScroll: true })
    }

    let focusTimer = null
    if (!blocked && !loading) {
      focusTimer = setTimeout(focusScan, 50)
    }

    const onKeyDownCapture = (e) => {
      if (blocked || loading) return
      // Don't steal keys while typing in search / other fields
      if (isEditable(document.activeElement)) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const isScanKey =
        e.key === 'Enter' ||
        e.key.length === 1 ||
        e.key === 'Backspace'
      if (!isScanKey) return
      if (document.activeElement !== scanInputRef.current) {
        focusScan()
      }
    }

    const onPointerDown = (e) => {
      if (blocked || loading) return
      const t = e.target
      if (isEditable(t)) return
      if (t.closest?.('button, a, label, .search-result-item, .modal-overlay, .modal-box')) return
      setTimeout(focusScan, 0)
    }

    const onWindowFocus = () => focusScan()

    document.addEventListener('keydown', onKeyDownCapture, true)
    document.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('focus', onWindowFocus)

    return () => {
      if (focusTimer) clearTimeout(focusTimer)
      document.removeEventListener('keydown', onKeyDownCapture, true)
      document.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('focus', onWindowFocus)
    }
  }, [scannedItem, notFoundBarcode, showTransactionModal, showBuyPaymentModal, showParkModal, showCameraScan, receiptTransaction, loading, cartItems.length])

  // Quantity modal: select full value so ↑/↓ change whole qty, not one digit
  useEffect(() => {
    if (!scannedItem) return
    const el = document.getElementById('scan-quantity')
    if (!el) return
    const t = setTimeout(() => {
      el.focus()
      el.select()
    }, 30)
    return () => clearTimeout(t)
  }, [scannedItem])

  // Search products by name
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // If search query is empty, clear results
    if (!searchQuery.trim()) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    // Debounce search - wait 300ms after user stops typing
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setSearching(true)
        const results = await productService.getAll({ Search: searchQuery.trim() })
        setSearchResults(results || [])
        setShowResults(true)
      } catch (err) {
        console.error('Error searching stocks:', err)
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)

    // Cleanup timeout on unmount or when query changes
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const loadWorkspace = async () => {
    try {
      setWorkspaceLoading(true)
      const data = await cartParkingService.getWorkspace()
      setParkedCarts(Array.isArray(data?.parked) ? data.parked : [])
      const name = data?.active?.customerName || ''
      setActiveCustomerName(name)
      setHasSavedCustomerName(!!data?.active?.hasSavedCustomerName && !!name)
    } catch (err) {
      console.error('Error loading cart workspace:', err)
    } finally {
      setWorkspaceLoading(false)
    }
  }

  const loadCart = async () => {
    try {
      setLoading(true)
      setError('') // Clear previous errors
      // Fetch cart items from backend API
      const data = await cartService.getUserCart()
      if (Array.isArray(data)) {
        setCartItems(data)
      } else {
        console.warn('Unexpected portfolio data format:', data)
        setCartItems([])
      }
    } catch (err) {
      // Only set error if it's not a silent reload after successful add
      const errorMsg = err.response?.data?.message || err.message || 'Failed to load cart. Please try again.'
      setError(errorMsg)
      console.error('Error loading portfolio:', err)
    } finally {
      setLoading(false)
    }
  }

  const refreshCart = async () => {
    await loadCart()
    await loadWorkspace()
  }

  const closeScanModal = () => {
    setScannedItem(null)
    setScanQuantity(1)
    setScanError('')
    setTimeout(() => scanInputRef.current?.focus(), 50)
  }

  const closeNotFoundModal = () => {
    setNotFoundBarcode('')
    setTimeout(() => scanInputRef.current?.focus(), 50)
  }

  const handleAddMissingItem = () => {
    const code = String(notFoundBarcode || '').trim()
    setNotFoundBarcode('')
    navigate(`/products/create?barcode=${encodeURIComponent(code)}`)
  }

  const getDealFromStock = (stock) => {
    if (!stock) return { buyQty: 0, getQty: 0 }
    if (stock.buyQty >= 1 && stock.getQty >= 1) {
      return { buyQty: Number(stock.buyQty), getQty: Number(stock.getQty) }
    }
    const offer = Array.isArray(stock.offers)
      ? stock.offers.find(
          (o) =>
            (Number(o.buyQty) >= 1 && Number(o.getQty) >= 1) || o.isBuyOneGetOne
        )
      : null
    if (!offer) return { buyQty: 0, getQty: 0 }
    if (offer.isBuyOneGetOne && !(Number(offer.buyQty) >= 1 && Number(offer.getQty) >= 1)) {
      return { buyQty: 1, getQty: 1 }
    }
    return { buyQty: Number(offer.buyQty) || 0, getQty: Number(offer.getQty) || 0 }
  }

  const physicalForPaid = (paid, buyQty, getQty) => {
    const p = Math.max(1, paid)
    if (!(buyQty >= 1 && getQty >= 1)) return p
    return p + Math.floor(p / buyQty) * getQty
  }

  const maxPaidForRemaining = (remaining, buyQty, getQty) => {
    if (remaining <= 0) return 0
    if (!(buyQty >= 1 && getQty >= 1)) return remaining
    for (let paid = remaining; paid >= 1; paid -= 1) {
      if (physicalForPaid(paid, buyQty, getQty) <= remaining) return paid
    }
    return 0
  }

  const getScanMaxQuantity = (stock) => {
    if (!stock) return 0
    const inventory = Math.max(0, parseInt(stock.quantity, 10) || 0)
    const inCart = cartItems.find(
      (p) => String(p.symbol || '').toLowerCase() === String(stock.symbol || '').toLowerCase()
    )
    const cartQty = inCart ? Number(inCart.quantity) || 0 : 0
    const remaining = Math.max(0, inventory - cartQty)
    const { buyQty, getQty } = getDealFromStock(stock)
    return maxPaidForRemaining(remaining, buyQty, getQty)
  }

  const stockHasBogo = (stock) => {
    const { buyQty, getQty } = getDealFromStock(stock)
    return buyQty >= 1 && getQty >= 1
  }

  const dealLabel = (stock) => {
    if (stock?.offerTitle) return stock.offerTitle
    const { buyQty, getQty } = getDealFromStock(stock)
    if (buyQty >= 1 && getQty >= 1) return `Buy ${buyQty} Get ${getQty} Free`
    return ''
  }

  const lookupBarcode = async (rawCode) => {
    const code = String(rawCode || '').trim()
    setScanCode('')
    setScanError('')
    setNotFoundBarcode('')
    if (!code) return

    setScanLookingUp(true)
    try {
      const stock = await productService.getByBarcode(code)
      const maxQty = getScanMaxQuantity(stock)
      if (maxQty <= 0) {
        setScanError(
          `"${stock.companyName || stock.symbol}" is out of stock or already fully in cart.`
        )
        setTimeout(() => scanInputRef.current?.focus(), 50)
        return
      }
      setScannedItem(stock)
      setScanQuantity(1)
    } catch (err) {
      if (err.response?.status === 404) {
        setNotFoundBarcode(code)
        return
      }
      setScanError(err.response?.data?.message || err.message || 'Failed to look up barcode')
      setTimeout(() => scanInputRef.current?.focus(), 50)
    } finally {
      setScanLookingUp(false)
    }
  }

  const handleBarcodeScan = async (e) => {
    e.preventDefault()
    await lookupBarcode(scanCode)
  }

  const handleCameraDetected = async (code) => {
    setShowCameraScan(false)
    await lookupBarcode(code)
  }

  const handleConfirmScanAdd = async (e) => {
    e.preventDefault()
    if (!scannedItem?.symbol) return
    const maxQty = getScanMaxQuantity(scannedItem)
    const qty = Math.max(1, Math.min(parseInt(scanQuantity, 10) || 1, maxQty))
    if (maxQty <= 0) {
      await showAlert('No more quantity available for this item.', { variant: 'error' })
      closeScanModal()
      return
    }

    setScanAdding(true)
    try {
      await cartService.addToCart(scannedItem.symbol, qty)
      closeScanModal()
      await refreshCart()
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || err.response?.data || err.message || 'Failed to add item to cart'
      await showAlert(errorMsg, { variant: 'error' })
    } finally {
      setScanAdding(false)
    }
  }

  const handleAddStock = async (e) => {
    e.preventDefault()
    if (!selectedStock?.symbol && !symbol.trim()) {
      await showAlert('Please search and select a product from the list', { variant: 'error' })
      return
    }
    const addSymbol = (selectedStock?.symbol || symbol).trim()
    const raw = Math.max(1, parseInt(addQuantity, 10) || 1)
    const qty = maxQuantity != null ? Math.min(raw, maxQuantity) : raw

    try {
      setAdding(true)
      setError('')
      await cartService.addToCart(addSymbol, qty)
      setSymbol('')
      setSearchQuery('')
      setSelectedStock(null)
      setSearchResults([])
      setShowResults(false)
      setAddQuantity(1)
      await refreshCart()
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.response?.data || err.message || 'Failed to add item to cart'
      await showAlert(errorMsg, { variant: 'error' })
      console.error('Error adding stock to portfolio:', err)
    } finally {
      setAdding(false)
    }
  }

  // Total = sum of (price × quantity) for each cart item
  const cartTotal = cartItems.reduce((sum, item) => {
    const price = displayPrice(item.price)
    const chargeQty =
      item.chargeableQuantity != null
        ? Number(item.chargeableQuantity)
        : item.isBuyOneGetOne
          ? Math.ceil((Number(item.quantity) || 1) / 2)
          : Number(item.quantity) || 1
    return sum + price * Math.max(1, chargeQty || 1)
  }, 0)

  const openTransactionModal = (type) => {
    if (type === 'Loan') {
      setBuyPaymentMethod(null)
    }
    setTransactionType(type)
    if (hasSavedCustomerName && activeCustomerName) {
      setCustomerName(activeCustomerName)
    } else {
      setCustomerName('')
    }
    setCustomerNameError('')
    setShowTransactionModal(true)
  }

  const openParkModal = () => {
    setParkName(hasSavedCustomerName ? activeCustomerName : '')
    setParkNameError('')
    setShowParkModal(true)
  }

  const closeParkModal = () => {
    setShowParkModal(false)
    setParkName('')
    setParkNameError('')
  }

  const handleParkSubmit = async (e) => {
    e.preventDefault()
    const nameError = getCustomerNameError(parkName)
    if (nameError) {
      setParkNameError(nameError)
      return
    }
    setParkSubmitting(true)
    try {
      await cartParkingService.park(normalizeCustomerName(parkName))
      closeParkModal()
      await refreshCart()
      await showAlert(`Cart parked for ${normalizeCustomerName(parkName)}.`, { variant: 'success' })
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to park cart'
      setParkNameError(msg)
    } finally {
      setParkSubmitting(false)
    }
  }

  const handleResumeParked = async (parked) => {
    if (cartItems.length > 0) {
      await showAlert('Active cart has items. Park or clear it before resuming another cart.', {
        variant: 'error',
      })
      return
    }
    try {
      await cartParkingService.resume(parked.id)
      await refreshCart()
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to resume cart'
      await showAlert(msg, { variant: 'error' })
    }
  }

  const handleDiscardParked = async (parked) => {
    const ok = await showConfirm(
      `Discard parked cart for "${parked.customerName}"? Items will not return to the active cart.`,
      { title: 'Discard parked cart', confirmText: 'Discard' }
    )
    if (!ok) return
    try {
      await cartParkingService.discardParked(parked.id)
      await loadWorkspace()
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to discard parked cart'
      await showAlert(msg, { variant: 'error' })
    }
  }


  const closeTransactionModal = () => {
    setShowTransactionModal(false)
    setCustomerName('')
    setCustomerNameError('')
    setBuyPaymentMethod(null)
    setRazorpayError('')
  }

  const openBuyPaymentChoice = () => {
    setShowBuyPaymentModal(true)
  }

  const closeBuyPaymentModal = () => {
    setShowBuyPaymentModal(false)
  }

  const handleChooseCashBuy = () => {
    // Cash = save Buy transaction immediately (backend also reduces stock + clears cart)
    setBuyPaymentMethod('Cash')
    setShowBuyPaymentModal(false)
    openTransactionModal('Buy')
  }

  const handleChooseCardBuy = () => {
    setBuyPaymentMethod('Card')
    setShowBuyPaymentModal(false)
    openTransactionModal('Buy')
  }

  const handleChooseUpiBuy = async () => {
    // Online payment via Razorpay (UPI supported inside Razorpay popup)
    setBuyPaymentMethod('Razorpay')
    setShowBuyPaymentModal(false)
    setRazorpayError('')
    openTransactionModal('Buy')
  }

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      // Razorpay checkout is loaded from their official CDN script.
      // After it loads, `window.Razorpay` becomes available.
      if (window.Razorpay) return resolve(true)
      const existing = document.querySelector('script[data-razorpay-checkout]')
      if (existing) {
        existing.addEventListener('load', () => resolve(true))
        existing.addEventListener('error', () => resolve(false))
        return
      }
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      script.dataset.razorpayCheckout = 'true'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })

  const handleTransactionSubmit = async (e) => {
    e.preventDefault()
    const name = normalizeCustomerName(customerName)
    const nameError = getCustomerNameError(customerName)
    if (nameError) {
      setCustomerNameError(nameError)
      return
    }
    setCustomerNameError('')
    if (cartTotal <= 0) {
      await showAlert('Cart total must be greater than 0', { variant: 'error' })
      return
    }
    setTransactionSubmitting(true)
    try {
      if (transactionType === 'Buy' && buyPaymentMethod === 'Razorpay') {
        // Razorpay flow:
        // 1) load Razorpay Checkout script
        // 2) ask backend to create a Razorpay Order using the current cart in DB
        // 3) open Razorpay popup
        // 4) after payment success, verify signature on backend
        // 5) backend reduces stock + clears cart + saves Buy transaction
        setRazorpayStarting(true)
        setRazorpayError('')

        const ok = await loadRazorpayScript()
        if (!ok) throw new Error('Could not load Razorpay checkout script.')

        // Check if backend has Razorpay keys configured
        const config = await paymentService.getRazorpayConfig()
        if (!config?.configured || !config?.keyId) {
          throw new Error('Razorpay is not configured on the server. Add Razorpay KeyId/KeySecret in appsettings and restart API.')
        }

        // Backend creates Razorpay order + saves a PaymentOrder record for later
        const order = await paymentService.createRazorpayOrder({ customerName: name })

        const options = {
          key: order.keyId,
          amount: order.amountPaise,
          currency: order.currency || 'INR',
          name: 'Payment',
          description: 'Cart purchase',
          order_id: order.orderId,
          prefill: { name: order.customerName || name },
          notes: { items: order.itemsSummary || '' },
          // This handler runs after Razorpay says "payment success" in the popup.
          // We still verify signature with our backend before we trust it.
          handler: async function (response) {
            try {
              // Verify signature then create the actual Transaction
              const saved = await paymentService.verifyRazorpayPayment({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              })
              closeTransactionModal()
              await refreshCart()
              window.dispatchEvent(new CustomEvent('inventory-should-refresh'))
              // Show printable receipt for customer
              setReceiptTransaction(saved)
            } catch (err) {
              const data = err.response?.data
              const msg = data?.message || err.message || 'Payment verification failed.'
              await showAlert(msg, { variant: 'error' })
            }
          },
          modal: {
            ondismiss: function () {
              // user closed payment window
            },
          },
          theme: { color: '#667eea' },
        }

        setRazorpayError('')
        // eslint-disable-next-line no-undef
        const rzp = new window.Razorpay(options)
        rzp.open()
        return
      }

      const body = {
        customerName: name,
        total: cartTotal,
        type: transactionType,
      }
      if (transactionType === 'Buy') {
        body.paymentMethod = buyPaymentMethod || 'Cash'
      }
      const saved = await transactionService.create(body)
      closeTransactionModal()
      // After any successful transaction, reload the cart so it becomes empty
      await refreshCart()
      if (transactionType === 'Buy') {
        window.dispatchEvent(new CustomEvent('inventory-should-refresh'))
        if (saved && String(saved.type || '').toLowerCase() === 'buy') {
          setReceiptTransaction(saved)
        } else {
          await showAlert('Buy transaction saved successfully!', { variant: 'success' })
        }
      } else {
        await showAlert(`${transactionType} transaction saved successfully!`, { variant: 'success' })
      }
    } catch (err) {
      const data = err.response?.data
      let msg = data?.message || err.message || `Failed to save ${transactionType} transaction`
      if (data?.error) msg += ` (${data.error})`
      if (data?.inner) msg += ` [${data.inner}]`
      if (transactionType === 'Buy' && buyPaymentMethod === 'Razorpay') setRazorpayError(msg)
      await showAlert(msg, { variant: 'error' })
      console.error(err)
    } finally {
      setTransactionSubmitting(false)
      setRazorpayStarting(false)
    }
  }

  const maxQuantity = selectedStock != null ? getScanMaxQuantity(selectedStock) : null

  const handleSelectStock = (stock) => {
    setSymbol(stock.symbol)
    setSearchQuery(stock.companyName || stock.symbol)
    setSelectedStock(stock)
    setSearchResults([])
    setShowResults(false)
    const inventory = Math.max(0, parseInt(stock.quantity, 10) || 0)
    const inCart = cartItems.find(
      (p) => String(p.symbol || '').toLowerCase() === String(stock.symbol || '').toLowerCase()
    )
    const cartQty = inCart ? Number(inCart.quantity) || 0 : 0
    const remaining = Math.max(0, inventory - cartQty)
    const { buyQty, getQty } = getDealFromStock(stock)
    const paidMax = maxPaidForRemaining(remaining, buyQty, getQty)
    setAddQuantity((prev) => (paidMax > 0 ? Math.min(prev || 1, paidMax) : 0))
  }

  const handleSearchChange = (e) => {
    const value = e.target.value
    setSearchQuery(value)
    setSymbol('') // internal code set only after picking a product from results
    setSelectedStock(null)
  }

  const handleRemoveStock = async (stock) => {
    const label = stock.companyName || stock.symbol || 'this item'
    const ok = await showConfirm(`Are you sure you want to remove ${label} from your cart?`, {
      title: 'Remove from cart',
      confirmText: 'Remove',
    })
    if (!ok) return

    try {
      setError('')
      await cartService.removeFromCart(stock.symbol)
      await refreshCart()
      await showAlert('Item removed from cart successfully!', { variant: 'success' })
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.response?.data || err.message || 'Failed to remove item from cart'
      await showAlert(errorMsg, { variant: 'error' })
      console.error('Error removing stock from portfolio:', err)
    }
  }

  const getCartPaidQty = (stock) => {
    if (stock?.chargeableQuantity != null && Number(stock.chargeableQuantity) > 0) {
      return Number(stock.chargeableQuantity)
    }
    if (stock?.isBuyOneGetOne) {
      return Math.ceil((Number(stock.quantity) || 1) / 2)
    }
    return Math.max(1, Number(stock.quantity) || 1)
  }

  const getCartMaxPaid = (stock) => {
    const inventory = Math.max(0, parseInt(stock?.availableQuantity, 10) || 0)
    const { buyQty, getQty } = getDealFromStock(stock)
    return maxPaidForRemaining(inventory, buyQty, getQty)
  }

  const handleCartQtyChange = async (stock, nextPaid) => {
    const symbol = stock?.symbol
    if (!symbol) return

    const paid = Math.floor(Number(nextPaid))
    if (!Number.isFinite(paid)) return

    if (paid < 1) {
      await handleRemoveStock(stock)
      return
    }

    const maxPaid = getCartMaxPaid(stock)
    if (maxPaid > 0 && paid > maxPaid) {
      await showAlert(`Only ${maxPaid} paid unit(s) fit in available inventory.`, { variant: 'error' })
      return
    }

    try {
      setError('')
      await cartService.setPaidQuantity(symbol, paid)
      await refreshCart()
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || err.response?.data || err.message || 'Failed to update quantity'
      await showAlert(typeof errorMsg === 'string' ? errorMsg : 'Failed to update quantity', {
        variant: 'error',
      })
      console.error('Error updating cart quantity:', err)
    }
  }

  if (loading) {
    return <div className="loading">Loading cart...</div>
  }

  return (
    <div className="cart-page page">
      <AppDialog />
      {receiptTransaction ? (
        <CustomerReceiptModal transaction={receiptTransaction} onClose={() => setReceiptTransaction(null)} />
      ) : null}

      <div className="cart-header">
        <div>
          <h1>My Cart</h1>
          <p className="page-subtitle">
            Scan barcode or search by company / product (e.g. Nestlé or Maggi), park carts, then checkout.
          </p>
        </div>
      </div>

      {(hasSavedCustomerName || parkedCarts.length > 0) && (
        <div className="cart-workspace card">
          <div className="cart-workspace-active">
            <span className="cart-workspace-label">Active cart</span>
            {hasSavedCustomerName ? (
              <strong className="cart-workspace-name">{activeCustomerName}</strong>
            ) : (
              <span className="cart-workspace-muted">No customer name yet</span>
            )}
            {workspaceLoading ? <span className="cart-workspace-muted">Updating…</span> : null}
          </div>

          {parkedCarts.length > 0 ? (
            <div className="parked-carts-list">
              <h3>Parked carts</h3>
              {parkedCarts.map((parked) => (
                <div key={parked.id} className="parked-cart-row">
                  <div>
                    <strong>{parked.customerName}</strong>
                    <small>
                      {parked.itemCount} item{parked.itemCount === 1 ? '' : 's'} · {formatMoney(parked.estimatedTotal)}
                    </small>
                  </div>
                  <div className="parked-cart-actions">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleResumeParked(parked)}
                      disabled={cartItems.length > 0}
                      title={cartItems.length > 0 ? 'Park or clear active cart first' : 'Resume this cart'}
                    >
                      Resume
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDiscardParked(parked)}
                    >
                      Discard
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      <div className="barcode-scan-section card">
        <div className="barcode-scan-head">
          <h2>Barcode scan</h2>
          <p>
            USB scanner: no click needed. Or tap <strong>Scan</strong> to use the camera / webcam.
          </p>
        </div>
        <form onSubmit={handleBarcodeScan} className="barcode-scan-form" autoComplete="off">
          <div className="barcode-scan-input-wrap">
            <input
              ref={scanInputRef}
              type="text"
              value={scanCode}
              onChange={(e) => {
                setScanCode(e.target.value)
                if (scanError) setScanError('')
              }}
              className="barcode-scan-input"
              placeholder="Scan barcode here…"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              disabled={scanLookingUp || !!scannedItem}
              aria-label="Barcode scan input"
            />
            <button
              type="button"
              className="btn btn-secondary barcode-scan-camera-btn"
              onClick={() => setShowCameraScan(true)}
              disabled={scanLookingUp || !!scannedItem}
              title="Open camera scanner"
              aria-label="Open camera scanner"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Scan
            </button>
          </div>
          <button type="submit" className="btn btn-primary" disabled={scanLookingUp || !scanCode.trim()}>
            {scanLookingUp ? 'Looking up…' : 'Find'}
          </button>
        </form>
        {scanError ? <div className="barcode-scan-error" role="alert">{scanError}</div> : null}
      </div>

      <BarcodeCameraModal
        open={showCameraScan}
        onClose={() => setShowCameraScan(false)}
        onDetected={handleCameraDetected}
      />

      <div className="add-stock-section">
        <h2>Add Item to Cart</h2>
        <div className="search-stock-container" ref={searchInputRef}>
          <form onSubmit={handleAddStock} className="add-stock-form">
            <div className="search-input-wrapper">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => {
                  if (searchResults.length > 0 && searchQuery.trim()) {
                    setShowResults(true)
                  }
                }}
                placeholder="Search company or product (e.g. Nestlé)…"
                required
                className="symbol-input"
              />
              {searching && (
                <span className="search-loading">Searching...</span>
              )}
            </div>
            {showResults && searchResults.length > 0 && (
              <div className="search-results-dropdown">
                {searchResults.map((stock) => (
                  <div
                    key={stock.id}
                    className="search-result-item"
                    onClick={() => handleSelectStock(stock)}
                  >
                    <div className="search-result-symbol">{stock.companyName || 'Unnamed item'}</div>
                    <div className="search-result-industry">
                      {stock.brand ? `${stock.brand} · ` : ''}
                      {formatMoney(displayPrice(stock.price))} · Qty: {stock.quantity ?? 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {showResults && searchResults.length === 0 && searchQuery.trim() && !searching && (
              <div className="search-results-dropdown">
                <div className="search-result-item no-results">
                  No products found matching "{searchQuery}"
                </div>
              </div>
            )}
            {selectedStock && (
              <div className="add-quantity-row">
                <label htmlFor="add-quantity">Quantity</label>
                <input
                  id="add-quantity"
                  type="number"
                  min={maxQuantity === 0 ? 0 : 1}
                  max={maxQuantity != null && maxQuantity > 0 ? maxQuantity : undefined}
                  value={addQuantity}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10)
                    if (!Number.isInteger(v) || v < 0) {
                      setAddQuantity(maxQuantity === 0 ? 0 : 1)
                      return
                    }
                    const capped = maxQuantity != null ? Math.min(v, maxQuantity) : v
                    setAddQuantity(capped)
                  }}
                  className="quantity-input"
                />
                {maxQuantity != null && (
                  <span className="quantity-hint">
                    Max paid qty: {maxQuantity}
                    {stockHasBogo(selectedStock) ? ` · ${dealLabel(selectedStock)}` : ''}
                  </span>
                )}
              </div>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={adding || !selectedStock || maxQuantity === 0}
            >
              {adding ? 'Adding...' : maxQuantity === 0 ? 'Out of stock' : 'Add Item'}
            </button>
          </form>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {cartItems.length > 0 && (
        <div className="cart-actions">
          <button type="button" onClick={openBuyPaymentChoice} className="btn btn-primary">
            Buy
          </button>
          <button type="button" onClick={() => openTransactionModal('Loan')} className="btn btn-secondary">
            Loan
          </button>
          <button type="button" onClick={openParkModal} className="btn btn-secondary">
            Park cart
          </button>
        </div>
      )}

      {scannedItem && (
        <div className="modal-overlay" onClick={closeScanModal}>
          <div className="modal-box scan-qty-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add scanned item</h3>
            <div className="scan-qty-details">
              <div>
                <span className="label">Product</span>
                <strong>{scannedItem.companyName || '—'}</strong>
              </div>
              <div>
                <span className="label">Barcode</span>
                <strong>{scannedItem.barcode || '—'}</strong>
              </div>
              <div>
                <span className="label">Price</span>
                <strong>{formatMoney(displayPrice(scannedItem.price))}</strong>
              </div>
              <div>
                <span className="label">Available to add</span>
                <strong>{getScanMaxQuantity(scannedItem)}</strong>
              </div>
            </div>
            {stockHasBogo(scannedItem) ? (
              <p className="scan-bogo-hint">
                {dealLabel(scannedItem) || 'Cart deal'} — quantity is paid units; free units are added
                automatically.
              </p>
            ) : null}
            <form onSubmit={handleConfirmScanAdd}>
              <div className="form-group">
                <label htmlFor="scan-quantity">Quantity *</label>
                <input
                  id="scan-quantity"
                  type="number"
                  inputMode="numeric"
                  step={1}
                  min={1}
                  max={getScanMaxQuantity(scannedItem)}
                  value={scanQuantity}
                  autoFocus
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    const maxQty = getScanMaxQuantity(scannedItem)
                    if (e.key === 'ArrowUp') {
                      e.preventDefault()
                      setScanQuantity((prev) => Math.min(maxQty, (Number(prev) || 1) + 1))
                      requestAnimationFrame(() => e.target.select())
                      return
                    }
                    if (e.key === 'ArrowDown') {
                      e.preventDefault()
                      setScanQuantity((prev) => Math.max(1, (Number(prev) || 1) - 1))
                      requestAnimationFrame(() => e.target.select())
                    }
                  }}
                  onChange={(e) => {
                    const maxQty = getScanMaxQuantity(scannedItem)
                    const raw = e.target.value
                    if (raw === '') {
                      setScanQuantity('')
                      return
                    }
                    const v = parseInt(raw, 10)
                    if (!Number.isInteger(v) || v < 1) {
                      setScanQuantity(1)
                      return
                    }
                    setScanQuantity(Math.min(v, maxQty))
                  }}
                  onBlur={() => {
                    const maxQty = getScanMaxQuantity(scannedItem)
                    const v = parseInt(scanQuantity, 10)
                    if (!Number.isInteger(v) || v < 1) setScanQuantity(1)
                    else setScanQuantity(Math.min(v, maxQty))
                  }}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeScanModal} disabled={scanAdding}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={scanAdding || getScanMaxQuantity(scannedItem) <= 0}>
                  {scanAdding ? 'Adding…' : 'Add to cart'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {notFoundBarcode && (
        <div className="modal-overlay" onClick={closeNotFoundModal}>
          <div className="modal-box scan-not-found-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Item not found</h3>
            <p className="scan-not-found-text">
              No product in inventory matches barcode <strong>{notFoundBarcode}</strong>.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={closeNotFoundModal}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleAddMissingItem}>
                Add item
              </button>
            </div>
          </div>
        </div>
      )}

      {showParkModal && (
        <div className="modal-overlay" onClick={closeParkModal}>
          <div className="modal-box park-cart-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Park this cart</h3>
            <p className="modal-hint">
              Enter the customer name to find this cart later. Other checkouts can continue meanwhile.
            </p>
            <form onSubmit={handleParkSubmit}>
              <div className="form-group">
                <label htmlFor="park-customer-name">Customer name *</label>
                <input
                  id="park-customer-name"
                  type="text"
                  value={parkName}
                  onChange={(e) => {
                    setParkName(sanitizeCustomerNameInput(e.target.value))
                    if (parkNameError) setParkNameError('')
                  }}
                  placeholder="e.g. Ramesh Kumar"
                  autoFocus
                  autoComplete="off"
                />
                {parkNameError ? (
                  <p className="modal-hint" style={{ color: 'var(--color-danger)', marginTop: '0.35rem' }}>
                    {parkNameError}
                  </p>
                ) : null}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeParkModal} disabled={parkSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={parkSubmitting}>
                  {parkSubmitting ? 'Parking…' : 'Park cart'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBuyPaymentModal && (
        <div className="modal-overlay" onClick={closeBuyPaymentModal}>
          <div className="modal-box buy-payment-modal" onClick={(e) => e.stopPropagation()}>
            <h3>How will the customer pay?</h3>
            <p className="modal-total">Total: {formatMoney(cartTotal)}</p>
            <div className="buy-payment-actions">
              <button type="button" className="btn btn-secondary" onClick={handleChooseCashBuy}>
                Cash
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleChooseCardBuy}>
                Card
              </button>
              <button type="button" className="btn btn-primary" onClick={handleChooseUpiBuy}>
                Online
              </button>
            </div>
            <div className="buy-payment-footer">
              <button type="button" className="btn btn-secondary" onClick={closeBuyPaymentModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showTransactionModal && (
        <div className="modal-overlay" onClick={closeTransactionModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>{transactionType} Transaction</h3>
            {transactionType === 'Buy' && buyPaymentMethod && (
              <p className="modal-hint">Payment: {buyPaymentMethod === 'Razorpay' ? 'Online (Razorpay)' : buyPaymentMethod}</p>
            )}
            <p className="modal-total">Total: {formatMoney(cartTotal)}</p>
            {transactionType === 'Buy' && buyPaymentMethod === 'Razorpay' && (
              <p className="modal-hint">
                After you click <strong>Pay Online</strong>, Razorpay opens in a popup. UPI QR (if shown) appears inside Razorpay, not here.
              </p>
            )}
            {transactionType === 'Buy' && buyPaymentMethod === 'Razorpay' && razorpayError && (
              <div className="error">{razorpayError}</div>
            )}
            <form onSubmit={handleTransactionSubmit}>
              {hasSavedCustomerName && activeCustomerName ? (
                <div className="saved-customer-banner">
                  <span className="label">Customer</span>
                  <strong>{activeCustomerName}</strong>
                  <p className="modal-hint" style={{ marginTop: '0.35rem' }}>
                    Name saved from parked cart — no need to enter again.
                  </p>
                </div>
              ) : (
                <div className="form-group">
                  <label htmlFor="customer-name">Customer Name *</label>
                  <input
                    id="customer-name"
                    type="text"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(sanitizeCustomerNameInput(e.target.value))
                      if (customerNameError) setCustomerNameError('')
                    }}
                    placeholder="Letters only, e.g. John Smith"
                    required
                    autoFocus
                    autoComplete="name"
                    inputMode="text"
                    aria-invalid={customerNameError ? 'true' : 'false'}
                  />
                  {customerNameError ? (
                    <p className="modal-hint" style={{ color: 'var(--color-danger)', marginTop: '0.35rem' }}>
                      {customerNameError}
                    </p>
                  ) : (
                    <p className="modal-hint" style={{ marginTop: '0.35rem' }}>
                      Only letters (A–Z) and spaces between words are allowed.
                    </p>
                  )}
                </div>
              )}
              <div className="modal-actions">
                <button type="button" onClick={closeTransactionModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={transactionSubmitting}>
                  {transactionSubmitting
                    ? buyPaymentMethod === 'Razorpay'
                      ? 'Opening...'
                      : 'Saving...'
                    : buyPaymentMethod === 'Razorpay' && transactionType === 'Buy'
                      ? 'Pay Online'
                      : `Confirm ${transactionType}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cartItems.length === 0 ? (
        <div className="empty-cart">
          <p>
            {parkedCarts.length > 0
              ? 'Active cart is empty. Resume a parked cart above, or add new items.'
              : 'Your cart is empty. Add items to get started!'}
          </p>
        </div>
      ) : (
        <div className="cart-grid">
          {cartItems.map((stock) => (
            <div key={stock.id || stock.symbol} className="cart-card">
              <div className="cart-card-header">
                <h3>{stock.companyName || 'Unnamed item'}</h3>
                <button
                  onClick={() => handleRemoveStock(stock)}
                  className="btn btn-danger btn-sm"
                >
                  Remove
                </button>
              </div>
              {stock.isBuyOneGetOne || stock.offerTitle || (stock.buyQty >= 1 && stock.getQty >= 1) ? (
                <div className="cart-offer-banner">
                  {stock.offerTitle ||
                    (stock.buyQty >= 1 && stock.getQty >= 1
                      ? `Buy ${stock.buyQty} Get ${stock.getQty} Free`
                      : 'Buy 1 Get 1 Free')}
                </div>
              ) : null}
              <div className="cart-card-body">
                <div className="cart-details">
                  <div className="cart-detail-item">
                    <span className="label">Price:</span>
                    <span className="value">{formatMoney(displayPrice(stock.price))}</span>
                  </div>
                  <div className="cart-detail-item cart-qty-row">
                    <span className="label">
                      {stock.chargeableQuantity != null &&
                      stock.chargeableQuantity !== stock.quantity
                        ? 'You pay for:'
                        : stock.isBuyOneGetOne
                          ? 'You pay for:'
                          : 'Quantity:'}
                    </span>
                    <div className="cart-qty-stepper">
                      <button
                        type="button"
                        className="cart-qty-btn"
                        disabled={getCartPaidQty(stock) <= 1}
                        onClick={() => handleCartQtyChange(stock, getCartPaidQty(stock) - 1)}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="cart-qty-value" aria-live="polite">
                        {getCartPaidQty(stock)}
                      </span>
                      <button
                        type="button"
                        className="cart-qty-btn"
                        disabled={
                          getCartMaxPaid(stock) > 0 &&
                          getCartPaidQty(stock) >= getCartMaxPaid(stock)
                        }
                        onClick={() => handleCartQtyChange(stock, getCartPaidQty(stock) + 1)}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  {stock.chargeableQuantity != null &&
                  stock.chargeableQuantity !== stock.quantity ? (
                    <div className="cart-detail-item">
                      <span className="label">In cart (incl. free):</span>
                      <span className="value">{stock.quantity != null ? stock.quantity : 1}</span>
                    </div>
                  ) : stock.isBuyOneGetOne ? (
                    <div className="cart-detail-item">
                      <span className="label">In cart (incl. free):</span>
                      <span className="value">{stock.quantity != null ? stock.quantity : 1}</span>
                    </div>
                  ) : null}
                  <div className="cart-detail-item">
                    <span className="label">Original price (MRP) ({currency}):</span>
                    <span className="value">
                      {(() => {
                        const p = displayPrice(stock.price)
                        const m = displayPrice(stock.marketCap)
                        const original = !Number.isFinite(m) || m <= 0 || m > 100000 || (Number.isFinite(p) && p > 0 && m > p * 50)
                          ? (Number.isFinite(p) && p > 0 ? p * 1.25 : m)
                          : m
                        return formatMoney(original)
                      })()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="cart-card-actions">
                <Link to={`/products/${stock.id || stock.stockId || stock.productId}`} className="btn btn-secondary btn-sm">
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Cart








