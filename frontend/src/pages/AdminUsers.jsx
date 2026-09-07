import { useEffect, useState } from 'react'
import {
  getUsers,
  updateUser,
  deleteUser,
} from '../services/userService'
import './AdminUsers.css'

function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadUsers() {
      try {
        const data = await getUsers()

        if (!cancelled) {
          setUsers(data)
          setLoading(false)
        }
      } catch (error) {
        if (!cancelled) {
          setError(error.message)
          setLoading(false)
        }
      }
    }

    loadUsers()

    return () => {
      cancelled = true
    }
  }, [])

  async function refreshUsers() {
    try {
      const data = await getUsers()
      setUsers(data)
    } catch (error) {
      setError(error.message)
    }
  }

  async function handleRoleChange(userId, role) {
    try {
      setActionLoading(userId)
      setError('')

      await updateUser(userId, {
        role: role,
      })

      await refreshUsers()
    } catch (error) {
      setError(error.message)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleActiveChange(userId, isActive) {
    try {
      setActionLoading(userId)
      setError('')

      await updateUser(userId, {
        is_active: isActive,
      })

      await refreshUsers()
    } catch (error) {
      setError(error.message)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDeactivate(userId) {
    const confirmed = window.confirm(
      'Bu kullanıcıyı devre dışı bırakmak istediğinize emin misiniz?'
    )

    if (!confirmed) {
      return
    }

    try {
      setActionLoading(userId)
      setError('')

      await deleteUser(userId)

      await refreshUsers()
    } catch (error) {
      setError(error.message)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <main className="admin-users-page">
        <div className="admin-users-message">
          Kullanıcılar yükleniyor...
        </div>
      </main>
    )
  }

  return (
    <main className="admin-users-page">

      <header className="admin-users-header">
        <div>
          <h1>Kullanıcı Yönetimi</h1>

          <p>
            Sistemdeki kullanıcıları ve yetkilerini yönetin.
          </p>
        </div>
      </header>

      {error && (
        <div className="admin-users-error">
          Hata: {error}
        </div>
      )}

      <section className="admin-users-card">

        <div className="admin-users-section-header">
          <div>
            <h2>Kullanıcılar</h2>

            <p>
              {users.length} kullanıcı
            </p>
          </div>
        </div>

        {users.length === 0 ? (

          <div className="admin-users-empty">
            Sistemde kullanıcı bulunmuyor.
          </div>

        ) : (

          <div className="admin-users-table-wrapper">

            <table className="admin-users-table">

              <thead>
                <tr>
                  <th>ID</th>
                  <th>Kullanıcı</th>
                  <th>E-posta</th>
                  <th>Rol</th>
                  <th>Durum</th>
                  <th>İşlemler</th>
                </tr>
              </thead>

              <tbody>

                {users.map((user) => {

                  const isLoading =
                    actionLoading === user.id

                  return (
                    <tr key={user.id}>

                      <td>
                        #{user.id}
                      </td>

                      <td>
                        <div className="admin-user-name">
                          {user.full_name}
                        </div>
                      </td>

                      <td>
                        {user.email}
                      </td>

                      <td>
                        <select
                          value={user.role}
                          onChange={(event) =>
                            handleRoleChange(
                              user.id,
                              event.target.value
                            )
                          }
                          disabled={isLoading}
                          className="admin-user-select"
                        >
                          <option value="USER">
                            USER
                          </option>

                          <option value="ADMIN">
                            ADMIN
                          </option>
                        </select>
                      </td>

                      <td>
                        <span
                          className={
                            user.is_active
                              ? 'admin-user-status active'
                              : 'admin-user-status inactive'
                          }
                        >
                          {user.is_active
                            ? 'Aktif'
                            : 'Pasif'}
                        </span>
                      </td>

                      <td>
                        <div className="admin-user-actions">

                          {user.is_active ? (

                            <button
                              type="button"
                              className="admin-user-button admin-user-button-danger"
                              onClick={() =>
                                handleDeactivate(user.id)
                              }
                              disabled={isLoading}
                            >
                              {isLoading
                                ? 'İşleniyor...'
                                : 'Devre Dışı Bırak'}
                            </button>

                          ) : (

                            <button
                              type="button"
                              className="admin-user-button"
                              onClick={() =>
                                handleActiveChange(
                                  user.id,
                                  true
                                )
                              }
                              disabled={isLoading}
                            >
                              {isLoading
                                ? 'İşleniyor...'
                                : 'Aktifleştir'}
                            </button>

                          )}

                        </div>
                      </td>

                    </tr>
                  )
                })}

              </tbody>

            </table>

          </div>
        )}

      </section>

    </main>
  )
}

export default AdminUsers