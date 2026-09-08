import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../services/authService';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import './Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Lütfen tüm alanları doldurun.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await loginUser(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Giriş yapılamadı. Lütfen bilgilerinizi kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-layout">
      {/* Left Branding Panel */}
      <div className="login-branding">
        <div className="login-branding-bg">
          <div className="login-branding-circle-1"></div>
          <div className="login-branding-circle-2"></div>
        </div>

        <div className="relative z-10">
          <Link to="/" className="login-brand-logo">
            <span>Task</span>
            <span className="highlight">O</span>
            <span>zz</span>
          </Link>
        </div>

        <div className="login-branding-content">
          <h1 className="login-branding-title">
            Ekipler için modern <br/>
            <span>görev yönetimi.</span>
          </h1>
          <p className="login-branding-desc">
            TaskOzz ile projelerinizi yönetin, ekibinizle işbirliği yapın ve iş süreçlerinizi hızlandırın. B2B dünyasında fark yaratan SaaS çözümü.
          </p>
          
          <div className="login-features">
            <div className="login-feature-item">
              <div className="login-feature-icon">
                <CheckCircle2 size={16} />
              </div>
              <span className="login-feature-text">Sınırsız proje ve görev takibi</span>
            </div>
            <div className="login-feature-item">
              <div className="login-feature-icon">
                <CheckCircle2 size={16} />
              </div>
              <span className="login-feature-text">Gelişmiş ekip yönetimi</span>
            </div>
            <div className="login-feature-item">
              <div className="login-feature-icon">
                <CheckCircle2 size={16} />
              </div>
              <span className="login-feature-text">Gerçek zamanlı bildirimler</span>
            </div>
          </div>
        </div>

        <div className="login-branding-footer">
          <span>&copy; 2026 TaskOzz Inc.</span>
          <a href="#">Gizlilik & Şartlar</a>
        </div>
      </div>

      {/* Right Login Form Panel */}
      <div className="login-form-panel">
        <div className="login-mobile-header">
          <Link to="/" className="login-brand-logo">
            <span>Task</span>
            <span className="highlight">O</span>
            <span>zz</span>
          </Link>
        </div>

        <div className="login-form-container">
          <div className="login-form-header">
            <h2>Tekrar Hoş Geldiniz</h2>
            <p>Hesabınıza giriş yaparak çalışmaya başlayın.</p>
          </div>

          {error && (
            <div className="login-error-alert">
              <AlertCircle size={18} />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-form-group">
              <label htmlFor="email" className="login-form-label">
                E-posta Adresi
              </label>
              <div className="login-input-wrapper">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@sirket.com"
                  required
                  autoFocus
                  className="login-input"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="login-form-group">
              <div className="login-form-label-row">
                <label htmlFor="password" className="login-form-label">
                  Şifre
                </label>
                <Link to="#" className="login-form-forgot">
                  Şifremi Unuttum
                </Link>
              </div>
              <div className="login-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="login-input with-icon"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="login-password-toggle"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="login-submit-btn"
            >
              {loading && <Loader2 size={18} className="login-spinner" />}
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>

          <div className="login-register-link">
            <p>
              Hesabınız yok mu?{' '}
              <Link to="/register">Hemen Kayıt Olun</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
