import api from './api'

export const transactionService = {
  getAll: async () => {
    const response = await api.get('/transaction')
    return response.data
  },

  getById: async (id) => {
    const response = await api.get(`/transaction/${id}`)
    return response.data
  },

  /** Loan summary per person: total loan = sum of all their Loan transactions */
  getLoanSummary: async () => {
    const response = await api.get('/transaction/loans/summary')
    return response.data
  },

  /** All loan/payment transactions for one customer (for detail view) */
  getLoansByCustomer: async (customerName) => {
    const response = await api.get('/transaction/customer-loan-history', {
      params: { customerName }
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

  /** Delete all Loan and LoanPayment transactions for the current user */
  deleteAllLoans: async () => {
    const response = await api.delete('/transaction/loans/all')
    return response.data
  },

  /** Delete all loan/payment records for one customer */
  deleteAllLoansForCustomer: async (customerName) => {
    const response = await api.delete('/transaction/loans/customer', {
      params: { customerName }
    })
    return response.data
  },
}
