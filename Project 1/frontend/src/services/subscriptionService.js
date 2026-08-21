import api from './api'



export const subscriptionService = {

  getPricing: async () => {

    const response = await api.get('/subscription/pricing')

    return response.data

  },



  getMine: async () => {

    const response = await api.get('/subscription/me')

    return response.data

  },



  startTrial: async () => {

    const response = await api.post('/subscription/start-trial')

    return response.data

  },



  createRazorpayOrder: async (plan) => {

    const response = await api.post('/subscription/razorpay/order', { plan })

    return response.data

  },



  verifyRazorpayPayment: async ({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {

    const response = await api.post('/subscription/razorpay/verify', {

      razorpayOrderId,

      razorpayPaymentId,

      razorpaySignature,

    })

    return response.data

  },

}

