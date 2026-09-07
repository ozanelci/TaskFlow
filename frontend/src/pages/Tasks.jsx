import { useEffect, useState } from 'react'
import './Tasks.css'
import { getCurrentUser } from '../services/authService'
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getPersonnel,
} from '../services/taskService'
import {
  getMyRooms,
  getRoomMembers,
} from '../services/roomService'

function Tasks() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('MEDIUM')
  const [assignedTo, setAssignedTo] = useState('')
  const [dueDate, setDueDate] = useState('')

  const [taskType, setTaskType] = useState('PERSONAL')
  const [selectedRoomId, setSelectedRoomId] = useState('')

  const [user, setUser] = useState(null)
  const [tasks, setTasks] = useState([])
  const [totalTasks, setTotalTasks] = useState(0)

  const [personnel, setPersonnel] = useState([])
  const [rooms, setRooms] = useState([])
  const [roomMembers, setRoomMembers] = useState([])

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')

  const [dueDateFrom, setDueDateFrom] = useState('')
  const [dueDateTo, setDueDateTo] = useState('')

  const [sortBy, setSortBy] = useState('id')
  const [sortOrder, setSortOrder] = useState('asc')

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
        })

        setTasks(data.items || data)
        setTotalTasks(data.total || 0)
      } catch (error) {
        console.error(
          'Görevler alınamadı:',
          error.message,
        )

        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    loadTasks()
  }, [
    page,
    pageSize,
    search,
    statusFilter,
    priorityFilter,
    dueDateFrom,
    dueDateTo,
    sortBy,
    sortOrder,
  ])

  useEffect(() => {
    if (!user) {
      return
    }

    async function loadRoomsAndPersonnel() {
      try {
        const myRooms = await getMyRooms()

        setRooms(myRooms)

        if (user.role === 'ADMIN') {
          const data = await getPersonnel()
          setPersonnel(data)
        }
      } catch (error) {
        console.error(
          'Oda/personel bilgileri alınamadı:',
          error.message,
        )

        setError(error.message)
      }
    }

    loadRoomsAndPersonnel()
  }, [user])

  useEffect(() => {
    async function loadRoomMembers() {
      if (!selectedRoomId) {
        return
      }

      try {
        setActionLoading(true)
        setError('')

        const data = await getRoomMembers(
          Number(selectedRoomId),
        )

        setRoomMembers(data)
        setAssignedTo('')
      } catch (error) {
        console.error(
          'Oda üyeleri alınamadı:',
          error.message,
        )

        setError(error.message)
        setRoomMembers([])
      } finally {
        setActionLoading(false)
      }
    }

    loadRoomMembers()
  }, [selectedRoomId])

  function handleSearch() {
    setPage(0)
  }

  function resetTaskForm() {
    setTitle('')
    setDescription('')
    setPriority('MEDIUM')
    setAssignedTo('')
    setDueDate('')
    setTaskType('PERSONAL')
    setSelectedRoomId('')
    setRoomMembers([])
    setEditingTask(null)
  }

  function handleEdit(task) {
    setEditingTask(task)

    setTitle(task.title)
    setDescription(task.description || '')
    setPriority(task.priority)
    setAssignedTo(String(task.assigned_to))

    setDueDate(
      task.due_date
        ? task.due_date.slice(0, 16)
        : '',
    )

    if (task.room_id) {
      setTaskType('ROOM')
      setSelectedRoomId(String(task.room_id))
    } else {
      setTaskType('PERSONAL')
      setSelectedRoomId('')
      setRoomMembers([])
    }
  }

  function handleTaskTypeChange(type) {
    setTaskType(type)
    setAssignedTo('')

    if (type === 'PERSONAL') {
      setSelectedRoomId('')
      setRoomMembers([])
    }
  }

  function handleRoomChange(event) {
    const roomId = event.target.value

    setSelectedRoomId(roomId)
    setAssignedTo('')
  }

  async function handleSubmitTask(event) {
    event.preventDefault()

    try {
      setActionLoading(true)
      setError('')

      let finalAssignedTo = assignedTo
      let finalRoomId = null

      if (taskType === 'PERSONAL') {
        finalAssignedTo = user.id
        finalRoomId = null
      }

      if (taskType === 'ROOM') {
        if (!selectedRoomId) {
          setError('Önce bir oda seçmelisin.')
          setActionLoading(false)
          return
        }

        if (!assignedTo) {
          setError('Oda görevi için personel seçmelisin.')
          setActionLoading(false)
          return
        }

        finalRoomId = Number(selectedRoomId)
      }

      const taskData = {
        title: title,
        description: description || null,
        priority: priority,
        assigned_to: Number(finalAssignedTo),
        room_id: finalRoomId,
        due_date: dueDate
          ? new Date(dueDate).toISOString()
          : null,
      }

      if (editingTask) {
        await updateTask(
          editingTask.id,
          taskData,
        )
      } else {
        await createTask(taskData)
      }

      resetTaskForm()
      setPage(0)
    } catch (error) {
      console.error(
        'Görev kaydedilemedi:',
        error.message,
      )

      setError(error.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDeleteTask(taskId) {
    const confirmed = window.confirm(
      'Bu görevi silmek istediğinize emin misiniz?',
    )

    if (!confirmed) {
      return
    }

    try {
      setActionLoading(true)
      setError('')

      await deleteTask(taskId)

      setPage(0)
    } catch (error) {
      console.error(
        'Görev silinemedi:',
        error.message,
      )

      setError(error.message)
    } finally {
      setActionLoading(false)
    }
  }

  function handlePreviousPage() {
    if (page > 0) {
      setPage(page - 1)
    }
  }

  function handleNextPage() {
    if ((page + 1) * pageSize < totalTasks) {
      setPage(page + 1)
    }
  }

  function getRoomName(roomId) {
    const room = rooms.find(
      (item) => item.id === roomId,
    )

    return room?.name || `Oda #${roomId}`
  }

  function getAssignedPersonName(task) {
    const roomMember = roomMembers.find(
      (member) =>
        member.user_id === task.assigned_to,
    )

    if (roomMember) {
      return roomMember.full_name
    }

    const person = personnel.find(
      (item) =>
        item.id === task.assigned_to,
    )

    return (
      person?.full_name ||
      `Kullanıcı #${task.assigned_to}`
    )
  }

  if (loading || !user) {
    return (
      <main className="tasks-page">
        <p className="tasks-message">
          Görevler yükleniyor...
        </p>
      </main>
    )
  }

  return (
    <main className="tasks-page">

      <header className="tasks-header">
        <div>
          <h1>Görevler</h1>

          <p>
            Görevlerini oluştur, takip et ve yönet.
          </p>
        </div>

        <div className="tasks-header-actions">
          <button
            type="button"
            className="tasks-button"
            onClick={resetTaskForm}
          >
            Yeni Görev
          </button>
        </div>
      </header>

      {error && (
        <div className="tasks-error">
          Hata: {error}
        </div>
      )}

      {/* GÖREV OLUŞTURMA / GÜNCELLEME */}
      <section className="task-form">

        <h2>
          {editingTask
            ? 'Görevi Güncelle'
            : 'Yeni Görev'}
        </h2>

        <form onSubmit={handleSubmitTask}>

          <div className="task-form-grid">

            <div className="task-form-group">
              <label htmlFor="task-title">
                Başlık
              </label>

              <input
                id="task-title"
                type="text"
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
                required
              />
            </div>

            <div className="task-form-group">
              <label htmlFor="task-priority">
                Öncelik
              </label>

              <select
                id="task-priority"
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value)
                }
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

            <div className="task-form-group">
              <label htmlFor="task-type">
                Görev Türü
              </label>

              {user.role === 'ADMIN' ? (
                <select
                  id="task-type"
                  value={taskType}
                  onChange={(event) =>
                    handleTaskTypeChange(
                      event.target.value,
                    )
                  }
                  disabled={Boolean(editingTask)}
                >
                  <option value="PERSONAL">
                    Kişisel Görev
                  </option>

                  <option value="ROOM">
                    Oda Görevi
                  </option>
                </select>
              ) : (
                <select
                  id="task-type"
                  value="PERSONAL"
                  disabled
                >
                  <option value="PERSONAL">
                    Kişisel Görev
                  </option>
                </select>
              )}
            </div>

            <div className="task-form-group">
              <label htmlFor="task-due-date">
                Son Tarih
              </label>

              <input
                id="task-due-date"
                type="datetime-local"
                value={dueDate}
                onChange={(event) =>
                  setDueDate(event.target.value)
                }
              />
            </div>

            {/* ADMIN + ODA GÖREVİ */}
            {user.role === 'ADMIN' &&
              taskType === 'ROOM' && (
                <>
                  <div className="task-form-group">
                    <label htmlFor="task-room">
                      Oda
                    </label>

                    <select
                      id="task-room"
                      value={selectedRoomId}
                      onChange={handleRoomChange}
                      required
                    >
                      <option value="">
                        Oda seçin
                      </option>

                      {rooms.map((room) => (
                        <option
                          key={room.id}
                          value={room.id}
                        >
                          {room.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="task-form-group">
                    <label htmlFor="task-assigned-to">
                      Personel
                    </label>

                    <select
                      id="task-assigned-to"
                      value={assignedTo}
                      onChange={(event) =>
                        setAssignedTo(
                          event.target.value,
                        )
                      }
                      required
                      disabled={
                        !selectedRoomId ||
                        actionLoading
                      }
                    >
                      <option value="">
                        Personel seçin
                      </option>

                      {roomMembers.map((member) => (
                        <option
                          key={member.user_id}
                          value={member.user_id}
                        >
                          {member.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

            {/* ADMIN + KİŞİSEL GÖREV */}
            {user.role === 'ADMIN' &&
              taskType === 'PERSONAL' && (
                <div className="task-form-group">
                  <label htmlFor="task-assigned-admin">
                    Atanan kişi
                  </label>

                  <input
                    id="task-assigned-admin"
                    type="text"
                    value={user.full_name}
                    disabled
                  />
                </div>
              )}

            <div className="task-form-group task-form-group-full">
              <label htmlFor="task-description">
                Açıklama
              </label>

              <textarea
                id="task-description"
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
              />
            </div>

          </div>

          <div className="task-form-actions">

            <button
              type="submit"
              className="tasks-button tasks-button-primary"
              disabled={actionLoading}
            >
              {actionLoading
                ? 'İşleniyor...'
                : editingTask
                  ? 'Görevi Güncelle'
                  : 'Görev Oluştur'}
            </button>

            {editingTask && (
              <button
                type="button"
                className="tasks-button"
                onClick={resetTaskForm}
                disabled={actionLoading}
              >
                İptal
              </button>
            )}

          </div>

        </form>
      </section>

      {/* ARAMA VE FİLTRE */}
      <section className="tasks-card">

        <h2>Görevleri Ara ve Filtrele</h2>

        <div className="tasks-filters">

          <input
            className="tasks-filter"
            type="text"
            placeholder="Görev ara..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />

          <select
            className="tasks-filter"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(
                event.target.value,
              )
              setPage(0)
            }}
          >
            <option value="">
              Tüm Durumlar
            </option>

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
              İptal Edildi
            </option>
          </select>

          <select
            className="tasks-filter"
            value={priorityFilter}
            onChange={(event) => {
              setPriorityFilter(
                event.target.value,
              )
              setPage(0)
            }}
          >
            <option value="">
              Tüm Öncelikler
            </option>

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

          <select
            className="tasks-filter"
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value)
              setPage(0)
            }}
          >
            <option value="id">
              ID
            </option>

            <option value="title">
              Başlık
            </option>

            <option value="priority">
              Öncelik
            </option>

            <option value="due_date">
              Son Tarih
            </option>
          </select>

          <select
            className="tasks-filter"
            value={sortOrder}
            onChange={(event) => {
              setSortOrder(
                event.target.value,
              )
              setPage(0)
            }}
          >
            <option value="asc">
              Artan
            </option>

            <option value="desc">
              Azalan
            </option>
          </select>

        </div>

        <div className="tasks-filter-actions">

          <input
            className="tasks-filter"
            type="datetime-local"
            value={dueDateFrom}
            onChange={(event) => {
              setDueDateFrom(
                event.target.value,
              )
              setPage(0)
            }}
          />

          <input
            className="tasks-filter"
            type="datetime-local"
            value={dueDateTo}
            onChange={(event) => {
              setDueDateTo(
                event.target.value,
              )
              setPage(0)
            }}
          />

          <button
            type="button"
            className="tasks-button"
            onClick={handleSearch}
          >
            Ara
          </button>

        </div>

      </section>

      {/* GÖREV LİSTESİ */}
      <section className="tasks-card">

        <h2>Görev Listesi</h2>

        {tasks.length === 0 ? (
          <p className="tasks-empty">
            Gösterilecek görev bulunmuyor.
          </p>
        ) : (
          <div className="tasks-table-wrapper">

            <table className="tasks-table">

              <thead>
                <tr>
                  <th>Görev</th>
                  <th>Durum</th>
                  <th>Öncelik</th>
                  <th>Atanan</th>
                  <th>Oda</th>
                  <th>Son Tarih</th>
                  <th>İşlemler</th>
                </tr>
              </thead>

              <tbody>

                {tasks.map((task) => (
                  <tr key={task.id}>

                    <td>
                      <div className="task-title">
                        {task.title}
                      </div>

                      <div className="task-description">
                        {task.description || 'Açıklama yok'}
                      </div>
                    </td>

                    <td>
                      <span className="task-badge">
                        {task.status}
                      </span>
                    </td>

                    <td>
                      <span className="task-badge">
                        {task.priority}
                      </span>
                    </td>

                    <td>
                      {getAssignedPersonName(task)}
                    </td>

                    <td>
                      {task.room_id
                        ? getRoomName(task.room_id)
                        : 'Kişisel'}
                    </td>

                    <td>
                      {task.due_date
                        ? new Date(
                            task.due_date,
                          ).toLocaleString(
                            'tr-TR',
                          )
                        : 'Belirlenmemiş'}
                    </td>

                    <td>
                      <div className="task-actions">

                        {user.role === 'ADMIN' && (
                          <>
                            <button
                              type="button"
                              className="task-action-button"
                              onClick={() =>
                                handleEdit(task)
                              }
                            >
                              Güncelle
                            </button>

                            <button
                              type="button"
                              className="task-action-button tasks-button-danger"
                              onClick={() =>
                                handleDeleteTask(
                                  task.id,
                                )
                              }
                              disabled={actionLoading}
                            >
                              Sil
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          className="task-action-button"
                          onClick={() => {
                            window.location.href =
                              `/tasks/${task.id}`
                          }}
                        >
                          Detay
                        </button>

                      </div>
                    </td>

                  </tr>
                ))}

              </tbody>

            </table>

          </div>
        )}

      </section>

      {/* PAGINATION */}
      <section className="tasks-pagination">

        <span className="tasks-pagination-info">
          Sayfa {page + 1}
        </span>

        <div className="tasks-pagination-buttons">

          <button
            type="button"
            className="tasks-button"
            onClick={handlePreviousPage}
            disabled={page === 0}
          >
            Önceki
          </button>

          <button
            type="button"
            className="tasks-button"
            onClick={handleNextPage}
            disabled={
              (page + 1) * pageSize >=
              totalTasks
            }
          >
            Sonraki
          </button>

        </div>

      </section>

    </main>
  )
}

export default Tasks