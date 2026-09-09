import { API_URL } from '../config'

export async function fetchApi(endpoint, options = {}) {
  const token = localStorage.getItem('access_token')

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  if (token) {
    headers['Authorization'] = "Bearer " + token
  }

  try {
    const response = await fetch(API_URL + endpoint, {
      ...options,
      headers,
    })

    if (response.status === 401) {
      localStorage.removeItem('access_token')
      if (window.location.pathname !== '/login') {
         window.location.href = '/login'
         throw new Error('Oturumunuz sona ermiş. Lütfen tekrar giriş yapın.')
      } else {
         throw new Error('E-posta veya şifre hatalı.')
      }
    }

    if (response.status === 403) {
      throw new Error('Bu işlem için yetkiniz yok.')
    }

    if (response.status === 204) {
      return null
    }

    let data
    try {
      data = await response.json()
    } catch {
      throw new Error('Sunucudan geçersiz veri döndü.')
    }

    if (!response.ok) {
      throw new Error(data.detail || data.message || 'İşlem gerçekleştirilemedi.')
    }

    return data
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      // eslint-disable-next-line preserve-caught-error
      throw new Error('Sunucuya ulaşılamıyor. Lütfen bağlantınızı kontrol edin.')
    }
    // eslint-disable-next-line preserve-caught-error
    throw error
  }
}
