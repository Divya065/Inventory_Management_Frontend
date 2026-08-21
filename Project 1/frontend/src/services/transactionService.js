import api from './api'

const toDateParam = (d) => {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return undefined
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const transactionService = {
  getAll: async () => {
    const response = await api.get('/transaction')
    return response.data
  },

  /**
   * Buy/Loan list with date filter + pagination.
   * `to` is exclusive (send the day after the last included day).
   */
  getPaged: async ({ type = 'Buy', from, to, page = 1, pageSize = 10 } = {}) => {
    const response = await api.get('/transaction', {
      params: {
        type,
        from: from || undefined,
        to: to || undefined,
        page,
        pageSize,
      },
    })
    return response.data
  },

  todayRangeParams: () => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    return {
      from: `${toDateParam(start)}T00:00:00`,
      to: `${toDateParam(end)}T00:00:00`,
    }
  },

  /** From selected date inclusive through the next 30 days. */
  thirtyDayRangeParams: (startDateInput) => {
    const start = new Date(`${startDateInput}T00:00:00`)
    if (Number.isNaN(start.getTime())) return null
    const end = new Date(start)
    end.setDate(end.getDate() + 30)
    return {
      from: `${toDateParam(start)}T00:00:00`,
      to: `${toDateParam(end)}T00:00:00`,
    }
  },

  getById: async (id) => {
    const response = await api.get(`/transaction/${id}`)
    return response.data
  },

  getLoanSummary: async () => {
    const response = await api.get('/transaction/loans/summary')
    return response.data
  },

  /** End-of-day cash/card/online + loans. `date` = yyyy-MM-dd (defaults to today on server). */
  getDayClose: async (date) => {
    const response = await api.get('/transaction/day-close', {
      params: date ? { date } : undefined,
    })
    return response.data
  },

  getLoansByCustomer: async (customerName) => {
    const response = await api.get('/transaction/customer-loan-history', {
      params: { customerName },
    })
    return response.data
  },

  create: async (data) => {
    const response = await api.post('/transaction', data)
    return response.data
  },

  deleteAll: async () => {
    const response = await api.delete('/transaction/all')
    return response.data
  },

  deleteOne: async (id) => {
    await api.delete(`/transaction/${id}`)
  },

  revert: async (id) => {
    const response = await api.post(`/transaction/${id}/revert`)
    return response.data
  },

  deleteAllLoans: async () => {
    const response = await api.delete('/transaction/loans/all')
    return response.data
  },

  deleteAllLoansForCustomer: async (customerName) => {
    const response = await api.delete('/transaction/loans/customer', {
      params: { customerName },
    })
    return response.data
  },
}
