import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, FileText, UploadCloud, Mail, BarChart2, Settings, ChevronLeft, ChevronRight, Table } from 'lucide-react'

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Upload', path: '/upload', icon: UploadCloud },
    { name: 'Mail Connect', path: '/mail', icon: Mail },
    { name: 'Invoices', path: '/invoices', icon: FileText },
    { name: 'Excel Sheet', path: '/excel', icon: Table },
    { name: 'Analytics', path: '/analytics', icon: BarChart2 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ]

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`} style={{ position: 'relative' }}>
      <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-color)', height: '64px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-color)', flexShrink: 0 }}>
          <span style={{ fontWeight: 'bold', color: 'white', fontSize: '14px' }}>IF</span>
        </div>
        {!isCollapsed && <span style={{ fontWeight: 'bold', fontSize: '1.1rem', fontFamily: 'var(--font-heading)' }}>InvoiceFlow AI</span>}
      </div>

      <nav style={{ padding: '16px 12px', flex: 1 }}>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  color: 'var(--text-secondary)',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <item.icon size={20} style={{ flexShrink: 0 }} />
                {!isCollapsed && <span>{item.name}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{
          position: 'absolute',
          right: '-12px',
          top: '20px',
          background: 'var(--surface-2-color)',
          border: '1px solid var(--border-color)',
          borderRadius: '50%',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          zIndex: 10,
        }}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <style>{`
        .nav-link:hover {
          background: var(--surface-2-color);
          color: var(--text-primary) !important;
        }
        .nav-link.active {
          background: rgba(124, 58, 237, 0.1);
          color: var(--primary-light) !important;
        }
      `}</style>
    </aside>
  )
}

export default Sidebar
