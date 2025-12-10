// Helper to check and validate token
export const tokenHelper = {
  getToken: () => {
    return sessionStorage.getItem('token')
  },
  
  hasToken: () => {
    const token = sessionStorage.getItem('token')
    return token !== null && token !== undefined && token !== ''
  },
  
  clearToken: () => {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
  },
  
  // Decode JWT token (without verification, just to see contents)
  decodeToken: (token) => {
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
      return JSON.parse(jsonPayload)
    } catch (e) {
      console.error('Error decoding token:', e)
      return null
    }
  },
  
  isTokenExpired: (token) => {
    const decoded = tokenHelper.decodeToken(token)
    if (!decoded || !decoded.exp) return true
    const currentTime = Date.now() / 1000
    return decoded.exp < currentTime
  }
}










