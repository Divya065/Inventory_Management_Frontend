import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Auth.css'

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await login(formData.username, formData.password)

      if (result.success) {
        // Verify token is stored before navigating
        const token = sessionStorage.getItem('token')
        const user = sessionStorage.getItem('user')
        
        if (token && user) {
          console.log('✅ Login successful!')
          console.log('Token stored:', token.substring(0, 30) + '...')
          console.log('User stored:', JSON.parse(user))
          console.log('Navigating to stocks...')
          
          // Small delay to ensure state is updated
          setTimeout(() => {
            navigate('/stocks')
          }, 100)
        } else {
          setError('Login successful but token not saved. Please try again.')
          console.error('❌ Token missing after login!', { token: !!token, user: !!user })
        }
      } else {
        const errorMsg = result.error || 'Login failed. Please try again.'
        setError(errorMsg)
        console.error('Login failed with error:', errorMsg)
        console.error('Check browser console (F12) for more details')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Login</h2>
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="Enter your username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  )
}

export default Login




