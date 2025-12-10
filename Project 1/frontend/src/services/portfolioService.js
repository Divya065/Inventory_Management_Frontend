import api from './api'

export const portfolioService = {
  getUserPortfolio: async () => {
    const response = await api.get('/Portfolio')
    return response.data
  },

  addToPortfolio: async (symbol) => {
    const response = await api.post('/Portfolio', null, {
      params: { symbol },
    })
    return response.data
  },

  removeFromPortfolio: async (symbol) => {
    await api.delete('/Portfolio', {
      params: { symbol },
    })
  },
}














