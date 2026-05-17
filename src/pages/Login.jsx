import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(false)
    if (password === import.meta.env.VITE_DASHBOARD_PASSWORD) {
      sessionStorage.setItem('auth', 'true')
      navigate('/dashboard')
    } else {
      setError(true)
      setPassword('')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌿</div>
          <h1 style={{ fontSize: 28, color: 'var(--forest-dark)', marginBottom: 6 }}>Tableau de bord</h1>
          <p style={{ color: 'var(--text-soft)', fontSize: 14 }}>Centre de bien-être · Accès privé</p>
        </div>
        <div className="card">
          <form onSubmit={handleSubmit}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8, color: 'var(--text-mid)' }}>Mot de passe</label>
            <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError(false) }}
              placeholder="••••••••" autoFocus style={{ marginBottom: error ? 8 : 16 }} disabled={loading} />
            {error && <p style={{ fontSize: 13, color: '#c0605e', marginBottom: 12 }}>Mot de passe incorrect.</p>}
            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Vérification…' : 'Accéder au tableau de bord'}
            </button>
          </form>
        </div>
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13 }}>
          <a href="/sondage" style={{ color: 'var(--forest)', textDecoration: 'none' }}>← Voir le sondage public</a>
        </p>
      </div>
    </div>
  )
}
