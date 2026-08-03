import React, { useState } from 'react'
import { Bell, Search, LogOut, User, Settings as SettingsIcon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const Header = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showNotificationMenu, setShowNotificationMenu] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input 
            type="text" 
            placeholder="Search invoices, vendors..." 
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              background: 'var(--surface-2-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: '0.875rem'
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => {
              setShowNotificationMenu(!showNotificationMenu)
              setShowProfileMenu(false)
            }}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', position: 'relative', display: 'flex' }}
          >
            <Bell size={20} />
            <span style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', background: 'var(--danger-color)', borderRadius: '50%' }}></span>
          </button>
          
          {showNotificationMenu && (
            <div className="glass-panel" style={{
              position: 'absolute', top: 'calc(100% + 12px)', right: '-60px', width: '300px', padding: '16px', zIndex: 50,
              boxShadow: 'var(--shadow-lg)'
            }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.875rem' }}>Notifications</h4>
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                No new notifications
              </div>
            </div>
          )}
        </div>

        <div style={{ height: '24px', width: '1px', background: 'var(--border-color)' }}></div>

        {/* Profile */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => {
              setShowProfileMenu(!showProfileMenu)
              setShowNotificationMenu(false)
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'inherit' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{user?.user_metadata?.display_name || 'Vinod Kumar'}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pro Plan</span>
            </div>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={18} color="white" />
            </div>
          </button>

          {showProfileMenu && (
            <div className="glass-panel" style={{
              position: 'absolute', top: 'calc(100% + 12px)', right: '0', width: '220px', padding: '8px', zIndex: 50,
              boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', gap: '4px'
            }}>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', marginBottom: '4px' }}>
                <div style={{ fontWeight: '500' }}>{user?.email}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--primary-light)' }}>Pro Plan Member</div>
              </div>
              
              <button onClick={() => navigate('/settings')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '6px', width: '100%', textAlign: 'left' }} onMouseEnter={(e) => e.currentTarget.style.background='var(--surface-2-color)'} onMouseLeave={(e) => e.currentTarget.style.background='transparent'}>
                <SettingsIcon size={16} /> Account Settings
              </button>
              
              <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', borderRadius: '6px', width: '100%', textAlign: 'left' }} onMouseEnter={(e) => e.currentTarget.style.background='rgba(239, 68, 68, 0.1)'} onMouseLeave={(e) => e.currentTarget.style.background='transparent'}>
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
