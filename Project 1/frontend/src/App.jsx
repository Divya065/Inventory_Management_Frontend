import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Stocks from './pages/Stocks'
import StockDetails from './pages/StockDetails'
import CreateStock from './pages/CreateStock'
import EditStock from './pages/EditStock'
import Portfolio from './pages/Portfolio'
import AboutUs from './pages/AboutUs'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<AboutUs />} />
            <Route 
              path="/stocks" 
              element={
                <ProtectedRoute>
                  <Stocks />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/stocks/:id" 
              element={
                <ProtectedRoute>
                  <StockDetails />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/stocks/create" 
              element={
                <ProtectedRoute>
                  <CreateStock />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/stocks/:id/edit" 
              element={
                <ProtectedRoute>
                  <EditStock />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/portfolio" 
              element={
                <ProtectedRoute>
                  <Portfolio />
                </ProtectedRoute>
              } 
            />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App




