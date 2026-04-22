import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Home.css'

const Home = () => {
  const { isAuthenticated } = useAuth()

  return (
    <div className="home">
      <div className="home-hero">
        <h1 className="home-title">Welcome to Inventory Management</h1>
        <p className="home-subtitle">
          Manage your inventory, track items, and organize your business assets efficiently.
        </p>
        {!isAuthenticated && (
          <div className="home-actions">
            <Link to="/register" className="btn btn-primary">
              Register
            </Link>
            <Link to="/login" className="btn btn-secondary">
              Login
            </Link>
          </div>
        )}
        {isAuthenticated && (
          <div className="home-actions">
            <Link to="/stocks" className="btn btn-primary">
              View Inventory
            </Link>
            <Link to="/cart" className="btn btn-secondary">
              My Cart
            </Link>
          </div>
        )}
      </div>

      <div className="home-features">
        <div className="feature-card">
          <h3>Inventory Management</h3>
          <p>View, create, and manage your inventory items with ease.</p>
        </div>
        <div className="feature-card">
          <h3>Cart</h3>
          <p>Keep track of all your inventory items in one place.</p>
        </div>
        <div className="feature-card">
          <h3>Team Collaboration</h3>
          <p>Share and read offers about inventory items with your team.</p>
        </div>
      </div>
    </div>
  )
}

export default Home













