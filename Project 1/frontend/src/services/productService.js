import api from './api'

export const productService = {
  getAll: async (queryParams = {}) => {
    const params = { PageSize: 250, ...queryParams, _: Date.now() }
    const response = await api.get('/product', {
      params,
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    })
    return response.data
  },

  getById: async (id) => {
    const response = await api.get(`/product/${id}`)
    return response.data
  },

  getBySymbol: async (symbol) => {
    const code = encodeURIComponent(String(symbol || '').trim())
    const response = await api.get(`/product/by-symbol/${code}`)
    return response.data
  },

  getByBarcode: async (barcode) => {
    const code = encodeURIComponent(String(barcode || '').trim())
    const response = await api.get(`/product/by-barcode/${code}`)
    return response.data
  },

  create: async (productData) => {
    const response = await api.post('/product', productData)
    return response.data
  },

  update: async (id, productData) => {
    const response = await api.put(`/product/${id}`, productData)
    return response.data
  },

  delete: async (id) => {
    await api.delete(`/product/${id}`)
  },
}
