// Use relative URL to leverage Vite proxy
// If you see requests going to https://localhost:7167, the frontend wasn't restarted!
const API_BASE_URL = '/api'

// Force check - this should never be an absolute HTTPS URL
if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
  console.warn('Frontend is running on HTTPS. Make sure Vite proxy is configured correctly.')
}

export default API_BASE_URL



