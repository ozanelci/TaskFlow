import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getCurrentUser } from '../services/authService'
import Navigation from './Navigation'

function ProtectedRoute({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadUser() {
      try {
        const data = await getCurrentUser()

        if (!cancelled) {
          setUser(data)
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setUser(null)
          setLoading(false)
        }
      }
    }

    loadUser()

    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <main>
        <p>Yükleniyor...</p>
      </main>
    )
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }

  return (
    <div className="taskozz-app-layout">
      <Navigation />
      <main className="app-main-content">
        {children}
      </main>
    </div>
  )
}

export default ProtectedRoute