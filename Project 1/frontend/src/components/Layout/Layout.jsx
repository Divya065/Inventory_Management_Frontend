import { useEffect, useState } from 'react'

import { Link, Outlet, useLocation } from 'react-router-dom'

import Sidebar from './Sidebar'

import AppTopbar from './AppTopbar'

import Footer from './Footer'

import { useAuth } from '../../contexts/AuthContext'

import './Layout.css'



const Layout = () => {

  const { isSuperAdmin, user } = useAuth()

  const location = useLocation()

  const [sidebarOpen, setSidebarOpen] = useState(false)

  const sub = user?.Subscription

  const showExpiryBanner =

    !isSuperAdmin && sub?.hasAccess && sub?.status === 'ExpiringSoon'



  useEffect(() => {

    setSidebarOpen(false)

  }, [location.pathname])



  useEffect(() => {

    if (!sidebarOpen) return undefined

    const onKey = (e) => {

      if (e.key === 'Escape') setSidebarOpen(false)

    }

    document.addEventListener('keydown', onKey)

    document.body.style.overflow = 'hidden'

    return () => {

      document.removeEventListener('keydown', onKey)

      document.body.style.overflow = ''

    }

  }, [sidebarOpen])



  return (

    <div className={`app-shell${sidebarOpen ? ' app-shell--nav-open' : ''}`}>

      <div

        className="sidebar-backdrop"

        onClick={() => setSidebarOpen(false)}

        aria-hidden={!sidebarOpen}

      />

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="app-main">

        <AppTopbar

          onMenuClick={() => setSidebarOpen((open) => !open)}

          menuOpen={sidebarOpen}

        />

        {showExpiryBanner ? (

          <div className="plan-banner">

            Your {sub.plan} plan ends in {sub.daysLeft} day{sub.daysLeft === 1 ? '' : 's'}.

            {' '}

            <Link to="/plans">Renew now</Link>

          </div>

        ) : null}

        <main className="app-content">

          <Outlet />

        </main>

        <Footer />

      </div>

    </div>

  )

}



export default Layout

