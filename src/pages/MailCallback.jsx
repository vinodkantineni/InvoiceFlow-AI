import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

const MailCallback = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [status, setStatus] = useState('processing')
  const [error, setError] = useState('')

  useEffect(() => {
    const processCallback = async () => {
      try {
        const code = searchParams.get('code')
        const errorParam = searchParams.get('error')

        if (errorParam) {
          throw new Error(`Google returned an error: ${errorParam}`)
        }

        if (!code) {
          throw new Error('No authorization code found in URL')
        }

        if (!user) {
          // If user is not loaded yet, wait. But typically it is.
          return
        }

        // Call the secure backend to exchange the code for a refresh token
        const response = await fetch('http://localhost:3001/api/exchange-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // We pass the user's Supabase JWT so the backend can securely act on their behalf
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session.access_token}`
          },
          body: JSON.stringify({
            code: code,
            clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '886128915733-tlvutrnl2s3015dfgetvt84q5pmim2tr.apps.googleusercontent.com', // fallback to hardcoded if not in env
            userId: user.id
          })
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to exchange token securely.')
        }

        setStatus('success')
        
        // Redirect back to Mail Connect after 3 seconds
        setTimeout(() => {
          navigate('/mail')
        }, 3000)

      } catch (err) {
        console.error(err)
        setError(err.message)
        setStatus('error')
      }
    }

    processCallback()
  }, [searchParams, navigate, user])

  return (
    <div className="flex h-screen w-full items-center justify-center p-4">
      <div className="glass-card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', padding: '40px' }}>
        {status === 'processing' && (
          <>
            <Loader2 size={48} className="animate-spin" color="var(--primary-color)" style={{ margin: '0 auto 24px' }} />
            <h2 className="text-xl font-bold mb-2">Connecting Gmail...</h2>
            <p className="text-muted text-sm">Please wait while we securely process your authorization.</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle2 size={48} color="var(--success-color)" style={{ margin: '0 auto 24px' }} />
            <h2 className="text-xl font-bold mb-2">Success!</h2>
            <p className="text-muted text-sm">Google Authorization complete. Redirecting you back...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle size={48} color="var(--danger-color)" style={{ margin: '0 auto 24px' }} />
            <h2 className="text-xl font-bold mb-2 text-danger">Connection Failed</h2>
            <p className="text-sm mb-6">{error}</p>
            <button className="btn btn-secondary w-full" onClick={() => navigate('/mail')}>
              Go Back
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default MailCallback
