import { useEffect, useState } from 'react'
import {
  createTaskRequest,
  getTaskRequests,
  approveTaskRequest,
  rejectTaskRequest,
} from '../services/taskRequestService'
import { getCurrentUser } from '../services/authService'
import { getMyRooms } from '../services/roomService'
import './TaskRequests.css'

function TaskRequests() {
  const [requests, setRequests] = useState([])
  const [user, setUser] = useState(null)
  const [rooms, setRooms] = useState([])

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('MEDIUM')
  const [dueDate, setDueDate] = useState('')
  const [selectedRoomId, setSelectedRoomId] = useState('')

  const [reviewComment, setReviewComment] = useState({})

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      try {
        const userData = await getCurrentUser()
        const requestData = await getTaskRequests()

        let roomData = []

        if (userData.role === 'USER') {
          roomData = await getMyRooms()
        }

        if (!cancelled) {
          setUser(userData)
          setRequests(requestData)
          setRooms(roomData)
          setLoading(false)
        }
      } catch (error) {
        if (!cancelled) {
          setError(error.message)
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [])

  async function refreshRequests() {
    try {
      const data = await getTaskRequests()
      setRequests(data)
    } catch (error) {
      setError(error.message)
    }
  }

  async function handleCreate(event) {
    event.preventDefault()

    if (!title.trim()) {
      setError('Görev başlığı zorunludur.')
      return
    }

    if (!selectedRoomId) {
      setError('Bir oda seçmelisiniz.')
      return
    }

    try {
      setSaving(true)
      setError('')

      await createTaskRequest({
        title: title.trim(),
        description: description.trim() || null,
        priority: priority,
        room_id: Number(selectedRoomId),
        due_date: dueDate
          ? new Date(dueDate).toISOString()
          : null,
      })

      setTitle('')
      setDescription('')
      setPriority('MEDIUM')
      setDueDate('')
      setSelectedRoomId('')

      await refreshRequests()
    } catch (error) {
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleApprove(requestId) {
    try {
      setActionLoading(requestId)
      setError('')

      await approveTaskRequest(requestId)

      await refreshRequests()
    } catch (error) {
      setError(error.message)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReject(requestId) {
    try {
      setActionLoading(requestId)
      setError('')

      await rejectTaskRequest(
        requestId,
        reviewComment[requestId] || null,
      )

      setReviewComment((current) => {
        const updated = { ...current }
        delete updated[requestId]
        return updated
      })

      await refreshRequests()
    } catch (error) {
      setError(error.message)
    } finally {
      setActionLoading(null)
    }
  }

  function handleCommentChange(requestId, value) {
    setReviewComment((current) => ({
      ...current,
      [requestId]: value,
    }))
  }

  function getStatusText(status) {
    if (status === 'PENDING') return 'Bekliyor'
    if (status === 'APPROVED') return 'Onaylandı'
    if (status === 'REJECTED') return 'Reddedildi'

    return status
  }

  function getPriorityText(priorityValue) {
    if (priorityValue === 'LOW') return 'Düşük'
    if (priorityValue === 'MEDIUM') return 'Orta'
    if (priorityValue === 'HIGH') return 'Yüksek'

    return priorityValue
  }

  function getRoomName(roomId) {
    const room = rooms.find(
      (item) => item.id === roomId,
    )

    return room?.name || `Oda #${roomId}`
  }

  if (loading) {
    return (
      <main className="task-requests-page">
        <div className="task-requests-message">
          Talepler yükleniyor...
        </div>
      </main>
    )
  }

  return (
    <main className="task-requests-page">
      <header className="task-requests-header">
        <div>
          <h1>Görev Talepleri</h1>

          <p>
            Yeni görev taleplerini oluşturun ve mevcut
            talepleri yönetin.
          </p>
        </div>
      </header>

      {error && (
        <div className="task-requests-error">
          Hata: {error}
        </div>
      )}

      {user?.role === 'USER' && (
        <section className="task-request-form-card">
          <h2>Yeni Görev Talebi</h2>

          <form onSubmit={handleCreate}>
            <div className="task-request-form-grid">
              <div className="task-request-form-group">
                <label htmlFor="request-title">
                  Başlık
                </label>

                <input
                  id="request-title"
                  type="text"
                  value={title}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  placeholder="Görev başlığı"
                  disabled={saving}
                />
              </div>

              <div className="task-request-form-group">
                <label htmlFor="request-room">
                  Oda
                </label>

                <select
                  id="request-room"
                  value={selectedRoomId}
                  onChange={(event) =>
                    setSelectedRoomId(event.target.value)
                  }
                  disabled={saving}
                >
                  <option value="">
                    Oda seçin
                  </option>

                  {rooms
                    .filter(
                      (room) =>
                        room.membership_status ===
                        'APPROVED',
                    )
                    .map((room) => (
                      <option
                        key={room.id}
                        value={room.id}
                      >
                        {room.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="task-request-form-group">
                <label htmlFor="request-priority">
                  Öncelik
                </label>

                <select
                  id="request-priority"
                  value={priority}
                  onChange={(event) =>
                    setPriority(event.target.value)
                  }
                  disabled={saving}
                >
                  <option value="LOW">
                    Düşük
                  </option>

                  <option value="MEDIUM">
                    Orta
                  </option>

                  <option value="HIGH">
                    Yüksek
                  </option>
                </select>
              </div>

              <div className="task-request-form-group">
                <label htmlFor="request-due-date">
                  Son Tarih
                </label>

                <input
                  id="request-due-date"
                  type="datetime-local"
                  value={dueDate}
                  onChange={(event) =>
                    setDueDate(event.target.value)
                  }
                  disabled={saving}
                />
              </div>

              <div className="task-request-form-group task-request-form-full">
                <label htmlFor="request-description">
                  Açıklama
                </label>

                <textarea
                  id="request-description"
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  placeholder="Görev hakkında açıklama..."
                  disabled={saving}
                />
              </div>
            </div>

            <div className="task-request-form-actions">
              <button
                type="submit"
                className="task-request-button task-request-button-primary"
                disabled={saving}
              >
                {saving
                  ? 'Gönderiliyor...'
                  : 'Talep Oluştur'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="task-requests-card">
        <div className="task-requests-section-header">
          <div>
            <h2>
              {user?.role === 'ADMIN'
                ? 'Gelen Talepler'
                : 'Taleplerim'}
            </h2>

            <p>
              {requests.length} talep
            </p>
          </div>
        </div>

        {requests.length === 0 ? (
          <div className="task-requests-empty">
            Henüz görev talebi bulunmuyor.
          </div>
        ) : (
          <div className="task-requests-list">
            {requests.map((request) => {
              const isPending =
                request.status === 'PENDING'

              const isLoading =
                actionLoading === request.id

              return (
                <article
                  className="task-request-item"
                  key={request.id}
                >
                  <div className="task-request-main">
                    <div className="task-request-title-row">
                      <h3>
                        {request.title}
                      </h3>

                      <span
                        className={`task-request-status ${request.status.toLowerCase()}`}
                      >
                        {getStatusText(
                          request.status,
                        )}
                      </span>
                    </div>

                    <p className="task-request-description">
                      {request.description ||
                        'Açıklama bulunmuyor.'}
                    </p>

                    <div className="task-request-meta">
                      <span>
                        Öncelik:{' '}
                        {getPriorityText(
                          request.priority,
                        )}
                      </span>

                      {request.room_id && (
  <span>
    Oda:{' '}
    {request.room_name ||
      getRoomName(request.room_id)}
  </span>
)}

                      {user?.role === 'ADMIN' && (
  <span>
    Talep eden:{' '}
    {request.full_name ||
      `#${request.requested_by}`}
  </span>
)}

                      {user?.role === 'ADMIN' &&
                        request.email && (
                          <span>
                            E-posta:{' '}
                            {request.email}
                          </span>
                        )}

                      <span>
                        Son tarih:{' '}
                        {request.due_date
                          ? new Date(
                              request.due_date,
                            ).toLocaleString(
                              'tr-TR',
                            )
                          : 'Belirlenmemiş'}
                      </span>

                      <span>
                        Oluşturulma:{' '}
                        {new Date(
                          request.created_at,
                        ).toLocaleString(
                          'tr-TR',
                        )}
                      </span>
                    </div>

                    {request.review_comment && (
                      <div className="task-request-review">
                        <strong>Yorum:</strong>{' '}
                        {request.review_comment}
                      </div>
                    )}
                  </div>

                  {user?.role === 'ADMIN' &&
                    isPending && (
                      <div className="task-request-admin-actions">
                        <textarea
                          value={
                            reviewComment[
                              request.id
                            ] || ''
                          }
                          onChange={(event) =>
                            handleCommentChange(
                              request.id,
                              event.target.value,
                            )
                          }
                          placeholder="Red nedeni / inceleme yorumu (opsiyonel)"
                          disabled={isLoading}
                        />

                        <div className="task-request-action-buttons">
                          <button
                            type="button"
                            className="task-request-button task-request-button-primary"
                            onClick={() =>
                              handleApprove(
                                request.id,
                              )
                            }
                            disabled={isLoading}
                          >
                            {isLoading
                              ? 'İşleniyor...'
                              : 'Onayla'}
                          </button>

                          <button
                            type="button"
                            className="task-request-button task-request-button-danger"
                            onClick={() =>
                              handleReject(
                                request.id,
                              )
                            }
                            disabled={isLoading}
                          >
                            {isLoading
                              ? 'İşleniyor...'
                              : 'Reddet'}
                          </button>
                        </div>
                      </div>
                    )}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}

export default TaskRequests