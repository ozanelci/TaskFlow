export async function getTasks({
  status = '',
  priority = '',
  search = '',
  dueDateFrom = '',
  dueDateTo = '',
  page = 0,
  pageSize = 10,
  sortBy = 'id',
  sortOrder = 'asc',
} = {}) {
  const token = localStorage.getItem('access_token')

  const params = new URLSearchParams()

  if (status) {
    params.append('status', status)
  }

  if (priority) {
    params.append('priority', priority)
  }

  if (search) {
    params.append('search', search)
  }

  if (dueDateFrom) {
    params.append('due_date_from', dueDateFrom)
  }

  if (dueDateTo) {
    params.append('due_date_to', dueDateTo)
  }

  params.append('skip', page * pageSize)
  params.append('limit', pageSize)

  params.append('sort_by', sortBy)
  params.append('sort_order', sortOrder)

  const response = await fetch(
    `http://127.0.0.1:8000/tasks?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message || 'Görevler alınamadı.',
    )
  }

  return data
}


export async function getMyTasks() {
  const token = localStorage.getItem('access_token')

  const response = await fetch(
    'http://127.0.0.1:8000/tasks/my',
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message || 'Kendi görevlerin alınamadı.',
    )
  }

  return data
}


export async function createTask(taskData) {
  const token = localStorage.getItem('access_token')

  const response = await fetch(
    'http://127.0.0.1:8000/tasks',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(taskData),
    },
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message || 'Görev oluşturulamadı.',
    )
  }

  return data
}

export async function getTaskHistory(taskId) {
  const token = localStorage.getItem('access_token')

  const response = await fetch(
    `http://127.0.0.1:8000/tasks/${taskId}/history`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message || 'Görev geçmişi alınamadı.',
    )
  }

  return data
}

export async function updateTask(taskId, taskData) {
  const token = localStorage.getItem('access_token')

  const response = await fetch(
    `http://127.0.0.1:8000/tasks/${taskId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(taskData),
    },
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message || 'Görev güncellenemedi.',
    )
  }

  return data
}

export async function deleteTask(taskId) {
  const token = localStorage.getItem('access_token')

  const response = await fetch(
    `http://127.0.0.1:8000/tasks/${taskId}`,
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
      data.message || 'Görev silinemedi.',
    )
  }

  return data
}


export async function getPersonnel() {
  const token = localStorage.getItem('access_token')

  const response = await fetch(
    'http://127.0.0.1:8000/personnel',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message || 'Personeller alınamadı.',
    )
  }

  return data
}

export async function getTask(taskId) {
  const token = localStorage.getItem('access_token')

  const response = await fetch(
    `http://127.0.0.1:8000/tasks/${taskId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message || 'Görev alınamadı.',
    )
  }

  return data
}