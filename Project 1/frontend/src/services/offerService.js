import api from './api'

export const offerService = {
  getAll: async () => {
    const response = await api.get('/offer')
    return response.data
  },

  getById: async (id) => {
    const response = await api.get(`/offer/${id}`)
    return response.data
  },

  create: async (stockId, offerData) => {
    const response = await api.post(`/offer/${stockId}`, offerData)
    return response.data
  },

  update: async (id, offerData) => {
    const response = await api.put(`/offer/${id}`, offerData)
    return response.data
  },

  delete: async (id) => {
    await api.delete(`/offer/${id}`)
  },
}
