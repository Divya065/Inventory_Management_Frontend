import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useCurrency } from '../../contexts/CurrencyContext'
import { useTheme } from '../../contexts/ThemeContext'
import './AppTopbar.css'

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/super-admin': 'Super Admin',
  '/products': 'Products',
  '/cart': 'Cart',
  '/transactions': 'Transactions',
  '/loans': 'Loans',
  '/plans': 'Plans',
  '/subscription': 'Plans',
  '/about': 'About',
  '/login': 'Sign in',
  '/register': 'Register',
}

const getPageTitle = (pathname) => {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  if (pathname.startsWith('/products/create') || pathname.startsWith('/stocks/create')) return 'Add item'
  if (pathname.match(/^\/products\/\d+\/edit$/) || pathname.match(/^\/stocks\/\d+\/edit$/)) return 'Edit item'
  if (pathname.match(/^\/products\/\d+$/) || pathname.match(/^\/stocks\/\d+$/)) return 'Item details'
  return 'Inventory Management'
}

const AppTopbar = ({ onMenuClick, menuOpen = false }) => {
  const { user, isAuthenticated, isSuperAdmin, hasActivePlan, logout } = useAuth()
  const { currency, setCurrency, supported } = useCurrency()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [showMenu, setShowMenu] = useState(false)
  const [currencyOpen, setCurrencyOpen] = useState(false)
  const menuRef = useRef(null)
  const currencyRef = useRef(null)
  const pageTitle = getPageTitle(location.pathname)

  useEffect(() => {
    const onOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false)
      if (currencyRef.current && !currencyRef.current.contains(e.target)) setCurrencyOpen(false)
    }
    if (showMenu || currencyOpen) document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [showMenu, currencyOpen])

  const handleLogout = () => {
    logout()
    setShowMenu(false)
    navigate('/')
  }

  return (
    <header className="app-topbar">
      <div className="app-topbar-context">
        <button
          type="button"
          className={`app-topbar-menu${menuOpen ? ' is-open' : ''}`}
          onClick={onMenuClick}
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          aria-controls="app-sidebar"
        >
          <span />
          <span />
          <span />
        </button>
        <span className="app-topbar-app-name">Inventory Management</span>
        <span className="app-topbar-sep" aria-hidden>/</span>
        <span className="app-topbar-page">{pageTitle}</span>
      </div>
      {isAuthenticated && (
        <div className="app-topbar-center">
          <span className="app-topbar-status-dot" />
          <span>Live workspace</span>
        </div>
      )}
      <div className="app-topbar-actions" ref={menuRef}>
        {isAuthenticated && user ? (
          <>
            <button
              type="button"
              className="app-topbar-theme"
              onClick={toggle}
              title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              aria-label="Toggle dark theme"
            >
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
            <div className="app-topbar-currency" ref={currencyRef} title="Currency for dashboard totals">
              <span className="app-topbar-currency-label">Currency</span>
              <button
                type="button"
                className="app-topbar-currency-trigger"
                onClick={() => setCurrencyOpen((open) => !open)}
                aria-haspopup="listbox"
                aria-expanded={currencyOpen}
                aria-label="Select currency"
              >
                <span className="app-topbar-currency-value">{currency}</span>
                <span className="app-topbar-currency-chevron" aria-hidden />
              </button>
              {currencyOpen && (
                <div className="app-topbar-currency-menu" role="listbox" aria-label="Currency options">
                  {supported.map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="option"
                      aria-selected={c === currency}
                      className={`app-topbar-currency-option${c === currency ? ' is-active' : ''}`}
                      onClick={() => {
                        setCurrency(c)
                        setCurrencyOpen(false)
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {!isSuperAdmin && hasActivePlan && (
            <Link to="/cart" className="app-topbar-new-sale">
              New sale
            </Link>
            )}
            <button type="button" className="app-topbar-user" onClick={() => setShowMenu(!showMenu)}>
              <span className="app-topbar-avatar">
                {(user.UserName || user.userName || 'U').charAt(0).toUpperCase()}
              </span>
              <span className="app-topbar-meta">
                <span className="app-topbar-label">Account</span>
                <span className="app-topbar-name">{user.UserName || user.userName || 'User'}</span>
              </span>
            </button>
            {showMenu && (
              <div className="app-topbar-dropdown">
                <button type="button" onClick={handleLogout}>
                  Sign out
                </button>
              </div>
            )}
          </>
        ) : (
          <span className="app-topbar-guest">Guest session</span>
        )}
      </div>
    </header>
  )
}

export default AppTopbar
