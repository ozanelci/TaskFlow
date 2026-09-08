import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Icons } from '../components/ui/Icons';
import './Auth.css';

// Using fetch directly as per original implementation, or if there's an authService register:
const API_URL = 'http://127.0.0.1:8000';

function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setError('Lütfen tüm alanları doldurun.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email: email,
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Kayıt başarısız oldu.');
      }

      navigate('/login');
    } catch (err) {
      setError(err.message || 'Kayıt işlemi sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-layout">
      <Link to="/" className="auth-brand">
        Task<span>O</span>zz
      </Link>
      
      <div className="auth-container">
        <Card padding="lg">
          <div className="auth-header">
            <h1>Hesap Oluşturun</h1>
            <p>Taskozz'a katılarak işlerinizi profesyonelce yönetin.</p>
          </div>

          {error && (
            <div className="auth-alert">
              <Icons.AlertCircle className="auth-alert-icon" size={16} />
              <span>{error}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <Input
              label="Ad Soyad"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ahmet Yılmaz"
              required
              autoFocus
            />

            <Input
              label="E-posta Adresi"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@sirket.com"
              required
            />

            <Input
              label="Şifre"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="En az 8 karakter"
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={loading}
              style={{ width: '100%' }}
            >
              Kayıt Ol
            </Button>
          </form>

          <div className="auth-footer">
            Zaten hesabınız var mı? <Link to="/login">Giriş Yapın</Link>
          </div>
        </Card>
      </div>
    </main>
  );
}

export default Register;