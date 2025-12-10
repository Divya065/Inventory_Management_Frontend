// Test authentication flow
export const testAuth = {
  // Test if token is stored
  testTokenStorage: () => {
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')
    
    console.log('=== Token Storage Test ===')
    console.log('Token exists:', !!token)
    console.log('User exists:', !!user)
    
    if (token) {
      console.log('Token length:', token.length)
      console.log('Token preview:', token.substring(0, 50) + '...')
      
      // Try to decode token
      try {
        const base64Url = token.split('.')[1]
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        )
        const decoded = JSON.parse(jsonPayload)
        console.log('Token decoded:', decoded)
        console.log('Token expires:', new Date(decoded.exp * 1000).toLocaleString())
        console.log('Token expired:', decoded.exp < Date.now() / 1000)
      } catch (e) {
        console.error('Failed to decode token:', e)
      }
    }
    
    if (user) {
      try {
        const userData = JSON.parse(user)
        console.log('User data:', userData)
      } catch (e) {
        console.error('Failed to parse user data:', e)
      }
    }
    
    return { token: !!token, user: !!user }
  },
  
  // Test if token is sent in requests
  testTokenInRequest: async () => {
    console.log('=== Testing Token in Request ===')
    
    const token = localStorage.getItem('token')
    if (!token) {
      console.error('❌ No token to test!')
      return false
    }
    
    // Make a test request
    try {
      const response = await fetch('/api/stock', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log('Test request status:', response.status)
      console.log('Test request headers sent:', {
        Authorization: `Bearer ${token.substring(0, 20)}...`
      })
      
      if (response.status === 401) {
        console.error('❌ Token rejected by backend (401)')
        const text = await response.text()
        console.error('Response:', text)
        return false
      } else if (response.ok) {
        console.log('✅ Token accepted by backend!')
        return true
      } else {
        console.warn('⚠️ Unexpected status:', response.status)
        return false
      }
    } catch (error) {
      console.error('❌ Test request failed:', error)
      return false
    }
  },
  
  // Full authentication test
  runFullTest: async () => {
    console.log('=== Full Authentication Test ===')
    
    const storageTest = testAuth.testTokenStorage()
    if (!storageTest.token) {
      console.error('❌ Test failed: No token in storage')
      console.log('💡 Solution: Please login first')
      return false
    }
    
    const requestTest = await testAuth.testTokenInRequest()
    return requestTest
  }
}

// Make it available globally for easy testing
if (typeof window !== 'undefined') {
  window.testAuth = testAuth
}
