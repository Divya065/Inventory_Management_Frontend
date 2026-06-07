import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import AppTopbar from './AppTopbar'
import Footer from './Footer'
import './Layout.css'

const Layout = () => {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <AppTopbar />
        <main className="app-content">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  )
}

export default Layout
