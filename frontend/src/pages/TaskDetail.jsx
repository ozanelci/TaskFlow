import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getTask, updateTask } from '../services/taskService'
import { getRoomMembers } from '../services/roomService'
import { getCurrentUser } from '../services/authService'
import { useRoomContext } from '../context/RoomContext'

import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Icons } from '../components/ui/Icons'

function TaskDetail() {
  const { taskId } = useParams()
  const id = taskId
  const navigate = useNavigate()
  const { activeRoom } = useRoomContext()

  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [user, setUser] = useState(null)
  const [roomMembers, setRoomMembers] = useState([])

  const [newStatus, setNewStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      try {
        setLoading(true)
        setError('')
        const [taskData, currentUser] = await Promise.all([
          getTask(id),
          getCurrentUser()
        ])

        if (cancelled) return
        setTask(taskData)
        setNewStatus(taskData.status)
        setUser(currentUser)

        if (taskData.room_id) {
          try {
            const members = await getRoomMembers(taskData.room_id)
            if (!cancelled) setRoomMembers(members)
          } catch {
            if (!cancelled) setRoomMembers([])
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [id])

  async function handleStatusUpdate() {
    try {
      setSaving(true)
      setError('')
      setSuccessMsg('')
      await updateTask(task.id, { status: newStatus })
      setTask({ ...task, status: newStatus })
      setSuccessMsg('Durum güncellendi.')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
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

  const getAssignedName = (assignedId) => {
    if (assignedId === user?.id) return user?.full_name || 'Sen'
    const member = roomMembers.find(m => m.user_id === assignedId)
    return member ? member.full_name : 'Bilinmeyen Personel'
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 20px' }}>
        <Icons.Loader2 className="ui-button-spinner" size={32} color="var(--primary)" />
      </div>
    )
  }

  if (error || !task) {
    return (
      <main style={{ padding: '32px', maxWidth: 'var(--max-width)', margin: '0 auto' }}>
        <Card padding="lg" style={{ textAlign: 'center' }}>
          <Icons.AlertCircle size={48} color="var(--danger)" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ marginBottom: 16 }}>{error || 'Görev bulunamadı'}</h2>
          <Button variant="secondary" onClick={() => navigate('/tasks')}>Görevlere Dön</Button>
        </Card>
      </main>
    )
  }

  const isAdmin = activeRoom?.role === 'ADMIN'
  const canUpdateStatus = isAdmin || user?.id === task.assigned_to

  return (
    <main style={{ padding: '32px', maxWidth: 'var(--max-width)', margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <Link to="/tasks" style={{ color: 'var(--text-muted)', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
          <Icons.ChevronDown style={{ transform: 'rotate(90deg)' }} size={16} /> Görevlere Dön
        </Link>
      </div>

      <div className="task-detail-grid">
        {/* Left Side: Detail */}
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 16 }}>
            {task.title}
          </h1>
          
          <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
            {getStatusBadge(task.status)}
            {getPriorityBadge(task.priority)}
          </div>

          <Card padding="lg">
            <h3 style={{ fontSize: 16, fontWeight: 600, borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 16 }}>Açıklama</h3>
            <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {task.description || 'Bu görev için açıklama girilmemiş.'}
            </p>
          </Card>
        </div>

        {/* Right Side: Meta & Actions */}
        <div>
          <Card padding="md" style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Detaylar</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Atanan Kişi</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500 }}>
                  <Icons.User size={16} color="var(--primary)" />
                  {getAssignedName(task.assigned_to)}
                </div>
              </div>

              <div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Son Tarih</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500 }}>
                  <Icons.Calendar size={16} color="var(--primary)" />
                  {task.due_date ? new Date(task.due_date).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Bağlam</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500 }}>
                  <Icons.Briefcase size={16} color="var(--primary)" />
                  {task.room_id ? 'Kurumsal Oda' : 'Kişisel'}
                </div>
              </div>
            </div>
          </Card>

          <Card padding="md">
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Durumu Güncelle</h3>
            
            {successMsg && (
              <div style={{ fontSize: 13, color: 'var(--success)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icons.CheckCircle2 size={14} /> {successMsg}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <select 
                value={newStatus} 
                onChange={(e) => setNewStatus(e.target.value)}
                disabled={!canUpdateStatus || saving}
                style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', fontSize: 14, outline: 'none' }}
              >
                <option value="TODO">Bekliyor</option>
                <option value="IN_PROGRESS">Devam Ediyor</option>
                <option value="DONE">Tamamlandı</option>
                <option value="CANCELLED">İptal Edildi</option>
              </select>

              {canUpdateStatus ? (
                <Button variant="primary" onClick={handleStatusUpdate} isLoading={saving} disabled={newStatus === task.status}>
                  Güncelle
                </Button>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--warning)', marginTop: 4 }}>
                  Durumu güncelleme yetkiniz yok.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </main>
  )
}

export default TaskDetail