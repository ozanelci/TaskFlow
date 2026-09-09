import { useEffect, useState, useRef } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { getCurrentUser } from '../services/authService'
import { useRoomContext } from '../context/RoomContext'
import { LayoutDashboard, CheckSquare, Briefcase, Inbox, User, Menu, X, LogOut, ChevronUp, Check } from 'lucide-react'
import './Navigation.css'

function Navigation() {
  const [user, setUser] = useState(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isContextOpen, setIsContextOpen] = useState(false)
  const contextMenuRef = useRef(null)
  const { rooms, activeRoom, setActiveRoom } = useRoomContext()

  useEffect(() => {
    let cancelled = false
    async function loadUser() {
      try {
        const data = await getCurrentUser()
        if (!cancelled) setUser(data)
      } catch {
        if (!cancelled) setUser(null)
      }
    }
    loadUser()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    function handleClickOutside(event) {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        setIsContextOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  
  function handleLogout() {
    localStorage.removeItem('access_token')
    window.location.href = '/login'
  }

  const getUserInitial = () => {
    if (!user || !user.full_name) return 'U'
    return user.full_name.charAt(0).toUpperCase()
  }

  const closeMenu = () => setIsMobileMenuOpen(false)

  const approvedRooms = rooms.filter(r => r.membership_status === 'APPROVED')

  return (
    <>
      {/* Mobile Top Header */}
      <div className="mobile-header">
        <div className="sidebar-brand">
          <Link to="/dashboard">
            Task<span>O</span>zz
          </Link>
        </div>
        <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile Overlay */}
      <div 
        className={`mobile-overlay ${isMobileMenuOpen ? 'open' : ''}`}
        onClick={closeMenu}
      ></div>

      {/* Sidebar */}
      <nav className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <Link to="/dashboard" onClick={closeMenu}>
              Task<span>O</span>zz
            </Link>
          </div>
          <button className="close-menu-btn" onClick={closeMenu}>
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-nav">
          <NavLink to="/dashboard" className="nav-item" onClick={closeMenu}>
            <LayoutDashboard size={18} />
            Dashboard
          </NavLink>
          <NavLink to="/tasks" className="nav-item" onClick={closeMenu}>
            <CheckSquare size={18} />
            Görevler
          </NavLink>
          <NavLink to="/rooms" className="nav-item" onClick={closeMenu}>
            <Briefcase size={18} />
            Odalar
          </NavLink>
          <NavLink to="/task-requests" className="nav-item" onClick={closeMenu}>
            <Inbox size={18} />
            Talepler
          </NavLink>
          <NavLink to="/profile" className="nav-item" onClick={closeMenu}>
            <User size={18} />
            Profil
          </NavLink>
        </div>

        <div className="sidebar-footer">
          <div className="context-selector-wrapper" ref={contextMenuRef}>
            <button 
              className="context-selector-btn"
              onClick={() => setIsContextOpen(!isContextOpen)}
              aria-expanded={isContextOpen}
            >
              <Briefcase size={14} className="context-icon" />
              <span className="context-current-name">
                {activeRoom ? activeRoom.name : 'Kişisel Alan'}
              </span>
              <ChevronUp 
                size={14} 
                className={`context-chevron ${isContextOpen ? 'open' : ''}`} 
              />
            </button>

            {isContextOpen && (
              <div className="context-popover">
                <button 
                  className={`context-option ${!activeRoom ? 'active' : ''}`}
                  onClick={() => {
                    setActiveRoom(null)
                    setIsContextOpen(false)
                    closeMenu()
                  }}
                >
                  <span className="context-option-name">Kişisel Alan</span>
                  {!activeRoom && <Check size={14} className="context-check" />}
                </button>
                
                {approvedRooms.length > 0 && <div className="context-divider"></div>}
                
                {approvedRooms.map(r => (
                  <button 
                    key={r.id}
                    className={`context-option ${activeRoom?.id === r.id ? 'active' : ''}`}
                    onClick={() => {
                      setActiveRoom(r)
                      setIsContextOpen(false)
                      closeMenu()
                    }}
                  >
                    <div className="context-option-content">
                      <span className="context-option-name">{r.name}</span>
                      <span className="context-option-role">{r.role}</span>
                    </div>
                    {activeRoom?.id === r.id && <Check size={14} className="context-check" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="user-section">
            <Link to="/profile" className="user-info" onClick={closeMenu}>
              <div className="user-avatar">{getUserInitial()}</div>
              <div className="user-details">
                <span className="user-name">{user?.full_name || 'Kullanıcı'}</span>
                <span className="user-role">{activeRoom ? 'Kurumsal' : 'Kişisel'}</span>
              </div>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="logout-btn"
              title="Çıkış Yap"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </nav>
    </>
  )
}

export default Navigation
