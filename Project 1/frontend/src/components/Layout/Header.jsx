import { useState, useEffect, useRef } from 'react'
import { useNavigate, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import './Header.css'

const Header = () => {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const menuRef = useRef(null)

  const isStocksActive = location.pathname.startsWith('/stocks')

  const handleLogout = () => {
    logout()
    setShowUserMenu(false)
    navigate('/')
  }

  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu)
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-brand">
          <div className="header-logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 10L16 6L26 10V24C26 25.1 25.1 26 24 26H8C6.9 26 6 25.1 6 24V10Z" fill="white" fillOpacity="0.95"/>
              <path d="M6 10L16 6L26 10" stroke="#667eea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="9" y="13" width="5" height="5" rx="1" fill="#667eea"/>
              <rect x="18" y="13" width="5" height="5" rx="1" fill="#667eea"/>
              <rect x="9" y="19" width="5" height="5" rx="1" fill="#667eea"/>
              <rect x="18" y="19" width="5" height="5" rx="1" fill="#667eea"/>
            </svg>
          </div>
          <h1 className="header-title">Inventory Management</h1>
        </div>

        <nav className="header-nav">
          <ul className="header-nav-links">
            <li>
              <NavLink
                to="/"
                className={({ isActive }) => isActive ? 'header-nav-link active' : 'header-nav-link'}
                end
              >
                Home
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/about"
                className={({ isActive }) => isActive ? 'header-nav-link active' : 'header-nav-link'}
              >
                About Us
              </NavLink>
            </li>
            {isAuthenticated ? (
              <>
                <li>
                  <NavLink
                    to="/stocks"
                    className={isStocksActive ? 'header-nav-link active' : 'header-nav-link'}
                  >
                    Inventory
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/cart"
                    className={({ isActive }) => isActive ? 'header-nav-link active' : 'header-nav-link'}
                  >
                    Cart
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/transactions"
                    className={({ isActive }) => isActive ? 'header-nav-link active' : 'header-nav-link'}
                  >
                    Transactions
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/loans"
                    className={({ isActive }) => isActive ? 'header-nav-link active' : 'header-nav-link'}
                  >
                    Loan
                  </NavLink>
                </li>
              </>
            ) : (
              <>
                <li>
                  <NavLink
                    to="/login"
                    className={({ isActive }) => isActive ? 'header-nav-link active' : 'header-nav-link'}
                  >
                    Login
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/register"
                    className={({ isActive }) => isActive ? 'header-nav-link active' : 'header-nav-link'}
                  >
                    Register
                  </NavLink>
                </li>
              </>
            )}
          </ul>
        </nav>

        <div className="header-right">
          <div className="header-user">
          {isAuthenticated && user ? (
            <div className="user-menu-container" ref={menuRef}>
              <div className="user-info">
                <div className="user-avatar" onClick={toggleUserMenu}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="currentColor"/>
                    <path d="M12.0002 14.5C6.99016 14.5 2.91016 17.86 2.91016 22C2.91016 22.28 3.13016 22.5 3.41016 22.5H20.5902C20.8702 22.5 21.0902 22.28 21.0902 22C21.0902 17.86 17.0102 14.5 12.0002 14.5Z" fill="currentColor"/>
                  </svg>
                </div>
                <div className="user-welcome">
                  <div className="welcome-label">Welcome</div>
                  <div className="welcome-username">
                    {user.UserName || user.userName || 'User'}
                  </div>
                </div>
              </div>
              {showUserMenu && (
                <div className="user-dropdown">
                  <button onClick={handleLogout} className="dropdown-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17 7L15.59 8.41L18.17 11H8V13H18.17L15.59 15.59L17 17L22 12L17 7ZM4 5H12V3H4C2.9 3 2 3.9 2 5V19C2 20.1 2.9 21 4 21H12V19H4V5Z" fill="currentColor"/>
                    </svg>
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="user-info guest">
              <span>Guest User</span>
            </div>
          )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
