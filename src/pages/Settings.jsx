import React, { useState, useEffect } from 'react'
import { Save, Key, Mail, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

const Settings = () => {
  const { user } = useAuth()
  const [settings, setSettings] = useState({
    gemini_api_key_encrypted: '',
    gemini_model: 'gemini-2.5-flash',
    confidence_threshold: 70,
    theme: 'dark',
    accent_color: 'purple'
  })
  const [mailConnection, setMailConnection] = useState(null)
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  useEffect(() => {
    fetchSettings()
  }, [user])

  const fetchSettings = async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data: setRes } = await supabase.from('settings').select('*').eq('user_id', user.id).single()
      if (setRes) {
        setSettings(setRes)
      } else {
        // Create if missing
        const { data: newSet } = await supabase.from('settings').insert({ user_id: user.id }).select().single()
        if (newSet) setSettings(newSet)
      }

      const { data: mailRes } = await supabase.from('mail_connections').select('*').eq('user_id', user.id).maybeSingle()
      if (mailRes) {
        setMailConnection(mailRes)
      }
    } catch (err) {
      console.error('Error fetching settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage({ text: '', type: '' })
    try {
      const { error } = await supabase
        .from('settings')
        .update(settings)
        .eq('user_id', user.id)

      if (error) throw error
      setMessage({ text: 'Settings saved successfully', type: 'success' })
    } catch (err) {
      setMessage({ text: err.message, type: 'error' })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage({ text: '', type: '' }), 3000)
    }
  }

  if (loading) {
    return <div className="p-8">Loading settings...</div>
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: '32px' }}>
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted">Manage your API keys, integrations, and preferences.</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          <span>Save Changes</span>
        </button>
      </div>

      {message.text && (
        <div className={`badge badge-${message.type === 'success' ? 'success' : 'danger'}`} style={{ display: 'flex', padding: '12px', marginBottom: '24px', alignItems: 'center', gap: '8px' }}>
          {message.type === 'success' && <CheckCircle2 size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* AI Configuration */}
      <div className="glass-card" style={{ marginBottom: '24px' }}>
        <h3 className="text-lg font-bold flex items-center gap-2" style={{ marginBottom: '24px' }}>
          <Key size={20} color="var(--primary-color)" />
          AI Extraction Configuration
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          <div>
            <label className="form-label font-semibold">Gemini API Key</label>
            <p className="text-sm text-muted mb-2">Used to process your uploaded PDFs and images.</p>
            <div style={{ position: 'relative' }}>
              <input 
                type={showKey ? 'text' : 'password'}
                className="form-input"
                style={{ paddingRight: '40px' }}
                value={settings.gemini_api_key_encrypted || ''}
                onChange={(e) => setSettings({ ...settings, gemini_api_key_encrypted: e.target.value })}
                placeholder="AIzaSy... or AQ..."
              />
              <button 
                onClick={() => setShowKey(!showKey)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <label className="form-label font-semibold">AI Model</label>
              <select 
                className="form-select"
                value={settings.gemini_model || 'gemini-2.5-flash'}
                onChange={(e) => setSettings({ ...settings, gemini_model: e.target.value })}
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast)</option>
                <option value="gemini-3.5-flash">Gemini 3.5 Flash (Fastest)</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Most Accurate)</option>
              </select>
            </div>
            <div>
              <label className="form-label font-semibold">Confidence Threshold (%)</label>
              <input 
                type="number"
                min="0"
                max="100"
                className="form-input"
                value={settings.confidence_threshold || 70}
                onChange={(e) => setSettings({ ...settings, confidence_threshold: parseInt(e.target.value) })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Gmail Integration */}
      <div className="glass-card">
        <h3 className="text-lg font-bold flex items-center gap-2" style={{ marginBottom: '24px' }}>
          <Mail size={20} color="var(--accent-color)" />
          Gmail Integration
        </h3>
        
        {mailConnection ? (
          <div>
            <div className="flex items-center justify-between p-4" style={{ background: 'var(--surface-2-color)', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
              <div>
                <p className="font-semibold">Connected to {mailConnection.email || 'Gmail'}</p>
                <p className="text-sm text-muted">Last synced: {mailConnection.last_synced_at ? new Date(mailConnection.last_synced_at).toLocaleString() : 'Never'}</p>
              </div>
              <span className="badge badge-success">Connected</span>
            </div>
            <button className="btn btn-danger">Disconnect</button>
          </div>
        ) : (
          <div>
            <p className="text-muted mb-4">Connect your Gmail account to automatically fetch invoices from your inbox.</p>
            <a href="/mail" className="btn btn-secondary">
              Connect Gmail
            </a>
          </div>
        )}
      </div>
      
    </div>
  )
}

export default Settings
