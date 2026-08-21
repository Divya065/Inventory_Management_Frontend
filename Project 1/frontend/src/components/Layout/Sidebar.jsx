import { NavLink, useLocation } from 'react-router-dom'

import { useAuth } from '../../contexts/AuthContext'

import AppLogo from '../AppLogo'

import './Sidebar.css'



const Icon = ({ children }) => (

  <span className="sidebar-icon" aria-hidden>{children}</span>

)



const Sidebar = ({ open = false, onClose }) => {

  const { isAuthenticated, isSuperAdmin, hasActivePlan } = useAuth()

  const location = useLocation()

  const productsActive = location.pathname.startsWith('/products') || location.pathname.startsWith('/stocks')



  const linkClass = ({ isActive }) =>

    `sidebar-link${isActive ? ' sidebar-link--active' : ''}`



  return (

    <aside className={`sidebar${open ? ' sidebar--open' : ''}`} id="app-sidebar">

      <div className="sidebar-brand">

        <div className="sidebar-logo">

          <AppLogo size={44} />

        </div>

        <div>

          <span className="sidebar-brand-title">Inventory Management</span>

          <span className="sidebar-brand-sub">System</span>

        </div>

        <button

          type="button"

          className="sidebar-close"

          onClick={onClose}

          aria-label="Close menu"

        >

          ×

        </button>

      </div>



      <nav className="sidebar-nav" onClick={onClose}>

        {isSuperAdmin ? (

          <>

            <NavLink to="/super-admin" className={linkClass}>

              <Icon>▣</Icon>

              <span>Super Admin</span>

            </NavLink>

            <NavLink to="/about" className={linkClass}>

              <Icon>ⓘ</Icon>

              <span>About</span>

            </NavLink>

          </>

        ) : !isAuthenticated ? (

          <>

            <NavLink to="/about" className={linkClass}>

              <Icon>ⓘ</Icon>

              <span>About</span>

            </NavLink>

            <NavLink to="/plans" className={linkClass}>

              <Icon>◈</Icon>

              <span>Plans</span>

            </NavLink>

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

        ) : hasActivePlan ? (

          <>

            <NavLink to="/" className={linkClass} end>

              <Icon>▣</Icon>

              <span>Dashboard</span>

            </NavLink>

            <NavLink to="/about" className={linkClass}>

              <Icon>ⓘ</Icon>

              <span>About</span>

            </NavLink>

            <div className="sidebar-section">Operations</div>

            <NavLink to="/products" className={productsActive ? 'sidebar-link sidebar-link--active' : 'sidebar-link'}>

              <Icon>▦</Icon>

              <span>Products</span>

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

            <NavLink to="/plans" className={linkClass}>

              <Icon>◈</Icon>

              <span>Plans</span>

            </NavLink>

          </>

        ) : (

          <>

            <NavLink to="/about" className={linkClass}>

              <Icon>ⓘ</Icon>

              <span>About</span>

            </NavLink>

            <div className="sidebar-section">Account</div>

            <NavLink to="/plans" className={linkClass}>

              <Icon>◈</Icon>

              <span>Plans</span>

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

