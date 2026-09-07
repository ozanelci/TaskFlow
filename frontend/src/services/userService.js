export async function getUsers() {
  const token = localStorage.getItem('access_token')

  const response = await fetch(
    'http://127.0.0.1:8000/users',
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message || 'Kullanıcılar alınamadı.',
    )
  }

  return data
}

export async function updateUser(userId, userData) {
  const token = localStorage.getItem('access_token')

  const response = await fetch(
    `http://127.0.0.1:8000/users/${userId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    },
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message || 'Kullanıcı güncellenemedi.',
    )
  }

  return data
}

export async function deleteUser(userId) {
  const token = localStorage.getItem('access_token')

  const response = await fetch(
    `http://127.0.0.1:8000/users/${userId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message || 'Kullanıcı pasifleştirilemedi.',
    )
  }

  return data
}