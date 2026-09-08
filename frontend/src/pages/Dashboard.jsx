import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getCurrentUser } from '../services/authService'
import {
  getTasks,
  getPersonnel,
  getTaskSummary
} from '../services/taskService'
import { useRoomContext } from '../context/RoomContext'
import './Dashboard.css'

// Inline SVG Icons (Lucide)
const Icons = {
  CircleDashed: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.1 2.182a10 10 0 0 1 3.8 0"/><path d="M17.6 5.266a10 10 0 0 1 2.902 2.902"/><path d="M21.818 10.1a10 10 0 0 1 0 3.8"/><path d="M18.734 17.6a10 10 0 0 1-2.902 2.902"/><path d="M13.9 21.818a10 10 0 0 1-3.8 0"/><path d="M8.734 18.734a10 10 0 0 1-2.902-2.902"/><path d="M2.182 13.9a10 10 0 0 1 0-3.8"/><path d="M5.266 6.266a10 10 0 0 1 2.902-2.902"/></svg>
  ),
  Activity: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
  ),
  AlertCircle: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
  ),
  CheckCircle2: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
  ),
  Calendar: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
  ),
  Briefcase: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
  ),
  Inbox: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
  )
}

function getInitials(name) {
  if (!name) return 'U'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

function Dashboard() {
  const { activeRoom } = useRoomContext()

  const [user, setUser] = useState(null)
  const [summary, setSummary] = useState(null)
  
  // Selected Context Data
  const [selectedStatus, setSelectedStatus] = useState(null)
  const [selectedTasks, setSelectedTasks] = useState([])
  const [isTasksLoading, setIsTasksLoading] = useState(false)
  
  // Admin Data
  const [personnel, setPersonnel] = useState([])
  const [selectedPersonnel, setSelectedPersonnel] = useState(null)
  
  // Main Load State
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const handleStatusClick = useCallback(async (status, force = false) => {
    if (selectedStatus === status && !force) {
      return
    }
    
    setSelectedStatus(status)
    setSelectedPersonnel(null)
    setIsTasksLoading(true)
    
    try {
      let params = { 
        page: 0, 
        pageSize: 100, 
        room_id: activeRoom ? activeRoom.id : undefined 
      }
      
      if (status === 'OVERDUE') {
        params.deadline_status = 'OVERDUE'
      } else {
        params.status = status
      }
      
      const data = await getTasks(params)
      setSelectedTasks(data.tasks || [])
    } catch (err) {
      console.error(err)
      setSelectedTasks([])
    } finally {
      setIsTasksLoading(false)
    }
  }, [activeRoom, selectedStatus])

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const userData = await getCurrentUser()
      const summaryData = await getTaskSummary(activeRoom ? activeRoom.id : undefined)

      setUser(userData)
      setSummary(summaryData)

      if (activeRoom?.role === 'ADMIN') {
        const personnelData = await getPersonnel(activeRoom.id)
        setPersonnel(personnelData)
      } else {
        setPersonnel([])
      }
      
      // Auto-select IN_PROGRESS if we have any, otherwise TODO
      if (summaryData.in_progress > 0) {
        handleStatusClick('IN_PROGRESS', true)
      } else {
        handleStatusClick('TODO', true)
      }
      
    } catch (err) {
      console.error(err)
      setError('Dashboard verileri alınamadı.')
    } finally {
      setLoading(false)
    }
  }, [activeRoom, handleStatusClick])

  useEffect(() => {
    // eslint-disable-next-line
    loadDashboard()
    setSelectedPersonnel(null)
  }, [loadDashboard])

  async function handlePersonnelClick(person) {
    if (selectedPersonnel?.id === person.id) {
      setSelectedPersonnel(null)
      // Revert to selected status tasks
      if (selectedStatus) {
        handleStatusClick(selectedStatus, true)
      }
      return
    }
    
    setSelectedPersonnel(person)
    setSelectedStatus(null) // Clear status selection
    setIsTasksLoading(true)
    
    try {
      const data = await getTasks({
        assigned_to: person.id,
        room_id: activeRoom.id,
        page: 0,
        pageSize: 100
      })
      setSelectedTasks(data.tasks || [])
    } catch (err) {
      console.error(err)
      setSelectedTasks([])
    } finally {
      setIsTasksLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="dashboard">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Dashboard hazırlanıyor...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="dashboard">
        <div className="error-state">
          <Icons.AlertCircle className="error-icon" />
          <p>{error}</p>
          <button onClick={loadDashboard} style={{marginTop: 16, padding: '8px 16px', borderRadius: 8, border: '1px solid #ccc', background: '#fff', cursor: 'pointer'}}>Tekrar Dene</button>
        </div>
      </main>
    )
  }

  const getStatusConfig = (status) => {
    switch (status) {
      case 'TODO': return { label: 'To Do', className: 'status-todo', icon: <Icons.CircleDashed /> }
      case 'IN_PROGRESS': return { label: 'In Progress', className: 'status-progress', icon: <Icons.Activity /> }
      case 'OVERDUE': return { label: 'Overdue', className: 'status-overdue', icon: <Icons.AlertCircle /> }
      case 'DONE': return { label: 'Done', className: 'status-done', icon: <Icons.CheckCircle2 /> }
      default: return { label: 'Görevler', className: '', icon: <Icons.CircleDashed /> }
    }
  }

  const renderTaskRow = (task) => {
    const priorityClass = 
      task.priority === 'HIGH' ? 'badge-high' :
      task.priority === 'MEDIUM' ? 'badge-medium' : 'badge-low'
      
    const priorityLabel = 
      task.priority === 'HIGH' ? 'Yüksek' :
      task.priority === 'MEDIUM' ? 'Orta' : 'Düşük'

    return (
      <Link to={`/tasks/${task.id}`} className="task-row" key={task.id}>
        <div className="task-title-group">
          <h4 className="task-title">{task.title}</h4>
          {task.description && (
            <p className="task-desc">{task.description}</p>
          )}
        </div>
        
        <div className="task-meta">
          <Icons.Calendar />
          <span>{task.due_date ? new Date(task.due_date).toLocaleDateString('tr-TR') : 'Tarih Yok'}</span>
        </div>
        
        <div className="task-meta">
          <span className={`task-badge ${priorityClass}`}>{priorityLabel}</span>
        </div>
        
        <div className="task-assignee">
          <div className="avatar">
             {/* If we had the actual assignee name, we would put it here.
                 For now, we just use a generic or the logged in user's initial if assigned to them.
                 If it's a corporate room, we can guess the initial. We'll just put 'U' or task assignee id */}
             {task.assigned_to === user.id ? getInitials(user.full_name) : getInitials('Personel')}
          </div>
        </div>
      </Link>
    )
  }

  const myCompletionRate = summary.my_total > 0
    ? Math.round((summary.my_done / summary.my_total) * 100)
    : 0

  const teamTotal = summary.total
  const teamDone = summary.done
  const teamCompletionRate = teamTotal > 0
    ? Math.round((teamDone / teamTotal) * 100)
    : 0

  return (
    <main className="dashboard">
      <div className="dashboard-header">
        <div className="dashboard-header-left">
          <h1>Merhaba, {user?.full_name?.split(' ')[0] || 'Kullanıcı'} 👋</h1>
          <p>Bugün işler nasıl gidiyor? İşte görevlerinin özeti.</p>
        </div>
        
        <div className="dashboard-context-badge">
          <Icons.Briefcase />
          <span>{activeRoom ? activeRoom.name : 'Kişisel Alan'}</span>
        </div>
      </div>

      <div className="dashboard-summary-cards">
        {['TODO', 'IN_PROGRESS', 'OVERDUE', 'DONE'].map(status => {
          const config = getStatusConfig(status)
          const isActive = selectedStatus === status
          const count = summary[status.toLowerCase()] || 0

          return (
            <div 
              key={status} 
              className={`status-card ${config.className} ${isActive ? 'active' : ''}`}
              onClick={() => handleStatusClick(status)}
            >
              <div className="status-card-header">
                <div className="status-icon-box">
                  {config.icon}
                </div>
                <h3>{config.label}</h3>
              </div>
              <div className="status-count">{count}</div>
            </div>
          )
        })}
      </div>

      <section className="selected-tasks-area">
        <div className="selected-tasks-header">
          <h2>
            {selectedPersonnel ? (
              <>{selectedPersonnel.full_name} Görevleri</>
            ) : selectedStatus ? (
              <>{getStatusConfig(selectedStatus).label} Görevleri</>
            ) : (
              <>Görevler</>
            )}
          </h2>
        </div>

        {isTasksLoading ? (
           <div className="loading-state">
             <div className="loading-spinner"></div>
           </div>
        ) : selectedTasks.length === 0 ? (
          <div className="empty-state">
            <Icons.Inbox />
            <h3>Bu durumda henüz görev yok</h3>
            <p>Yeni bir görev ekleyerek çalışmaya başlayabilirsiniz.</p>
          </div>
        ) : (
          <div className="tasks-list">
            {selectedTasks.map(renderTaskRow)}
          </div>
        )}
      </section>

      {/* ADMIN Section preserved as requested, cleaned up */}
      {activeRoom?.role === 'ADMIN' && (
        <section className="admin-area">
          <div className="admin-card">
            <h2>Ekip Başarısı</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Senin Tamamlanma Oranın</span>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--success)' }}>%{myCompletionRate}</div>
              </div>
              <div style={{ height: 1, background: 'var(--border-light)' }}></div>
              <div>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Genel Ekip Başarısı</span>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary)' }}>%{teamCompletionRate}</div>
              </div>
            </div>
          </div>

          <div className="admin-card">
            <h2>Personeller</h2>
            {personnel.length > 0 ? (
              <div className="personnel-list">
                {personnel.map(person => (
                  <div 
                    key={person.id} 
                    className={`personnel-item ${selectedPersonnel?.id === person.id ? 'active' : ''}`}
                    onClick={() => handlePersonnelClick(person)}
                  >
                    <div className="avatar" style={{ marginRight: 12 }}>
                      {getInitials(person.full_name)}
                    </div>
                    {person.full_name}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Henüz odada personel bulunmuyor.</p>
            )}
          </div>
        </section>
      )}
    </main>
  )
}

export default Dashboard