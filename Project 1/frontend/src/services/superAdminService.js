import api from './api'

export const superAdminService = {
  getOverview: async () => {
    const response = await api.get('/superadmin/overview')
    return response.data
  },

  getShops: async () => {
    const response = await api.get('/superadmin/shops')
    return response.data
  },

  suspendShop: async (id) => {
    const response = await api.post(`/superadmin/shops/${id}/suspend`)
    return response.data
  },

  activateShop: async (id) => {
    const response = await api.post(`/superadmin/shops/${id}/activate`)
    return response.data
  },

  assignPlan: async (id, plan) => {
    const response = await api.post(`/superadmin/shops/${id}/assign-plan`, { plan })
    return response.data
  },
}
