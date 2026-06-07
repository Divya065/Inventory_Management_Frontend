import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import './Sidebar.css'

const Icon = ({ children }) => (
  <span className="sidebar-icon" aria-hidden>{children}</span>
)

const Sidebar = () => {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const stocksActive = location.pathname.startsWith('/stocks')

  const linkClass = ({ isActive }) =>
    `sidebar-link${isActive ? ' sidebar-link--active' : ''}`

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo" aria-hidden>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h16v14H4z" />
            <path d="M8 11h8M8 15h5" />
          </svg>
        </div>
        <div>
          <span className="sidebar-brand-title">Inventory Management</span>
          <span className="sidebar-brand-sub">System</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" className={linkClass} end>
          <Icon>▣</Icon>
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/about" className={linkClass}>
          <Icon>ⓘ</Icon>
          <span>About</span>
        </NavLink>

        {isAuthenticated ? (
          <>
            <div className="sidebar-section">Operations</div>
            <NavLink to="/stocks" className={stocksActive ? 'sidebar-link sidebar-link--active' : 'sidebar-link'}>
              <Icon>▦</Icon>
              <span>Inventory</span>
            </NavLink>
            <NavLink to="/cart" className={linkClass}>
              <Icon>🛒</Icon>
              <span>Cart</span>
            </NavLink>
            <NavLink to="/transactions" className={linkClass}>
              <Icon>📋</Icon>
              <span>Transactions</span>
            </NavLink>
            <NavLink to="/loans" className={linkClass}>
              <Icon>₹</Icon>
              <span>Loans</span>
            </NavLink>
          </>
        ) : (
          <>
            <div className="sidebar-section">Account</div>
            <NavLink to="/login" className={linkClass}>
              <Icon>→</Icon>
              <span>Login</span>
            </NavLink>
            <NavLink to="/register" className={linkClass}>
              <Icon>+</Icon>
              <span>Register</span>
            </NavLink>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <p>Inventory Management</p>
      </div>
    </aside>
  )
}

export default Sidebar
