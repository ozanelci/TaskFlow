import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCurrentUser } from '../services/authService'
import {
  getTasks,
  getPersonnel,
} from '../services/taskService'
import './Dashboard.css'

function Dashboard() {
  const [user, setUser] = useState(null)
  const [tasks, setTasks] = useState([])
  const [personnel, setPersonnel] = useState([])
  const [selectedPersonnel, setSelectedPersonnel] = useState(null)
  const [selectedStatus, setSelectedStatus] = useState(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true)
        setError('')

        const userData = await getCurrentUser()

        const taskData = await getTasks({
          page: 0,
          pageSize: 1000,
        })

        setUser(userData)
        setTasks(taskData.items || taskData)

        if (userData.role === 'ADMIN') {
          const personnelData = await getPersonnel()
          setPersonnel(personnelData)
        }
      } catch (error) {
        console.error(
          'Dashboard yüklenemedi:',
          error.message,
        )
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  if (loading) {
    return (
      <main className="dashboard">
        <p>Dashboard yükleniyor...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="dashboard">
        <h1>Dashboard</h1>
        <p>Hata: {error}</p>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="dashboard">
        <p>Kullanıcı bilgisi bulunamadı.</p>
      </main>
    )
  }

  const totalTasks = tasks.length

  const todoTasks = tasks.filter(
    (task) => task.status === 'TODO',
  ).length

  const inProgressTasks = tasks.filter(
    (task) => task.status === 'IN_PROGRESS',
  ).length

  const doneTasks = tasks.filter(
    (task) => task.status === 'DONE',
  ).length

  const overdueTasks = tasks.filter((task) => {
    if (
      !task.due_date ||
      task.status === 'DONE' ||
      task.status === 'CANCELLED'
    ) {
      return false
    }

    return new Date(task.due_date) < new Date()
  }).length

  const myTasks = tasks.filter(
  (task) => task.assigned_to === user.id,
)

  const myTotalTasks = myTasks.length

  const myDoneTasks = myTasks.filter(
    (task) => task.status === 'DONE',
  ).length

  const myCompletionRate =
    myTotalTasks === 0
      ? 0
      : Math.round(
          (myDoneTasks / myTotalTasks) * 100,
        )

  const teamCompletionRate =
    totalTasks === 0
      ? 0
      : Math.round(
          (doneTasks / totalTasks) * 100,
        )

  function handleStatusClick(status) {
    setSelectedStatus(
      selectedStatus === status ? null : status,
    )
  }

  function getSelectedTasks() {
    if (selectedStatus === 'ALL') {
      return tasks
    }

    if (selectedStatus === 'OVERDUE') {
      return tasks.filter((task) => {
        if (
          !task.due_date ||
          task.status === 'DONE' ||
          task.status === 'CANCELLED'
        ) {
          return false
        }

        return new Date(task.due_date) < new Date()
      })
    }

    return tasks.filter(
      (task) => task.status === selectedStatus,
    )
  }

  const selectedTasks = getSelectedTasks()

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>
            Hoş geldin, {user.full_name}
          </p>
        </div>

        <div className="user-role">
          {user.role}
        </div>
      </header>

      <nav>
        <Link to="/tasks">
          Görevler
        </Link>

        <Link to="/task-requests">
          Görev Talepleri
        </Link>

        {user.role === 'ADMIN' && (
          <Link to="/users">
            Kullanıcılar
          </Link>
        )}
      </nav>

      {user.role === 'ADMIN' ? (
        <>
          <section className="task-flow">
            <div className="section-heading">
              <h2>Ekip Görev Akışı</h2>

              <p>
                Bir aşamaya tıklayarak görevleri
                görüntüleyebilirsin.
              </p>
            </div>

            <div className="flow-line">
              <button
                className="flow-step"
                type="button"
                onClick={() =>
                  handleStatusClick('ALL')
                }
              >
                <div className="flow-dot total"></div>
                <strong>{totalTasks}</strong>
                <span>Toplam</span>
              </button>

              <button
                className="flow-step"
                type="button"
                onClick={() =>
                  handleStatusClick('IN_PROGRESS')
                }
              >
                <div className="flow-dot progress"></div>
                <strong>{inProgressTasks}</strong>
                <span>Devam Eden</span>
              </button>

              <button
                className="flow-step"
                type="button"
                onClick={() =>
                  handleStatusClick('TODO')
                }
              >
                <div className="flow-dot waiting"></div>
                <strong>{todoTasks}</strong>
                <span>Bekleyen</span>
              </button>

              <button
                className="flow-step"
                type="button"
                onClick={() =>
                  handleStatusClick('OVERDUE')
                }
              >
                <div className="flow-dot overdue"></div>
                <strong>{overdueTasks}</strong>
                <span>Geciken</span>
              </button>

              <button
                className="flow-step"
                type="button"
                onClick={() =>
                  handleStatusClick('DONE')
                }
              >
                <div className="flow-dot done"></div>
                <strong>{doneTasks}</strong>
                <span>Tamamlanan</span>
              </button>
            </div>
          </section>

          {selectedStatus && (
            <section className="dashboard-card">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <h2>
                  {selectedStatus === 'ALL'
                    ? 'Tüm Görevler'
                    : selectedStatus === 'IN_PROGRESS'
                      ? 'Devam Eden Görevler'
                      : selectedStatus === 'TODO'
                        ? 'Bekleyen Görevler'
                        : selectedStatus === 'OVERDUE'
                          ? 'Geciken Görevler'
                          : 'Tamamlanan Görevler'}
                </h2>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedStatus(null)
                  }
                >
                  Kapat
                </button>
              </div>

              {selectedTasks.length === 0 ? (
                <p>
                  Bu kategoride görev bulunmuyor.
                </p>
              ) : (
                selectedTasks.map((task) => (
                  <div key={task.id}>
                    <strong>{task.title}</strong>

                    <p>
                      {task.priority} · {task.status}
                    </p>

                    <p>
                      {task.due_date
                        ? new Date(
                            task.due_date,
                          ).toLocaleDateString(
                            'tr-TR',
                          )
                        : 'Tarih yok'}
                    </p>
                  </div>
                ))
              )}
            </section>
          )}

          <section className="dashboard-content">
            <div className="dashboard-card">
              <h2>Benim Görevlerim</h2>

              <div className="stats-grid">
                <div className="stat-item">
                  <span>Toplam</span>
                  <strong>
                    {myTotalTasks}
                  </strong>
                </div>

                <div className="stat-item">
                  <span>Tamamlanan</span>
                  <strong>
                    {myDoneTasks}
                  </strong>
                </div>

                <div className="stat-item">
                  <span>Tamamlanma</span>
                  <strong>
                    {myCompletionRate}%
                  </strong>
                </div>
              </div>
            </div>

            <div className="dashboard-card">
              <h2>
                Ekibin Tamamlanma Oranı
              </h2>

              <strong>
                {teamCompletionRate}%
              </strong>
            </div>
          </section>

          <section className="dashboard-card">
            <h2>Personeller</h2>

            {personnel.length > 0 ? (
              personnel.map((person) => (
                <div key={person.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedPersonnel(
                        person,
                      )
                    }
                  >
                    {person.full_name}
                  </button>
                </div>
              ))
            ) : (
              <p>
                Henüz görev verdiğin bir personel
                yok.
              </p>
            )}

            {selectedPersonnel && (
              <div>
                <h3>
                  {selectedPersonnel.full_name}
                </h3>

                <p>
                  Seçilen personelin görev
                  detayları daha sonra
                  eklenebilir.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedPersonnel(null)
                  }
                >
                  Kapat
                </button>
              </div>
            )}
          </section>
        </>
      ) : (
        <>
          <section className="task-flow">
            <div className="section-heading">
              <h2>Görev Akışım</h2>

              <p>
                Bir aşamaya tıklayarak görevleri
                görüntüleyebilirsin.
              </p>
            </div>

            <div className="flow-line">
              <button
                className="flow-step"
                type="button"
                onClick={() =>
                  handleStatusClick('ALL')
                }
              >
                <div className="flow-dot total"></div>
                <strong>{totalTasks}</strong>
                <span>Toplam</span>
              </button>

              <button
                className="flow-step"
                type="button"
                onClick={() =>
                  handleStatusClick('IN_PROGRESS')
                }
              >
                <div className="flow-dot progress"></div>
                <strong>{inProgressTasks}</strong>
                <span>Devam Eden</span>
              </button>

              <button
                className="flow-step"
                type="button"
                onClick={() =>
                  handleStatusClick('TODO')
                }
              >
                <div className="flow-dot waiting"></div>
                <strong>{todoTasks}</strong>
                <span>Bekleyen</span>
              </button>

              <button
                className="flow-step"
                type="button"
                onClick={() =>
                  handleStatusClick('OVERDUE')
                }
              >
                <div className="flow-dot overdue"></div>
                <strong>{overdueTasks}</strong>
                <span>Geciken</span>
              </button>

              <button
                className="flow-step"
                type="button"
                onClick={() =>
                  handleStatusClick('DONE')
                }
              >
                <div className="flow-dot done"></div>
                <strong>{doneTasks}</strong>
                <span>Tamamlanan</span>
              </button>
            </div>
          </section>

          {selectedStatus && (
            <section className="dashboard-card">
              <h2>
                {selectedStatus === 'ALL'
                  ? 'Tüm Görevler'
                  : selectedStatus === 'IN_PROGRESS'
                    ? 'Devam Eden Görevler'
                    : selectedStatus === 'TODO'
                      ? 'Bekleyen Görevler'
                      : selectedStatus === 'OVERDUE'
                        ? 'Geciken Görevler'
                        : 'Tamamlanan Görevler'}
              </h2>

              {selectedTasks.length === 0 ? (
                <p>
                  Bu kategoride görev bulunmuyor.
                </p>
              ) : (
                selectedTasks.map((task) => (
                  <div key={task.id}>
                    <strong>{task.title}</strong>

                    <p>
                      {task.priority} · {task.status}
                    </p>

                    <p>
                      {task.due_date
                        ? new Date(
                            task.due_date,
                          ).toLocaleDateString(
                            'tr-TR',
                          )
                        : 'Tarih yok'}
                    </p>
                  </div>
                ))
              )}
            </section>
          )}
        </>
      )}
    </main>
  )
}

export default Dashboard