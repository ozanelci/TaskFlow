import { useEffect, useState } from 'react'
import { getCurrentUser, updateProfile, changePassword } from '../services/authService'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { Icons } from '../components/ui/Icons'
// Removed Profile.css as we use global UI system now

function Profile() {
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  useEffect(() => {
    let cancelled = false
    async function loadUser() {
      try {
        setLoading(true)
        const user = await getCurrentUser()
        if (!cancelled) {
          setFullName(user.full_name)
          setEmail(user.email)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      }
    }
    loadUser()
    return () => { cancelled = true }
  }, [])

  async function handleUpdateProfile(e) {
    e.preventDefault()
    if (!fullName.trim() || !email.trim()) {
      setError('Ad Soyad ve Email boş bırakılamaz.')
      return
    }
    try {
      setActionLoading(true)
      setError('')
      setSuccess('')
      const updatedUser = await updateProfile(fullName, email)
      setFullName(updatedUser.full_name)
      setEmail(updatedUser.email)
      setSuccess('Profil bilgileriniz güncellendi.')
    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    if (!oldPassword || !newPassword) {
      setError('Lütfen mevcut ve yeni şifrenizi girin.')
      return
    }
    try {
      setActionLoading(true)
      setError('')
      setSuccess('')
      const res = await changePassword(oldPassword, newPassword)
      setSuccess(res.message || 'Şifreniz başarıyla güncellendi.')
      setOldPassword('')
      setNewPassword('')
    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 20px' }}>
        <Icons.Loader2 className="ui-button-spinner" size={32} color="var(--primary)" />
      </div>
    )
  }

  return (
    <main style={{ padding: '32px', maxWidth: 'var(--max-width)', margin: '0 auto' }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, marginBottom: 8, letterSpacing: '-0.02em' }}>Profilim</h1>
        <p style={{ color: 'var(--text-muted)' }}>Kişisel bilgilerinizi ve şifrenizi buradan yönetebilirsiniz.</p>
      </header>

      {error && (
        <div style={{ background: 'var(--danger-light)', color: 'var(--danger-text)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icons.AlertCircle size={16} />
          {error}
        </div>
      )}
      
      {success && (
        <div style={{ background: 'var(--success-light)', color: 'var(--success-text)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icons.CheckCircle2 size={16} />
          {success}
        </div>
      )}

      <div style={{ display: 'grid', gap: 32, gridTemplateColumns: '1fr', maxWidth: 600 }}>
        <Card padding="lg">
          <h2 style={{ fontSize: 18, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>Kişisel Bilgiler</h2>
          <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input
              label="Ad Soyad"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <Input
              label="E-posta Adresi"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div style={{ marginTop: 8 }}>
              <Button type="submit" variant="primary" isLoading={actionLoading}>Bilgileri Güncelle</Button>
            </div>
          </form>
        </Card>

        <Card padding="lg">
          <h2 style={{ fontSize: 18, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>Şifre Değiştir</h2>
          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input
              label="Mevcut Şifre"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
            <Input
              label="Yeni Şifre"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <div style={{ marginTop: 8 }}>
              <Button type="submit" variant="secondary" isLoading={actionLoading}>Şifreyi Değiştir</Button>
            </div>
          </form>
        </Card>
      </div>
    </main>
  )
}

export default Profile
