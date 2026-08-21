import api from './api'

export const cartParkingService = {
  getWorkspace: async () => {
    const response = await api.get('/cart/workspace')
    return response.data
  },

  park: async (customerName) => {
    const response = await api.post('/cart/park', { customerName })
    return response.data
  },

  resume: async (id) => {
    const response = await api.post(`/cart/resume/${id}`)
    return response.data
  },

  discardParked: async (id) => {
    const response = await api.delete(`/cart/parked/${id}`)
    return response.data
  },
}
