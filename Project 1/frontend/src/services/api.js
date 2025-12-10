import axios from 'axios'
import API_BASE_URL from '../config/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Prevent axios from following redirects to HTTPS
  maxRedirects: 0,
})

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    // Debug: Log the full URL being used
    console.log('API Request URL:', config.baseURL + config.url)
    
    // Log request data for POST/PUT requests
    if (config.method === 'post' || config.method === 'put' || config.method === 'patch') {
      console.log('📤 Request Data:', JSON.stringify(config.data, null, 2))
      console.log('📤 Request Headers:', config.headers)
    }
    
    // Ensure we're using relative URLs (proxy)
    if (config.url && !config.url.startsWith('http')) {
      // Good - using relative URL
    } else {
      console.warn('Warning: Using absolute URL instead of proxy!', config.url)
    }
    
    const token = sessionStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log('Token added to request:', {
        tokenLength: token.length,
        tokenPreview: token.substring(0, 50) + '...',
        fullUrl: config.baseURL + config.url
      })
    } else {
      console.error('❌ No token found in sessionStorage!')
      console.error('Please login to get a token')
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log connection errors for debugging
    if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
      console.error('Backend connection error:', error.message)
      console.error('Make sure the backend is running on http://localhost:5032')
    }
    
    // Log detailed error information
    if (error.response) {
      const token = sessionStorage.getItem('token')
      console.error('❌ API Error Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        url: error.config?.url,
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
        authorizationHeader: error.config?.headers?.Authorization ? 'Present' : 'Missing'
      })
      
      if (error.response.status === 401) {
        console.error('🔐 Authentication Failed!')
        console.error('Possible causes:')
        console.error('1. Token missing from sessionStorage')
        console.error('2. Token expired')
        console.error('3. Token invalid (created before backend restart)')
        console.error('4. Backend JWT configuration mismatch')
        console.error('')
        console.error('💡 Solution: Clear sessionStorage and login again')
        console.error('Run in console: sessionStorage.clear() then refresh and login')
      }
    }
    return Promise.reject(error)
  }
)

export default api



