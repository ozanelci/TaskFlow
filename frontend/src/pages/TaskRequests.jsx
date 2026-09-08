import { useEffect, useState } from 'react'
import { getTaskRequests, createTaskRequest, approveTaskRequest, rejectTaskRequest } from '../services/taskRequestService'
import { useRoomContext } from '../context/RoomContext'

import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Icons } from '../components/ui/Icons'

function TaskRequests() {
  const { activeRoom } = useRoomContext()

  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('MEDIUM')

  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [comments, setComments] = useState({})

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      try {
        setLoading(true)
        if (cancelled) return

        if (activeRoom) {
          const data = await getTaskRequests()
          if (!cancelled) setRequests(data)
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [activeRoom])

  async function refreshRequests() {
    try {
      const data = await getTaskRequests()
      setRequests(data)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleCreateRequest(e) {
    e.preventDefault()
    if (!title.trim() || !activeRoom) return

    try {
      setSaving(true)
      setError('')
      await createTaskRequest({
        title: title.trim(),
        description: description.trim() || null,
        priority: priority,
        room_id: activeRoom.id,
      })
      setTitle('')
      setDescription('')
      setPriority('MEDIUM')
      await refreshRequests()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdateStatus(requestId, status) {
    try {
      setActionLoading(requestId)
      setError('')
      const comment = comments[requestId] || ''
      
      if (status === 'APPROVED') {
        await approveTaskRequest(requestId)
      } else if (status === 'REJECTED') {
        await rejectTaskRequest(requestId, comment.trim() || null)
      }
      
      setComments(prev => {
        const updated = { ...prev }
        delete updated[requestId]
        return updated
      })
      await refreshRequests()
    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  function handleCommentChange(requestId, value) {
    setComments(prev => ({ ...prev, [requestId]: value }))
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED': return <Badge variant="success">Onaylandı</Badge>
      case 'PENDING': return <Badge variant="warning">Bekliyor</Badge>
      case 'REJECTED': return <Badge variant="danger">Reddedildi</Badge>
      default: return <Badge>{status}</Badge>
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 20px' }}>
        <Icons.Loader2 className="ui-button-spinner" size={32} color="var(--primary)" />
      </div>
    )
  }

  if (!activeRoom) {
    return (
      <main style={{ padding: '32px', maxWidth: 'var(--max-width)', margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, marginBottom: 8, letterSpacing: '-0.02em' }}>Görev Talepleri - Kişisel</h1>
          <p style={{ color: 'var(--text-muted)' }}>Görev talepleri özelliği yalnızca kurumsal çalışma (Oda) bağlamında kullanılabilir.</p>
        </div>
        <Card padding="lg" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <Icons.Briefcase size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
          <h3>Kurumsal Oda Seçin</h3>
          <p>Lütfen görev taleplerini görüntülemek veya oluşturmak için üst menüden bir oda seçin.</p>
        </Card>
      </main>
    )
  }

  return (
    <main style={{ padding: '32px', maxWidth: 'var(--max-width)', margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, marginBottom: 8, letterSpacing: '-0.02em' }}>Görev Talepleri - {activeRoom.name}</h1>
        <p style={{ color: 'var(--text-muted)' }}>Yeni görev taleplerini oluşturun ve mevcut talepleri yönetin.</p>
      </div>

      {error && (
        <div style={{ background: 'var(--danger-light)', color: 'var(--danger-text)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icons.AlertCircle size={16} />
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 32 }}>
        {/* Form area */}
        <Card padding="lg">
          <h2 style={{ fontSize: 18, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>Yeni Talep Oluştur</h2>
          <form onSubmit={handleCreateRequest} style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 2fr 150px 150px', alignItems: 'end' }}>
            <Input
              label="Başlık"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Talep başlığı..."
              required
            />
            <Input
              label="Açıklama (Opsiyonel)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detaylar..."
            />
            <div className="ui-input-wrapper">
              <label className="ui-input-label">Öncelik</label>
              <select className="ui-input" value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="LOW">Düşük</option>
                <option value="MEDIUM">Orta</option>
                <option value="HIGH">Yüksek</option>
              </select>
            </div>
            <Button type="submit" variant="primary" isLoading={saving} style={{ height: 42 }}>
              Talep Gönder
            </Button>
          </form>
        </Card>

        {/* Requests List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {requests.length === 0 ? (
            <Card padding="lg" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              <Icons.Inbox size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
              <h3>Henüz Talep Yok</h3>
              <p>Bu oda için herhangi bir görev talebi bulunmuyor.</p>
            </Card>
          ) : (
            requests.map(req => {
              const isAdmin = activeRoom?.role === 'ADMIN'
              
              const canAct = isAdmin && req.status === 'PENDING'

              return (
                <Card key={req.id} padding="md" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{req.title}</h3>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {getStatusBadge(req.status)}
                        {getPriorityBadge(req.priority)}
                      </div>
                    </div>
                  </div>

                  {req.description && (
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{req.description}</p>
                  )}

                  {(req.admin_comment) && (
                    <div style={{ background: 'var(--surface-muted)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-secondary)' }}>
                      <strong>Yönetici Notu:</strong> {req.admin_comment}
                    </div>
                  )}

                  {canAct && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center' }}>
                      <Input
                        placeholder="Yönetici notu (Opsiyonel)"
                        value={comments[req.id] || ''}
                        onChange={(e) => handleCommentChange(req.id, e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <Button 
                        variant="primary" 
                        isLoading={actionLoading === req.id}
                        onClick={() => handleUpdateStatus(req.id, 'APPROVED')}
                      >
                        Onayla
                      </Button>
                      <Button 
                        variant="secondary" 
                        isLoading={actionLoading === req.id}
                        onClick={() => handleUpdateStatus(req.id, 'REJECTED')}
                        className="ui-button-danger"
                      >
                        Reddet
                      </Button>
                    </div>
                  )}
                </Card>
              )
            })
          )}
        </div>
      </div>
    </main>
  )
}

export default TaskRequests
