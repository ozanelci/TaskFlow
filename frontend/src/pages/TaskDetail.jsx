import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getTask,
  updateTask,
  getTaskHistory,
} from '../services/taskService'
import { getCurrentUser } from '../services/authService'
import './TaskDetail.css'

function TaskDetail() {
  const { taskId } = useParams()
  const navigate = useNavigate()

  const [task, setTask] = useState(null)
  const [history, setHistory] = useState([])
  const [user, setUser] = useState(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadTask() {
      try {
        setLoading(true)
        setError('')

        const data = await getTask(taskId)
        const historyData = await getTaskHistory(taskId)
        const userData = await getCurrentUser()

        setTask(data)
        setStatus(data.status)
        setPriority(data.priority)
        setHistory(historyData)
        setUser(userData)
      } catch (error) {
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    loadTask()
  }, [taskId])

  async function handleUpdate() {
    try {
      setSaving(true)
      setError('')

      const updateData = {
        status: status,
      }

      // USER sadece status değiştirebilir.
      // ADMIN status ve priority değiştirebilir.
      if (user?.role === 'ADMIN') {
        updateData.priority = priority
      }

      const updatedTask = await updateTask(taskId, updateData)
      const historyData = await getTaskHistory(taskId)

      setTask(updatedTask)
      setStatus(updatedTask.status)
      setPriority(updatedTask.priority)
      setHistory(historyData)
    } catch (error) {
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="task-detail-loading">
        <p>Görev yükleniyor...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="task-detail-page">
        <div className="task-detail-error">
          Hata: {error}
        </div>

        <button
          type="button"
          className="task-detail-button"
          onClick={() => navigate('/tasks')}
        >
          Görevlere Dön
        </button>
      </main>
    )
  }

  if (!task) {
    return (
      <main className="task-detail-page">
        <div className="task-detail-card">
          <p>Görev bulunamadı.</p>

          <button
            type="button"
            className="task-detail-button"
            onClick={() => navigate('/tasks')}
          >
            Görevlere Dön
          </button>
        </div>
      </main>
    )
  }

  const isAdmin = user?.role === 'ADMIN'
  const isRoomTask = task.room_id !== null


  const canUpdateStatus =
    isAdmin ||
    user?.id === task.assigned_to

  return (
    <main className="task-detail-page">

      <div className="task-detail-header">
        <div>
          <h1>{task.title}</h1>

          <p>
            Görev #{task.id}
          </p>
        </div>

        <div className="task-detail-actions">
          <button
            type="button"
            className="task-detail-button"
            onClick={() => navigate('/tasks')}
          >
            ← Görevlere Dön
          </button>
        </div>
      </div>

      {error && (
        <div className="task-detail-error">
          Hata: {error}
        </div>
      )}

      <div className="task-detail-grid">

        {/* SOL TARAF */}
        <div>

          {/* AÇIKLAMA */}
          <section className="task-detail-card">
            <h2>Açıklama</h2>

            <div className="task-detail-description">
              {task.description || 'Açıklama bulunmuyor.'}
            </div>
          </section>

          {/* GÖREV BİLGİLERİ */}
          <section className="task-detail-card">
            <h2>Görev Bilgileri</h2>

            <div className="task-detail-fields">

              <div className="task-detail-field">
                <span className="task-detail-field-label">
                  Durum
                </span>

                <span className="task-detail-field-value">
                  {task.status}
                </span>
              </div>

              <div className="task-detail-field">
                <span className="task-detail-field-label">
                  Öncelik
                </span>

                <span className="task-detail-field-value">
                  {task.priority}
                </span>
              </div>

              <div className="task-detail-field">
                <span className="task-detail-field-label">
                  Atanan kişi
                </span>

                {isRoomTask && (
                  <div className="task-detail-field">
                    <span className="task-detail-field-label">
                      Görev türü
                    </span>

                    <span className="task-detail-field-value">
                      Oda Görevi
                    </span>
                  </div>
                )}

                <span className="task-detail-field-value">
                  Kullanıcı #{task.assigned_to}
                </span>
              </div>

              <div className="task-detail-field">
                <span className="task-detail-field-label">
                  Oluşturan
                </span>

                <span className="task-detail-field-value">
                  Kullanıcı #{task.created_by}
                </span>
              </div>

              <div className="task-detail-field">
                <span className="task-detail-field-label">
                  Son tarih
                </span>

                <span className="task-detail-field-value">
                  {task.due_date
                    ? new Date(
                        task.due_date
                      ).toLocaleString('tr-TR')
                    : 'Belirlenmemiş'}
                </span>
              </div>

              <div className="task-detail-field">
                <span className="task-detail-field-label">
                  Oluşturulma
                </span>

                <span className="task-detail-field-value">
                  {new Date(
                    task.created_at
                  ).toLocaleString('tr-TR')}
                </span>
              </div>

              <div className="task-detail-field">
                <span className="task-detail-field-label">
                  Son güncelleme
                </span>

                <span className="task-detail-field-value">
                  {new Date(
                    task.updated_at
                  ).toLocaleString('tr-TR')}
                </span>
              </div>

              <div className="task-detail-field">
                <span className="task-detail-field-label">
                  Son tarih durumu
                </span>

                <span className="task-detail-field-value">
                  {task.deadline_status || 'Belirtilmemiş'}
                </span>
              </div>

            </div>
          </section>

          {/* GÜNCELLEME */}
          <section className="task-detail-card">

            <h2>Görevi Güncelle</h2>

            <div className="task-detail-form">

              <div className="task-detail-form-group">
                <label htmlFor="task-status">
                  Durum
                </label>

                <select
                  id="task-status"
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value)
                  }
                  disabled={!canUpdateStatus || saving}
                >
                  <option value="TODO">
                    Bekliyor
                  </option>

                  <option value="IN_PROGRESS">
                    Devam Ediyor
                  </option>

                  <option value="DONE">
                    Tamamlandı
                  </option>

                  <option value="CANCELLED">
                    İptal
                  </option>
                </select>
              </div>

              <div className="task-detail-form-group">
                <label htmlFor="task-priority">
                  Öncelik
                </label>

                <select
                  id="task-priority"
                  value={priority}
                  onChange={(event) =>
                    setPriority(event.target.value)
                  }
                  disabled={!isAdmin || saving}
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

              <div className="task-detail-save">

                {canUpdateStatus ? (
                  <button
                    type="button"
                    className="task-detail-button task-detail-button-primary"
                    onClick={handleUpdate}
                    disabled={saving}
                  >
                    {saving
                      ? 'Kaydediliyor...'
                      : 'Değişiklikleri Kaydet'}
                  </button>
                ) : (
                  <p>
                    Bu görevi güncelleme yetkiniz bulunmuyor.
                  </p>
                )}

              </div>

            </div>

          </section>

        </div>

        {/* SAĞ TARAF */}
        <section className="task-detail-card">

          <h2>Görev Geçmişi</h2>

          {history.length === 0 ? (

            <div className="task-history-empty">
              Henüz durum değişikliği bulunmuyor.
            </div>

          ) : (

            <div className="task-history">

              {history.map((item) => (
                <article
                  className="task-history-item"
                  key={item.id}
                >

                  <div className="task-history-status">
                    {item.old_status || 'Başlangıç'}
                    {' → '}
                    {item.new_status}
                  </div>

                  <div className="task-history-meta">
                    Değiştiren kullanıcı #{item.changed_by}
                  </div>

                  <div className="task-history-meta">
                    {new Date(
                      item.changed_at
                    ).toLocaleString('tr-TR')}
                  </div>

                </article>
              ))}

            </div>

          )}

        </section>

      </div>

    </main>
  )
}

export default TaskDetail