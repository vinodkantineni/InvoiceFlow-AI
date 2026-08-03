import React from 'react'
import { Folder, Plus, FileText, Settings, Upload } from 'lucide-react'

const FolderVisualizer = ({ folders, activeFolder, setActiveFolder }) => {
  return (
    <div className="glass-card" style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
        <h3 style={{ fontWeight: '600', fontSize: '1rem' }}>Folders</h3>
        <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <Plus size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto' }}>
        <FolderItem 
          name="All Folders" 
          icon={<Folder size={16} fill="var(--primary-light)" color="var(--primary-light)" />} 
          isActive={activeFolder === 'all'} 
          onClick={() => setActiveFolder('all')} 
          isRoot={true}
        />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {folders.map(folder => (
            <FolderItem 
              key={folder.id} 
              name={folder.name} 
              isActive={activeFolder === folder.id} 
              onClick={() => setActiveFolder(folder.id)} 
              count={folder.count}
              isChild={true}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

const FolderItem = ({ name, icon, isActive, onClick, count, isRoot, isChild }) => (
  <button 
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: isChild ? '8px 12px 8px 36px' : '8px 12px',
      borderRadius: '8px',
      background: isActive ? 'rgba(124, 58, 237, 0.1)' : 'transparent',
      border: 'none',
      color: isActive ? 'var(--primary-light)' : 'var(--text-secondary)',
      cursor: 'pointer',
      width: '100%',
      textAlign: 'left',
      transition: 'all var(--transition-fast)',
      position: 'relative'
    }}
    onMouseEnter={(e) => {
      if (!isActive) {
        e.currentTarget.style.background = 'var(--surface-2-color)'
        e.currentTarget.style.color = 'var(--text-primary)'
      }
    }}
    onMouseLeave={(e) => {
      if (!isActive) {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = 'var(--text-secondary)'
      }
    }}
  >
    {isChild && (
      <span style={{ position: 'absolute', left: '16px', color: 'var(--border-color)', fontSize: '1rem', top: '6px' }}>
        ↳
      </span>
    )}
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {icon}
      <span style={{ fontSize: '0.875rem', fontWeight: isActive ? '500' : '400' }}>{name}</span>
    </div>
    {count !== undefined && (
      <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: 'var(--surface-color)', border: '1px solid var(--border-color)' }}>
        {count}
      </span>
    )}
  </button>
)

export default FolderVisualizer
