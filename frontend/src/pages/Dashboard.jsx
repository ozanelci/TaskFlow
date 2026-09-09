import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getCurrentUser } from '../services/authService'
import { getTasks, getPersonnel, getTaskSummary } from '../services/taskService'
import { useRoomContext } from '../context/RoomContext'
import { 
  CircleDashed, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  Briefcase, 
  Inbox, 
  AlertCircle 
} from 'lucide-react'
import './Dashboard.css'

function Dashboard() {
  const [user, setUser] = useState(null)
  const [summary, setSummary] = useState({})
  const [personnel, setPersonnel] = useState([])
  const [selectedStatus, setSelectedStatus] = useState('TODO')
  const [selectedPersonnel, setSelectedPersonnel] = useState(null)
  const [selectedTasks, setSelectedTasks] = useState([])
  const [upcomingTasks, setUpcomingTasks] = useState([])
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isTasksLoading, setIsTasksLoading] = useState(false)

  const { activeRoom } = useRoomContext()

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const currentUser = await getCurrentUser()
      setUser(currentUser)

      const roomId = activeRoom ? activeRoom.id : null

      const sumData = await getTaskSummary(roomId)
      setSummary(sumData)

      if (activeRoom && activeRoom.role === 'ADMIN') {
        const pData = await getPersonnel(activeRoom.id)
        setPersonnel(pData)
      } else {
        setPersonnel([])
      }

      // Default load TODO tasks
      setSelectedStatus('TODO')
      setSelectedPersonnel(null)
      setIsTasksLoading(true)
      
      try {
        const data = await getTasks({
          status: 'TODO',
          room_id: roomId,
          page: 0,
          pageSize: 100
        })
        setSelectedTasks(data.tasks || [])

        // Load Upcoming tasks
        const upcomingData = await getTasks({
          deadline_status: 'UPCOMING',
          room_id: roomId,
          page: 0,
          pageSize: 5
        })
        setUpcomingTasks(upcomingData.tasks || [])
      } catch {
        setSelectedTasks([])
        setUpcomingTasks([])
      } finally {
        setIsTasksLoading(false)
      }

      setLoading(false)
    } catch (err) {
      console.error(err)
      setError('Dashboard verileri yüklenemedi. Lütfen tekrar deneyin.')
      setLoading(false)
    }
  }, [activeRoom])

  // Re-fetch when activeRoom changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboard()
  }, [loadDashboard])

  const handleStatusClick = async (status, force = false, roomIdOverride = undefined) => {
    if (!force && selectedStatus === status && !selectedPersonnel) return

    setSelectedStatus(status)
    setSelectedPersonnel(null)
    setIsTasksLoading(true)

    try {
      const currentRoomId = roomIdOverride !== undefined ? roomIdOverride : (activeRoom ? activeRoom.id : null)
      
      const data = await getTasks({
        status: status,
        room_id: currentRoomId,
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

  const handlePersonnelClick = async (person) => {
    if (selectedPersonnel?.id === person.id) {
      setSelectedPersonnel(null)
      if (selectedStatus) {
        handleStatusClick(selectedStatus, true)
      }
      return
    }
    
    setSelectedPersonnel(person)
    setSelectedStatus(null)
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

  const getInitials = (name) => {
    if (!name) return 'U'
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  if (loading) {
    return (
      <main className="dashboard-main">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Dashboard hazırlanıyor...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="dashboard-main">
        <div className="error-state">
          <AlertCircle size={48} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
          <p>{error}</p>
          <button 
            onClick={loadDashboard} 
            style={{marginTop: 16, padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontWeight: 600}}
          >
            Tekrar Dene
          </button>
        </div>
      </main>
    )
  }

  const getStatusConfig = (status) => {
    switch (status) {
      case 'TODO': return { label: 'To Do', className: 'status-todo', icon: <CircleDashed size={20} /> }
      case 'IN_PROGRESS': return { label: 'In Progress', className: 'status-progress', icon: <Activity size={20} /> }
      case 'DONE': return { label: 'Done', className: 'status-done', icon: <CheckCircle2 size={20} /> }
      case 'CANCELLED': return { label: 'Cancelled', className: 'status-cancelled', icon: <XCircle size={20} /> }
      default: return { label: 'Görevler', className: '', icon: <CircleDashed size={20} /> }
    }
  }

  const renderTaskRow = (task) => {
    const priorityClass = 
      task.priority === 'HIGH' ? 'badge-high' :
      task.priority === 'MEDIUM' ? 'badge-medium' : 'badge-low'
      
    const priorityLabel = 
      task.priority === 'HIGH' ? 'Yüksek' :
      task.priority === 'MEDIUM' ? 'Orta' : 'Düşük'

    // Check if task is overdue based on current date
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'DONE' && task.status !== 'CANCELLED'

    const getRelativeDateLabel = (dateStr) => {
      if (!dateStr) return 'Tarih Yok'
      
      const due = new Date(dateStr)
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      // Normalize times for date comparison
      due.setHours(0, 0, 0, 0)
      today.setHours(0, 0, 0, 0)
      tomorrow.setHours(0, 0, 0, 0)
      
      if (due.getTime() === today.getTime()) return 'Bugün'
      if (due.getTime() === tomorrow.getTime()) return 'Yarın'
      
      return due.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) // 12 Eylül
    }

    return (
      <Link to={`/tasks/${task.id}`} className="task-row" key={task.id}>
        <div className="task-title-group">
          <h4 className="task-title">{task.title}</h4>
          {task.description && (
            <p className="task-desc">{task.description}</p>
          )}
        </div>
        
        <div className={`task-meta ${isOverdue ? 'overdue' : ''}`}>
          <Calendar size={16} />
          <span>{getRelativeDateLabel(task.due_date)}</span>
        </div>
        
        <div className="task-meta">
          <span className={`task-badge ${priorityClass}`}>{priorityLabel}</span>
        </div>
        
        <div className="task-assignee">
          <div className="assignee-avatar" title="Atanan Kişi">
             {task.assigned_to === user?.id ? getInitials(user?.full_name) : (
               personnel.find(p => p.id === task.assigned_to) 
                 ? getInitials(personnel.find(p => p.id === task.assigned_to).full_name) 
                 : getInitials('Personel')
             )}
          </div>
          <span className="assignee-name" style={{ marginLeft: 8, fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
            {task.assigned_to === user?.id ? user?.full_name : (
               personnel.find(p => p.id === task.assigned_to)?.full_name || 'Personel'
            )}
          </span>
        </div>
      </Link>
    )
  }

  const myCompletionRate = summary.my_total > 0
    ? Math.round((summary.my_done / summary.my_total) * 100)
    : 0

  const teamTotal = summary.total || 0
  const teamDone = summary.done || 0
  const teamCompletionRate = teamTotal > 0
    ? Math.round((teamDone / teamTotal) * 100)
    : 0

  const statusList = ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED']

  const canCreateTask = !activeRoom || activeRoom.role === 'ADMIN'

  return (
    <main className="dashboard-main">
      <header className="dashboard-header">
        <div className="header-titles">
          <h1>Dashboard</h1>
          <p>Taskozz görevlerinin genel görünümü.</p>
        </div>
        
        <div className="header-actions">
          <div className="header-context">
            <Briefcase size={16} />
            <span>{activeRoom ? activeRoom.name : 'Kişisel Alan'}</span>
          </div>
          {canCreateTask && (
            <Link to="/tasks" className="btn-primary">
              + Görev Ekle
            </Link>
          )}
        </div>
      </header>

      <div className="status-cards-grid">
        {statusList.map(status => {
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

      <section className={`dashboard-content ${activeRoom?.role === 'ADMIN' ? 'has-admin' : ''}`}>
        
        {/* Main Task List Panel */}
        <div className="tasks-panel-container">
          <div className="tasks-panel">
            <div className="panel-header">
              <h2>
                {selectedPersonnel ? (
                  `${selectedPersonnel.full_name} Görevleri`
                ) : selectedStatus ? (
                  `${getStatusConfig(selectedStatus).label} Görevleri`
                ) : (
                  'Görevler'
                )}
              </h2>
            </div>

            {isTasksLoading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
              </div>
            ) : selectedTasks.length === 0 ? (
              <div className="empty-state">
                <Inbox size={48} />
                <h3>Bu durumda henüz görev yok</h3>
                <p>Farklı bir durum seçebilir veya yeni görev ekleyebilirsiniz.</p>
              </div>
            ) : (
              <div className="tasks-list">
                {selectedTasks.map(renderTaskRow)}
              </div>
            )}
          </div>

          {/* Upcoming Deadlines Panel */}
          <div className="tasks-panel upcoming-panel" style={{ marginTop: '2rem' }}>
            <div className="panel-header">
              <h2>Yaklaşan Teslimler</h2>
            </div>
            {upcomingTasks.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <Calendar size={32} />
                <h3 style={{ fontSize: '1rem', marginTop: '1rem' }}>Yaklaşan teslim tarihi yok</h3>
              </div>
            ) : (
              <div className="tasks-list">
                {upcomingTasks.map(renderTaskRow)}
              </div>
            )}
          </div>
        </div>

        {/* Admin Sidebar Panel */}
        {activeRoom?.role === 'ADMIN' && (
          <div className="admin-panel">
            <div className="admin-card">
              <h2>Ekip Başarısı</h2>
              <div className="stat-group">
                <span className="stat-label">Senin Tamamlanma Oranın</span>
                <span className="stat-value success">%{myCompletionRate}</span>
              </div>
              <div className="divider"></div>
              <div className="stat-group">
                <span className="stat-label">Genel Ekip Başarısı</span>
                <span className="stat-value primary">%{teamCompletionRate}</span>
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
                      <div className="assignee-avatar">
                        {getInitials(person.full_name)}
                      </div>
                      {person.full_name}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Odada personel bulunmuyor.</p>
              )}
            </div>
          </div>
        )}

      </section>
    </main>
  )
}

export default Dashboard