const API_URL = 'http://127.0.0.1:8000'

export async function login(email, password) {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email,
      password: password,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || 'Giriş yapılamadı.')
  }

  localStorage.setItem('access_token', data.access_token)

  return data
}


export async function register(fullName, email, password) {
  const response = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      full_name: fullName,
      email: email,
      password: password,
      role: 'USER',
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || 'Kayıt oluşturulamadı.')
  }

  return data
}


export async function getCurrentUser() {
  const token = localStorage.getItem('access_token')

  if (!token) {
    throw new Error('Oturum bulunamadı.')
  }

  const response = await fetch(`${API_URL}/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || 'Kullanıcı bilgisi alınamadı.')
  }

  return data
}


export async function loginUser(email, password) {
  const response = await fetch('http://127.0.0.1:8000/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email,
      password: password,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Giriş başarısız.')
  }

  localStorage.setItem('access_token', data.access_token)

  return data
}

export async function registerUser(fullName, email, password,role) {
  const response = await fetch('http://127.0.0.1:8000/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      full_name: fullName,
      email: email,
      password: password,
      role: role,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || 'Kayıt oluşturulamadı.')
  }

  return data
}