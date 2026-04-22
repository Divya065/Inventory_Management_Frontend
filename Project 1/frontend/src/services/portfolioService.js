import api from './api'

export const portfolioService = {
  getUserPortfolio: async () => {
    const response = await api.get('/Portfolio')
    return response.data
  },

  addToPortfolio: async (symbol, quantity = 1) => {
    const response = await api.post('/Portfolio', null, {
      params: { symbol, quantity },
    })
    return response.data
  },

  removeFromPortfolio: async (symbol) => {
    await api.delete('/Portfolio', {
      params: { symbol },
    })
  },
}














