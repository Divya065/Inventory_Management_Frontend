import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Header from './Header'
import Footer from './Footer'
import './Layout.css'

const Layout = () => {
  return (
    <div className="layout">
      <Header />
      <Navbar />
      <main className="main-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default Layout














