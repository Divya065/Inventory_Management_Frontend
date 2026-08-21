import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import AppLogo from '../components/AppLogo'
import './Auth.css'

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
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

    const result = await register(formData.username, formData.email, formData.password)

    if (result.success) {
      const token = sessionStorage.getItem('token')
      const user = sessionStorage.getItem('user')
      
      if (token && user) {
        navigate('/plans')
      } else {
        setError('Registration successful but token not saved. Please try again.')
      }
    } else {
      setError(result.error || 'Registration failed. Please try again.')
    }

    setLoading(false)
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
          <h1>Create your business workspace in seconds.</h1>
          <p>
            Register to manage products, checkout carts, record payments, and track customer loans.
          </p>
          <div className="auth-showcase-card">
            <span>Included modules</span>
            <strong>Inventory · Razorpay · Receipts · Loans</strong>
          </div>
        </aside>

        <div className="auth-card">
          <div className="auth-heading">
            <span className="auth-kicker">New workspace</span>
            <h2 className="auth-title">Create account</h2>
            <p>Start managing your inventory professionally.</p>
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
                placeholder="Choose a username"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Enter your email"
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
                placeholder="Enter your password (min 12 characters)"
                minLength={12}
              />
              <small className="form-hint">
                Use uppercase, lowercase, digit, and special character.
              </small>
            </div>

            <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="auth-footer">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register




