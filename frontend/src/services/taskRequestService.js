export async function createTaskRequest(requestData) {
  const token = localStorage.getItem('access_token')

  const response = await fetch(
    'http://127.0.0.1:8000/task-requests',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestData),
    },
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message || 'Talep oluşturulamadı.',
    )
  }

  return data
}

export async function getTaskRequests() {
  const token = localStorage.getItem('access_token')

  const response = await fetch(
    'http://127.0.0.1:8000/task-requests',
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message || 'Talepler alınamadı.',
    )
  }

  return data
}

export async function approveTaskRequest(requestId) {
  const token = localStorage.getItem('access_token')

  const response = await fetch(
    `http://127.0.0.1:8000/task-requests/${requestId}/approve`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message || 'Talep onaylanamadı.',
    )
  }

  return data
}

export async function rejectTaskRequest(
  requestId,
  reviewComment = '',
) {
  const token = localStorage.getItem('access_token')

  const url =
    `http://127.0.0.1:8000/task-requests/${requestId}/reject`

  const params = new URLSearchParams()

  if (reviewComment) {
    params.append('review_comment', reviewComment)
  }

  const response = await fetch(
    `${url}?${params.toString()}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message || 'Talep reddedilemedi.',
    )
  }

  return data
}