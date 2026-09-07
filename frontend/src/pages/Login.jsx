import { useState } from 'react'
import { loginUser } from '../services/authService'
import { useNavigate, Link } from 'react-router-dom'

function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()

    try {
      const data = await loginUser(email, password)

      console.log('Giriş başarılı:', data)

      navigate('/dashboard')
    } catch (error) {
      console.error('Giriş hatası:', error.message)
    }
  }

  return (
    <div>
      <h1>Taskozz</h1>
      <h2>Giriş Yap</h2>

      <form onSubmit={handleSubmit}>
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
        </div>

        <button type="submit">
          Giriş Yap
        </button>
      </form>

      <p>
        Hesabın yok mu?{' '}
        <Link to="/register">
          Kayıt Ol
        </Link>
      </p>
    </div>
  )
}

export default Login