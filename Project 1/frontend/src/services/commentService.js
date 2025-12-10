import api from './api'

export const commentService = {
  getAll: async () => {
    const response = await api.get('/commentcontrollercs')
    return response.data
  },

  getById: async (id) => {
    const response = await api.get(`/commentcontrollercs/${id}`)
    return response.data
  },

  create: async (stockId, commentData) => {
    const response = await api.post(`/commentcontrollercs/${stockId}`, commentData)
    return response.data
  },

  update: async (id, commentData) => {
    const response = await api.put(`/commentcontrollercs/${id}`, commentData)
    return response.data
  },

  delete: async (id) => {
    await api.delete(`/commentcontrollercs/${id}`)
  },
}














