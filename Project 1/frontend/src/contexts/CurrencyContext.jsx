import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const CurrencyContext = createContext(null)

const STORAGE_KEY = 'inventory-management.currency'

// Base data in the app is treated as INR, then converted for display.
// Keep rates simple + stable for demos (no external API calls).
const RATES_FROM_INR = {
  INR: 1,
  AUD: 0.018, // ~ demo rate
  USD: 0.012, // ~ demo rate
  EUR: 0.011, // ~ demo rate
}

const LOCALE_FOR = {
  INR: 'en-IN',
  AUD: 'en-AU',
  USD: 'en-US',
  EUR: 'en-IE',
}

const readStoredCurrency = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && RATES_FROM_INR[saved]) return saved
  } catch {
    // ignore
  }
  return 'INR'
}

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrency] = useState(readStoredCurrency)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, currency)
    } catch {
      // ignore
    }
  }, [currency])

  const value = useMemo(() => {
    const rate = RATES_FROM_INR[currency] ?? 1
    const locale = LOCALE_FOR[currency] ?? 'en-IN'

    const convertFromInr = (amount) => {
      const n = Number(amount)
      if (Number.isNaN(n)) return 0
      return n * rate
    }

    const convertToInr = (amount) => {
      const n = Number(amount)
      if (Number.isNaN(n)) return 0
      // Avoid divide-by-zero and keep demo stable
      if (!rate) return n
      return n / rate
    }

    const formatMoney = (amount) => {
      const n = convertFromInr(amount)
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(n)
    }

    const formatCompactMoney = (amount) => {
      const n = convertFromInr(amount)
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(n)
    }

    return {
      currency,
      setCurrency,
      formatMoney,
      formatCompactMoney,
      convertFromInr,
      convertToInr,
      supported: Object.keys(RATES_FROM_INR),
    }
  }, [currency])

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext)
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider')
  return ctx
}
