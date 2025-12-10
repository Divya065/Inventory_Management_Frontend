import api from './api'

export const stockService = {
  getAll: async (queryParams = {}) => {
    const response = await api.get('/stock', { params: queryParams })
    return response.data
  },

  getById: async (id) => {
    const response = await api.get(`/stock/${id}`)
    return response.data
  },

  create: async (stockData) => {
    const response = await api.post('/stock', stockData)
    return response.data
  },

  update: async (id, stockData) => {
    const response = await api.put(`/stock/${id}`, stockData)
    return response.data
  },

  delete: async (id) => {
    await api.delete(`/stock/${id}`)
  },
}














