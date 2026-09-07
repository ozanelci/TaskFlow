import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerUser } from '../services/authService'

function Register() {
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState('USER')
  async function handleSubmit(event) {
    event.preventDefault()

    try {
      setLoading(true)
      setError('')

      await registerUser(fullName, email, password, role)

      navigate('/login')
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1>Taskozz</h1>
      <h2>Kayıt Ol</h2>

      {error && <p>Hata: {error}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="fullName">Ad Soyad</label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="password">Şifre</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <div>
  <label htmlFor="role">
    Hesap Türü
  </label>

  <select
    id="role"
    value={role}
    onChange={(event) =>
      setRole(event.target.value)
    }
  >
    <option value="USER">
      Kullanıcı
    </option>

    <option value="ADMIN">
      Yönetici
    </option>
  </select>
</div>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Kayıt oluşturuluyor...' : 'Kayıt Ol'}
        </button>
      </form>

      <p>
        Zaten hesabın var mı?{' '}
        <Link to="/login">Giriş Yap</Link>
      </p>
    </div>
  )
}

export default Register