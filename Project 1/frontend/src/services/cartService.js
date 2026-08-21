import api from './api'

export const cartService = {
  getUserCart: async () => {
    const response = await api.get('/Cart')
    return response.data
  },

  addToCart: async (symbol, quantity = 1) => {
    const response = await api.post('/Cart', null, {
      params: { symbol, quantity },
    })
    return response.data
  },

  /** Set paid quantity for a cart line. paidQuantity < 1 removes the item. */
  setPaidQuantity: async (symbol, paidQuantity) => {
    const response = await api.put('/Cart', null, {
      params: { symbol, paidQuantity },
    })
    return response.data
  },

  removeFromCart: async (symbol) => {
    await api.delete('/Cart', {
      params: { symbol },
    })
  },
}
