import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { CurrencyProvider } from './contexts/CurrencyContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/Layout/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Products from './pages/Products'
import ProductDetails from './pages/ProductDetails'
import CreateProduct from './pages/CreateProduct'
import EditProduct from './pages/EditProduct'
import Cart from './pages/Cart'
import Transactions from './pages/Transactions'
import Loans from './pages/Loans'
import AboutUs from './pages/AboutUs'
import SuperAdmin from './pages/SuperAdmin'
import Plans from './pages/Plans'
import ProtectedRoute from './components/ProtectedRoute'

function RedirectStockToProduct({ suffix = '' }) {
  const { id } = useParams()
  return <Navigate to={`/products/${id}${suffix}`} replace />
}

function RootEntry() {
  const { isAuthenticated, isSuperAdmin, hasActivePlan, loading } = useAuth()

  if (loading) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/about" replace />
  }

  if (isSuperAdmin) {
    return <Navigate to="/super-admin" replace />
  }

  if (!hasActivePlan) {
    return <Navigate to="/plans" replace />
  }

  return <Home />
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <CurrencyProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route element={<Layout />}>
                <Route path="/" element={<RootEntry />} />
                <Route path="/about" element={<AboutUs />} />
                <Route path="/plans" element={<Plans />} />
                <Route path="/subscription" element={<Navigate to="/plans" replace />} />
                <Route
                  path="/super-admin"
                  element={
                    <ProtectedRoute superAdminOnly>
                      <SuperAdmin />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/products"
                  element={
                    <ProtectedRoute>
                      <Products />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/products/create"
                  element={
                    <ProtectedRoute>
                      <CreateProduct />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/products/:id"
                  element={
                    <ProtectedRoute>
                      <ProductDetails />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/products/:id/edit"
                  element={
                    <ProtectedRoute>
                      <EditProduct />
                    </ProtectedRoute>
                  }
                />
                <Route path="/stocks" element={<Navigate to="/products" replace />} />
                <Route path="/stocks/create" element={<Navigate to="/products/create" replace />} />
                <Route path="/stocks/:id/edit" element={<RedirectStockToProduct suffix="/edit" />} />
                <Route path="/stocks/:id" element={<RedirectStockToProduct />} />
                <Route
                  path="/cart"
                  element={
                    <ProtectedRoute>
                      <Cart />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/transactions"
                  element={
                    <ProtectedRoute>
                      <Transactions />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/loans"
                  element={
                    <ProtectedRoute>
                      <Loans />
                    </ProtectedRoute>
                  }
                />
              </Route>
            </Routes>
          </Router>
        </CurrencyProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App
