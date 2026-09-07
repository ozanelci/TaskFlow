import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getCurrentUser } from '../services/authService'
import './Navigation.css'

function Navigation() {
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    async function loadUser() {
      try {
        const data = await getCurrentUser()

        if (!cancelled) {
          setUser(data)
        }
      } catch {
        if (!cancelled) {
          setUser(null)
        }
      }
    }

    loadUser()

    return () => {
      cancelled = true
    }
  }, [])

  function handleLogout() {
    localStorage.removeItem('access_token')
    navigate('/login')
  }

  return (
    <nav className="navigation">

      <div className="navigation-brand">
        <Link to="/dashboard">
          TaskOzz
        </Link>
      </div>

      <Link to="/rooms">
  Odalar
</Link>

      <div className="navigation-links">

        <Link to="/dashboard">
          Dashboard
        </Link>

        <Link to="/tasks">
          Görevler
        </Link>

        <Link to="/task-requests">
          Görev Talepleri
        </Link>

        {user?.role === 'ADMIN' && (
          <Link to="/users">
            Kullanıcılar
          </Link>
        )}

      </div>

      <div className="navigation-user">

        {user && (
          <span>
            {user.full_name}
          </span>
        )}

        <button
          type="button"
          onClick={handleLogout}
        >
          Çıkış
        </button>

      </div>

    </nav>
  )
}

export default Navigation