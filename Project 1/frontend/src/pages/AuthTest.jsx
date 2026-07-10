import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { testAuth } from '../utils/testAuth'
import { useAppDialog } from '../hooks/useAppDialog'
import './AuthTest.css'

const AuthTest = () => {
  const { user, isAuthenticated } = useAuth()
  const { showAlert, showConfirm, AppDialog } = useAppDialog()
  const [testResults, setTestResults] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    runTests()
  }, [])

  const runTests = async () => {
    setLoading(true)
    const storageTest = testAuth.testTokenStorage()
    const requestTest = await testAuth.testTokenInRequest()
    
    setTestResults({
      storage: storageTest,
      request: requestTest,
      overall: storageTest.token && requestTest
    })
    setLoading(false)
  }

  const checkLocalStorage = () => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    
    return {
      token: token ? {
        exists: true,
        length: token.length,
        preview: token.substring(0, 50) + '...',
        full: token
      } : { exists: false },
      user: userData ? {
        exists: true,
        data: JSON.parse(userData)
      } : { exists: false }
    }
  }

  const storage = checkLocalStorage()

  return (
    <div className="auth-test-page">
      <AppDialog />
      <h1>Authentication Status</h1>
      
      <div className="test-section">
        <h2>Current Status</h2>
        <div className="status-grid">
          <div className="status-item">
            <span className="label">Authenticated:</span>
            <span className={isAuthenticated ? 'value success' : 'value error'}>
              {isAuthenticated ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="status-item">
            <span className="label">User:</span>
            <span className="value">{user ? user.UserName : 'Not logged in'}</span>
          </div>
        </div>
      </div>

      <div className="test-section">
        <h2>LocalStorage Check</h2>
        <div className="storage-info">
          <div className="info-item">
            <strong>Token:</strong>
            {storage.token.exists ? (
              <div className="token-details">
                <div>✅ Exists ({storage.token.length} characters)</div>
                <div className="token-preview">{storage.token.preview}</div>
                <button 
                  onClick={async () => {
                    await navigator.clipboard.writeText(storage.token.full)
                    await showAlert('Token copied to clipboard!', { variant: 'success' })
                  }}
                  className="btn btn-sm"
                >
                  Copy Token
                </button>
              </div>
            ) : (
              <div className="error">❌ Not found</div>
            )}
          </div>
          <div className="info-item">
            <strong>User Data:</strong>
            {storage.user.exists ? (
              <div>
                <div>✅ Exists</div>
                <pre>{JSON.stringify(storage.user.data, null, 2)}</pre>
              </div>
            ) : (
              <div className="error">❌ Not found</div>
            )}
          </div>
        </div>
      </div>

      <div className="test-section">
        <h2>Authentication Tests</h2>
        <button onClick={runTests} className="btn btn-primary" disabled={loading}>
          {loading ? 'Running Tests...' : 'Run Tests'}
        </button>
        
        {testResults && (
          <div className="test-results">
            <div className={`test-result ${testResults.storage.token ? 'success' : 'error'}`}>
              <strong>Token Storage:</strong> {testResults.storage.token ? '✅ Pass' : '❌ Fail'}
            </div>
            <div className={`test-result ${testResults.storage.user ? 'success' : 'error'}`}>
              <strong>User Storage:</strong> {testResults.storage.user ? '✅ Pass' : '❌ Fail'}
            </div>
            <div className={`test-result ${testResults.request ? 'success' : 'error'}`}>
              <strong>Backend Authorization:</strong> {testResults.request ? '✅ Pass' : '❌ Fail'}
            </div>
            <div className={`test-result ${testResults.overall ? 'success' : 'error'}`}>
              <strong>Overall:</strong> {testResults.overall ? '✅ All Tests Passed' : '❌ Some Tests Failed'}
            </div>
          </div>
        )}
      </div>

      <div className="test-section">
        <h2>Quick Actions</h2>
        <div className="actions">
          <button 
            onClick={async () => {
              console.log('Token:', localStorage.getItem('token'))
              console.log('User:', localStorage.getItem('user'))
              await showAlert('Check console (F12) for token and user data')
            }}
            className="btn btn-secondary"
          >
            Log to Console
          </button>
          <button 
            onClick={async () => {
              const ok = await showConfirm('Clear all LocalStorage data? The page will refresh.', {
                title: 'Clear LocalStorage',
                confirmText: 'Clear',
              })
              if (!ok) return
              localStorage.clear()
              await showAlert('LocalStorage cleared! Refreshing the page...', { variant: 'success' })
              window.location.reload()
            }}
            className="btn btn-danger"
          >
            Clear LocalStorage
          </button>
        </div>
      </div>
    </div>
  )
}

export default AuthTest











