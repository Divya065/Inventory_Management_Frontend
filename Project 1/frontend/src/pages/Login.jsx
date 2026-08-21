import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import AppLogo from '../components/AppLogo'
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
        const token = sessionStorage.getItem('token')
        const user = sessionStorage.getItem('user')
        
        if (token && user) {
          let dest = '/plans'
          try {
            const parsed = JSON.parse(user)
            const roles = parsed.Roles || parsed.roles || []
            if (roles.includes('SuperAdmin')) dest = '/super-admin'
            else if (parsed.Subscription?.hasAccess) dest = '/'
          } catch {
            dest = '/plans'
          }
          navigate(dest)
        } else {
          setError('Login succeeded but the session was not saved. Try again.')
        }
      } else {
        setError(result.error || 'Invalid username or password')
      }
    } catch (err) {
      setError(err?.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-shell">
        <aside className="auth-showcase">
          <div className="auth-brand">
            <span className="auth-brand-mark">
              <AppLogo size={42} />
            </span>
            <span>Inventory Management</span>
          </div>
          <h1>Control your stock, sales, and loans from one workspace.</h1>
          <p>
            Login to open your dashboard with inventory, cart checkout, transactions, and loan tracking.
          </p>
          <div className="auth-showcase-card">
            <span>Today&apos;s workspace</span>
            <strong>Inventory · Cart · Sales · Loans</strong>
          </div>
        </aside>

        <div className="auth-card">
          <div className="auth-heading">
            <span className="auth-kicker">Welcome back</span>
            <h2 className="auth-title">Login to dashboard</h2>
            <p>Enter your credentials to continue.</p>
          </div>

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

            <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <p className="auth-footer">
            Don&apos;t have an account? <Link to="/register">Create account</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login




