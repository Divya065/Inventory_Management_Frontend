import api from './api'

export const paymentService = {
  getUpiSettings: async () => {
    const response = await api.get('/payment/upi-settings')
    return response.data
  },

  getRazorpayConfig: async () => {
    const response = await api.get('/payment/razorpay/config')
    return response.data
  },

  createRazorpayOrder: async ({ customerName }) => {
    const response = await api.post('/payment/razorpay/order', { customerName })
    return response.data
  },

  verifyRazorpayPayment: async ({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
    const response = await api.post('/payment/razorpay/verify', {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    })
    return response.data
  },
}
