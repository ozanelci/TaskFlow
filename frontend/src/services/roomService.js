const API_URL = 'http://127.0.0.1:8000'

function getAuthHeaders() {
  const token = localStorage.getItem('access_token')

  if (!token) {
    throw new Error('Oturum bulunamadı.')
  }

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}


export async function createRoom(name) {
  const response = await fetch(`${API_URL}/rooms`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      name,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message ||
      data.detail ||
      'Oda oluşturulamadı.'
    )
  }

  return data
}


export async function joinRoom(joinCode) {
  const response = await fetch(`${API_URL}/rooms/join`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      join_code: joinCode,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message ||
      data.detail ||
      'Odaya katılma isteği gönderilemedi.'
    )
  }

  return data
}


export async function getRoomRequests(roomId) {
  const response = await fetch(
    `${API_URL}/rooms/${roomId}/requests`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message ||
      data.detail ||
      'Oda istekleri alınamadı.'
    )
  }

  return data
}


export async function approveRoomRequest(
  roomId,
  membershipId
) {
  const response = await fetch(
    `${API_URL}/rooms/${roomId}/requests/${membershipId}/approve`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message ||
      data.detail ||
      'Oda üyelik isteği onaylanamadı.'
    )
  }

  return data
}


export async function rejectRoomRequest(
  roomId,
  membershipId
) {
  const response = await fetch(
    `${API_URL}/rooms/${roomId}/requests/${membershipId}/reject`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message ||
      data.detail ||
      'Oda üyelik isteği reddedilemedi.'
    )
  }

  return data
}

export async function getMyRooms() {
  const response = await fetch(
    `${API_URL}/rooms/my`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message ||
      data.detail ||
      'Odalar alınamadı.'
    )
  }

  return data
}

export async function getRoomMembers(roomId) {
  const response = await fetch(
    `${API_URL}/rooms/${roomId}/members`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message ||
      data.detail ||
      'Oda üyeleri alınamadı.'
    )
  }

  return data
}