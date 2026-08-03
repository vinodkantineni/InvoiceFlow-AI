import React, { useState, useEffect } from 'react'
import { Mail, CheckCircle2, AlertCircle, ArrowRight, Save, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

const MailConnect = () => {
  const { user } = useAuth()
  const [clientId, setClientId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [connection, setConnection] = useState(null)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    fetchConnection()
  }, [user])

  const fetchConnection = async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data } = await supabase.from('mail_connections').select('*').eq('user_id', user.id).maybeSingle()
      if (data) {
        setConnection(data)
        setClientId(data.oauth_client_id || '')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveClientId = async () => {
    if (!clientId) {
      setMessage({ text: 'Please enter a valid Client ID', type: 'error' })
      return
    }
    
    setSaving(true)
    setMessage({ text: '', type: '' })
    try {
      if (connection) {
        await supabase.from('mail_connections').update({ oauth_client_id: clientId }).eq('id', connection.id)
      } else {
        const { data } = await supabase.from('mail_connections').insert({ user_id: user.id, oauth_client_id: clientId }).select().single()
        setConnection(data)
      }
      setMessage({ text: 'Client ID saved. You can now connect your account.', type: 'success' })
    } catch (err) {
      setMessage({ text: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleConnect = () => {
    if (!clientId) {
      setMessage({ text: 'Please save your OAuth Client ID first.', type: 'error' })
      return
    }

    // Google OAuth 2.0 endpoint for authorization
    const oauth2Endpoint = 'https://accounts.google.com/o/oauth2/v2/auth'
    
    const form = document.createElement('form')
    form.setAttribute('method', 'GET')
    form.setAttribute('action', oauth2Endpoint)

    const redirectUri = `${window.location.origin}/mail/callback`
    
    // We use state to pass the user ID so the edge function knows who to save the token for
    const state = JSON.stringify({ userId: user.id })

    const params = {
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/gmail.readonly',
      include_granted_scopes: 'true',
      state: state,
      access_type: 'offline', // Request refresh token
      prompt: 'consent' // Force consent to ensure we get a refresh token
    }

    for (const p in params) {
      const input = document.createElement('input')
      input.setAttribute('type', 'hidden')
      input.setAttribute('name', p)
      input.setAttribute('value', params[p])
      form.appendChild(input)
    }

    document.body.appendChild(form)
    form.submit()
  }

  const handleMailSync = async () => {
    setIsSyncing(true)
    setMessage({ text: '', type: '' })
    try {
      const response = await fetch('http://localhost:3001/api/sync-mail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session.access_token}`
        },
        body: JSON.stringify({ userId: user.id })
      })
      
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to sync emails.')
      
      setMessage({ text: result.message, type: 'success' })
    } catch (err) {
      setMessage({ text: err.message, type: 'error' })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect your Gmail account? We will stop fetching new invoices.')) return
    
    setLoading(true)
    try {
      // In a real app, you might also want to call a Supabase Edge Function to revoke the token from Google
      await supabase.from('mail_connections').delete().eq('id', connection.id)
      setConnection(null)
      setClientId('')
      setMessage({ text: 'Gmail account disconnected.', type: 'success' })
    } catch (err) {
      setMessage({ text: err.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8">Loading...</div>

  const isConnected = connection && connection.refresh_token_encrypted

  return (
    <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(6, 182, 212, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Mail size={32} color="var(--accent-color)" />
        </div>
        <h1 className="text-2xl font-bold">Connect Gmail</h1>
        <p className="text-muted mt-2">Automatically fetch invoices from your inbox.</p>
      </div>

      {message.text && (
        <div className={`badge badge-${message.type === 'success' ? 'success' : 'danger'}`} style={{ display: 'flex', padding: '12px', marginBottom: '24px', alignItems: 'center', gap: '8px' }}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {isConnected ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', marginBottom: '16px' }}>
            <CheckCircle2 size={32} color="var(--success-color)" />
          </div>
          <h2 className="text-xl font-bold mb-2">Successfully Connected</h2>
          <p className="text-muted mb-6">We are now fetching invoices sent to {connection.email || 'your connected account'}.</p>
          <div className="flex gap-4 justify-center">
            <button className="btn btn-secondary" onClick={handleMailSync} disabled={isSyncing}>
              {isSyncing ? <Loader2 size={16} className="animate-spin" /> : 'Sync Now'}
            </button>
            <button className="btn btn-danger" onClick={handleDisconnect} disabled={isSyncing}>Disconnect</button>
          </div>
        </div>
      ) : (
        <div className="glass-card">
          <div style={{ marginBottom: '24px' }}>
            <h3 className="font-semibold mb-2">1. Configure OAuth Client ID</h3>
            <p className="text-sm text-muted mb-4">To connect to Gmail directly from your browser, you must provide your own Google Cloud OAuth Client ID.</p>
            <div className="flex gap-2">
              <input 
                type="text" 
                className="form-input flex-1" 
                placeholder="YOUR_CLIENT_ID.apps.googleusercontent.com" 
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              />
              <button className="btn btn-secondary" onClick={handleSaveClientId} disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save
              </button>
            </div>
          </div>

          <div style={{ height: '1px', background: 'var(--border-color)', margin: '24px 0' }}></div>

          <div>
            <h3 className="font-semibold mb-2">2. Authorize Access</h3>
            <p className="text-sm text-muted mb-4">Click below to authorize InvoiceFlow AI to read your emails to extract invoices.</p>
            <button 
              className="btn btn-primary w-full" 
              onClick={handleConnect}
              disabled={!clientId}
              style={{ opacity: !clientId ? 0.5 : 1 }}
            >
              Connect Gmail Account <ArrowRight size={16} style={{ marginLeft: '8px' }} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MailConnect
