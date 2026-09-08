import { useEffect, useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { getCurrentUser } from '../services/authService'
import { useRoomContext } from '../context/RoomContext'
import { Icons } from './ui/Icons'
import './Navigation.css'

function Navigation() {
  const [user, setUser] = useState(null)
  const navigate = useNavigate()
  const { rooms, activeRoom, setActiveRoom } = useRoomContext()

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

  // Helper to extract first letter of full name
  const getUserInitial = () => {
    if (!user || !user.full_name) return 'U';
    return user.full_name.charAt(0).toUpperCase();
  };

  return (
    <nav className="navigation">
      <div className="navigation-left">
        <div className="navigation-brand">
          <Link to="/dashboard">
            Task<span>O</span>zz
          </Link>
        </div>

        <div className="context-selector-wrapper">
          <Icons.Briefcase size={14} className="context-icon" />
          <select
            value={activeRoom ? activeRoom.id : ''}
            onChange={(e) => {
              const val = e.target.value
              if (!val) {
                setActiveRoom(null)
              } else {
                const selected = rooms.find(r => String(r.id) === val)
                if (selected) setActiveRoom(selected)
              }
            }}
            className="context-selector"
            aria-label="Çalışma Alanı Seç"
          >
            <option value="">Kişisel Alan</option>
            {rooms.filter(r => r.status === 'APPROVED').map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <Icons.ChevronDown size={14} className="context-chevron" />
        </div>
      </div>

      <div className="navigation-links">
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          Dashboard
        </NavLink>
        <NavLink to="/tasks" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          Görevler
        </NavLink>
        <NavLink to="/rooms" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          Odalar
        </NavLink>
        <NavLink to="/task-requests" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          Talepler
        </NavLink>
      </div>

      <div className="navigation-right">
        {user && (
          <Link to="/profile" className="user-profile-btn" title="Profili Görüntüle">
            <div className="user-avatar">{getUserInitial()}</div>
            <span className="user-name">{user.full_name}</span>
          </Link>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="logout-btn"
          title="Çıkış Yap"
        >
          <Icons.LogOut size={16} />
        </button>
      </div>
    </nav>
  )
}

export default Navigation