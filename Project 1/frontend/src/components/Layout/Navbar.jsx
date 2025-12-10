import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import './Navbar.css'

const Navbar = () => {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  // Check if current path starts with /stocks (for stock details, create, edit pages)
  const isStocksActive = location.pathname.startsWith('/stocks')

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <ul className="nav-links">
          <li>
            <NavLink 
              to="/" 
              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              end
            >
              Home
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/about" 
              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
            >
              About Us
            </NavLink>
          </li>
          {isAuthenticated ? (
            <>
              <li>
                <NavLink 
                  to="/stocks" 
                  className={isStocksActive ? 'nav-link active' : 'nav-link'}
                >
                  Stocks
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/portfolio" 
                  className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                >
                  Portfolio
                </NavLink>
              </li>
            </>
          ) : (
            <>
              <li>
                <NavLink 
                  to="/login" 
                  className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                >
                  Login
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/register" 
                  className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                >
                  Register
                </NavLink>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  )
}

export default Navbar




