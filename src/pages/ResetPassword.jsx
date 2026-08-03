import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Mail, ArrowRight, Loader2, CheckCircle2, Lock } from 'lucide-react'

const ResetPassword = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  
  const { resetPassword } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    
    try {
      const { error } = await resetPassword(email)
      if (error) throw error
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center h-full min-h-screen" style={{ backgroundColor: 'var(--bg-color)' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '400px', margin: '20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '12px', background: 'var(--surface-2-color)', marginBottom: '16px' }}>
            <Lock size={24} color="var(--primary-light)" />
          </div>
          <h1 className="text-2xl font-bold">Reset password</h1>
          <p className="text-muted mt-2">Enter your email and we'll send you a reset link</p>
        </div>

        {error && (
          <div className="badge badge-danger" style={{ display: 'block', padding: '12px', marginBottom: '24px', textAlign: 'center', whiteSpace: 'normal' }}>
            {error}
          </div>
        )}

        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', marginBottom: '24px' }}>
              <CheckCircle2 size={32} color="var(--success-color)" />
            </div>
            <h3 className="text-lg font-bold" style={{ marginBottom: '8px' }}>Check your email</h3>
            <p className="text-muted" style={{ marginBottom: '24px' }}>
              We've sent password reset instructions to <strong>{email}</strong>
            </p>
            <Link to="/login" className="btn btn-secondary w-full" style={{ height: '44px' }}>
              Return to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label">Email</label>
              <div style={{ position: 'relative' }}>
                <Mail style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={18} />
                <input
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: '40px' }}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ height: '44px' }}>
              {loading ? <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> : 'Send reset link'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>
        )}

        {!success && (
          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <Link to="/login">← Back to login</Link>
          </div>
        )}
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default ResetPassword
