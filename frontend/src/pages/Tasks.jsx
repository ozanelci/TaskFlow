import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser } from '../services/authService'
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
} from '../services/taskService'
import { getRoomMembers } from '../services/roomService'
import { useRoomContext } from '../context/RoomContext'

import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Icons } from '../components/ui/Icons'

import './Tasks.css'

function Tasks() {
  const { activeRoom } = useRoomContext()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('MEDIUM')
  const [assignedTo, setAssignedTo] = useState('')
  const [dueDate, setDueDate] = useState('')

  const [user, setUser] = useState(null)
  const [tasks, setTasks] = useState([])
  const [totalTasks, setTotalTasks] = useState(0)
  const [roomMembers, setRoomMembers] = useState([])

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [dueDateFrom] = useState('')
  const [dueDateTo] = useState('')
  const [sortBy, setSortBy] = useState('id')
  const [sortOrder] = useState('asc')

  const [page, setPage] = useState(0)
  const [pageSize] = useState(10)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingTask, setEditingTask] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    async function loadUser() {
      try {
        const data = await getCurrentUser()
        setUser(data)
      } catch (error) {
        setError(error.message)
      }
    }
    loadUser()
  }, [])

  useEffect(() => {
    async function loadTasks() {
      try {
        setLoading(true)
        setError('')

        const data = await getTasks({
          status: statusFilter,
          priority: priorityFilter,
          search: search,
          dueDateFrom: dueDateFrom,
          dueDateTo: dueDateTo,
          page: page,
          pageSize: pageSize,
          sortBy: sortBy,
          sortOrder: sortOrder,
          room_id: activeRoom ? activeRoom.id : undefined,
        })

        setTasks(data.tasks || data.items || data)
        setTotalTasks(data.total || 0)
      } catch (error) {
        console.error('Görevler alınamadı:', error.message)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    loadTasks()
  }, [page, pageSize, search, statusFilter, priorityFilter, dueDateFrom, dueDateTo, sortBy, sortOrder, activeRoom])

  useEffect(() => {
    async function loadRoomMembers() {
      if (!activeRoom || activeRoom.role !== 'ADMIN') {
        setRoomMembers([])
        return
      }

      try {
        setActionLoading(true)
        const data = await getRoomMembers(activeRoom.id)
        setRoomMembers(data)
      } catch (error) {
        console.error('Oda üyeleri alınamadı:', error.message)
        setRoomMembers([])
      } finally {
        setActionLoading(false)
      }
    }
    loadRoomMembers()
  }, [activeRoom])

  function resetTaskForm() {
    setTitle('')
    setDescription('')
    setPriority('MEDIUM')
    setAssignedTo('')
    setDueDate('')
    setEditingTask(null)
  }

  function handleEdit(task) {
    setEditingTask(task)
    setTitle(task.title)
    setDescription(task.description || '')
    setPriority(task.priority)
    setAssignedTo(String(task.assigned_to))
    setDueDate(task.due_date ? task.due_date.slice(0, 16) : '')
  }

  async function handleSubmitTask(event) {
    event.preventDefault()
    try {
      setActionLoading(true)
      setError('')

      let finalAssignedTo = user.id
      let finalRoomId = null

      if (activeRoom) {
        finalRoomId = activeRoom.id
        if (activeRoom.role === 'ADMIN') {
          if (!assignedTo) {
            setError('Oda görevi için personel seçmelisin.')
            setActionLoading(false)
            return
          }
          finalAssignedTo = assignedTo
        }
      }

      const taskData = {
        title: title,
        description: description || null,
        priority: priority,
        assigned_to: Number(finalAssignedTo),
        room_id: finalRoomId,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
      }

      if (editingTask) {
        await updateTask(editingTask.id, taskData)
      } else {
        await createTask(taskData)
      }

      resetTaskForm()
      setPage(0)
      // Force reload?
      window.location.reload();
    } catch (error) {
      console.error('Görev kaydedilemedi:', error.message)
      setError(error.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDeleteTask(taskId) {
    if (!window.confirm('Bu görevi silmek istediğinize emin misiniz?')) return
    try {
      setActionLoading(true)
      await deleteTask(taskId)
      setPage(0)
      window.location.reload();
    } catch (error) {
      console.error('Görev silinemedi:', error.message)
      setError(error.message)
    } finally {
      setActionLoading(false)
    }
  }

  function getAssignedPersonName(task) {
    if (task.assigned_to === user?.id) return user?.full_name || 'Sen'
    const member = roomMembers.find(m => m.user_id === task.assigned_to)
    return member ? member.full_name : 'Personel'
  }

  const getPriorityBadge = (prio) => {
    switch (prio) {
      case 'HIGH': return <Badge variant="danger">Yüksek</Badge>
      case 'MEDIUM': return <Badge variant="warning">Orta</Badge>
      case 'LOW': return <Badge variant="info">Düşük</Badge>
      default: return <Badge>{prio}</Badge>
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DONE': return <Badge variant="success">Tamamlandı</Badge>
      case 'IN_PROGRESS': return <Badge variant="primary">Devam Ediyor</Badge>
      case 'TODO': return <Badge variant="warning">Bekliyor</Badge>
      case 'CANCELLED': return <Badge variant="default">İptal</Badge>
      default: return <Badge>{status}</Badge>
    }
  }

  return (
    <main className="tasks-layout">
      <div className="tasks-header-wrapper">
        <div className="tasks-header">
          <h1>Görevler</h1>
          <p>{activeRoom ? activeRoom.name + ' alanındaki görevleri yönetin' : 'Kişisel görevlerinizi yönetin'}</p>
        </div>
      </div>

      <div className="tasks-grid">
        {/* Left Side: Form */}
        <div className="tasks-sidebar">
          <Card className="task-form-card">
            <h2 className="task-form-header">{editingTask ? 'Görevi Güncelle' : 'Yeni Görev Oluştur'}</h2>
            
            {error && (
              <div className="auth-alert" style={{ marginBottom: 16 }}>
                <Icons.AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmitTask} className="task-form-body">
              <Input
                label="Görev Başlığı"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Örn: API entegrasyonu..."
                required
              />

              <div className="ui-input-wrapper">
                <label className="ui-input-label">Açıklama (Opsiyonel)</label>
                <textarea
                  className="ui-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detaylı açıklama ekleyin"
                  rows={3}
                />
              </div>

              <div className="ui-input-wrapper">
                <label className="ui-input-label">Öncelik</label>
                <select className="ui-input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="LOW">Düşük</option>
                  <option value="MEDIUM">Orta</option>
                  <option value="HIGH">Yüksek</option>
                </select>
              </div>

              {activeRoom?.role === 'ADMIN' && (
                <div className="ui-input-wrapper">
                  <label className="ui-input-label">Atanacak Personel</label>
                  <select className="ui-input" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} required>
                    <option value="">Seçiniz...</option>
                    {roomMembers.map(m => (
                      <option key={m.id} value={m.user_id}>{m.full_name}</option>
                    ))}
                  </select>
                </div>
              )}

              <Input
                label="Son Tarih"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <Button type="submit" variant="primary" className="w-full" isLoading={actionLoading} style={{ flex: 1 }}>
                  {editingTask ? 'Güncelle' : 'Oluştur'}
                </Button>
                {editingTask && (
                  <Button type="button" variant="secondary" onClick={resetTaskForm} disabled={actionLoading}>
                    İptal
                  </Button>
                )}
              </div>
            </form>
          </Card>
        </div>

        {/* Right Side: List & Filters */}
        <div className="tasks-main">
          <div className="tasks-filters">
            <input
              type="text"
              placeholder="Görev ara..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            />
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0) }}>
              <option value="">Tüm Durumlar</option>
              <option value="TODO">Bekliyor</option>
              <option value="IN_PROGRESS">Devam Ediyor</option>
              <option value="DONE">Tamamlandı</option>
            </select>
            <select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(0) }}>
              <option value="">Tüm Öncelikler</option>
              <option value="HIGH">Yüksek</option>
              <option value="MEDIUM">Orta</option>
              <option value="LOW">Düşük</option>
            </select>
            <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(0) }}>
              <option value="id">ID</option>
              <option value="due_date">Son Tarih</option>
              <option value="priority">Öncelik</option>
            </select>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><Icons.Loader2 className="ui-button-spinner" size={32} color="var(--primary)" /></div>
          ) : tasks.length === 0 ? (
            <Card padding="lg" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              <Icons.Inbox size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
              <h3>Görev Bulunamadı</h3>
              <p style={{ fontSize: 14 }}>Arama kriterlerinize uygun görev bulunmuyor.</p>
            </Card>
          ) : (
            <div className="tasks-list-container">
              {tasks.map(task => (
                <div className="task-item" key={task.id}>
                  <div className="task-item-content">
                    <div className="task-item-header">
                      <h3 className="task-item-title">{task.title}</h3>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {getStatusBadge(task.status)}
                        {getPriorityBadge(task.priority)}
                      </div>
                    </div>
                    {task.description && <p className="task-item-desc">{task.description}</p>}
                    <div className="task-item-meta">
                      <div className="task-meta-group">
                        <Icons.User size={14} />
                        <span>{getAssignedPersonName(task)}</span>
                      </div>
                      <div className="task-meta-group">
                        <Icons.Calendar size={14} />
                        <span>{task.due_date ? new Date(task.due_date).toLocaleDateString('tr-TR') : 'Tarih Yok'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="task-item-actions">
                    <Button variant="secondary" size="sm" onClick={() => navigate(`/tasks/${task.id}`)}>
                      Detay
                    </Button>
                    {(!activeRoom || activeRoom.role === 'ADMIN') && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(task)}>Düzenle</Button>
                        <Button variant="ghost" size="sm" className="ui-button-danger" onClick={() => handleDeleteTask(task.id)}>Sil</Button>
                      </>
                    )}
                  </div>
                </div>
              ))}

              <div className="tasks-pagination">
                <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Sayfa {page + 1}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Önceki</Button>
                  <Button variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * pageSize >= totalTasks}>Sonraki</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export default Tasks
