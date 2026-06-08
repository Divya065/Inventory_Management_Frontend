import { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../services/authService'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const syncSession = () => {
      const storedUser = sessionStorage.getItem('user')
      const token = sessionStorage.getItem('token')
      if (storedUser && token) {
        setUser(JSON.parse(storedUser))
      } else {
        sessionStorage.removeItem('user')
        sessionStorage.removeItem('token')
        setUser(null)
      }
      setLoading(false)
    }

    const handleLogout = () => {
      authService.logout()
      setUser(null)
    }

    syncSession()
    window.addEventListener('auth:logout', handleLogout)
    return () => window.removeEventListener('auth:logout', handleLogout)
  }, [])

  const login = async (username, password) => {
    try {
      const data = await authService.login(username, password)

      // Handle both PascalCase (Token) and camelCase (token) from backend
      const token = data?.Token || data?.token
      const userName = data?.UserName || data?.userName
      const email = data?.Email || data?.email
      
      // Verify token exists in response
      if (!data || !token) {
        return {
          success: false,
          error: 'Login successful but no token received. Please check backend response.',
        }
      }
      
      // Create normalized user object
      const userData = {
        UserName: userName,
        Email: email,
        Token: token
      }
      
      // Store token and user data in sessionStorage (cleared on browser close)
      sessionStorage.setItem('token', token)
      sessionStorage.setItem('user', JSON.stringify(userData))
      
      // Verify token was stored
      const storedToken = sessionStorage.getItem('token')
      if (!storedToken) {
        return {
          success: false,
          error: 'Failed to save authentication token. Please try again.',
        }
      }
      
      setUser(userData)
      return { success: true }
    } catch (error) {
      // Extract error message from backend response
      let errorMessage = 'Login failed. Please check your credentials.'
      
      if (error.response) {
        // Backend returned an error response
        const status = error.response.status
        const errorData = error.response.data

        if (status === 401) {
          // Unauthorized - invalid credentials
          if (typeof errorData === 'string') {
            errorMessage = errorData
          } else if (errorData?.message) {
            errorMessage = errorData.message
          } else {
            errorMessage = 'Invalid username or password'
          }
        } else if (status === 500) {
          errorMessage = errorData?.message || 'Server error. Please check backend logs.'
          if (errorData?.error) {
            errorMessage += ` (${errorData.error})`
          }
        } else if (errorData?.message) {
          errorMessage = errorData.message
        } else if (typeof errorData === 'string') {
          errorMessage = errorData
        } else if (errorData) {
          errorMessage = JSON.stringify(errorData)
        }
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        errorMessage = 'Cannot connect to the server. Make sure the backend is running on http://localhost:5032'
      } else if (error.message) {
        errorMessage = error.message
      }
      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  const register = async (username, email, password) => {
    try {
      const data = await authService.register(username, email, password)

      // Handle both PascalCase (Token) and camelCase (token) from backend
      const token = data?.Token || data?.token
      const userName = data?.UserName || data?.userName
      const emailData = data?.Email || data?.email
      
      // Verify token exists in response
      if (!data || !token) {
        return {
          success: false,
          error: 'Registration successful but no token received. Please check backend response.',
        }
      }
      
      // Create normalized user object
      const userData = {
        UserName: userName,
        Email: emailData,
        Token: token
      }
      
      // Store token and user data in sessionStorage (cleared on browser close)
      sessionStorage.setItem('token', token)
      sessionStorage.setItem('user', JSON.stringify(userData))
      
      // Verify token was stored
      const storedToken = sessionStorage.getItem('token')
      if (!storedToken) {
        return {
          success: false,
          error: 'Failed to save authentication token. Please try again.',
        }
      }
      
      setUser(userData)
      return { success: true }
    } catch (error) {
      // Extract error message from backend response
      let errorMessage = 'Registration failed. Please try again.'
      
      if (error.response?.data) {
        const errorData = error.response.data
        if (errorData.message) {
          errorMessage = errorData.message
        }
        if (errorData.errors && Array.isArray(errorData.errors)) {
          errorMessage = errorData.errors.join(', ')
        }
        if (typeof errorData === 'string') {
          errorMessage = errorData
        }
      } else if (error.message) {
        errorMessage = error.message
      }
      
      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  const logout = () => {
    authService.logout()
    setUser(null)
  }

  const value = {
    user,
    login,
    register,
    logout,
    isAuthenticated: !!user && !!sessionStorage.getItem('token'),
    loading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}



