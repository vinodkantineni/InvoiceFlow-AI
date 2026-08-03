import React, { useState, useEffect } from 'react'
import { FileText, Download } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import FolderVisualizer from '../components/FolderVisualizer'

const Invoices = () => {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [folders, setFolders] = useState([])
  const [activeFolder, setActiveFolder] = useState('all')
  const [loading, setLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  
  // Right Pane State
  const [activeTab, setActiveTab] = useState('preview') // 'preview' | 'data'
  const [fileUrl, setFileUrl] = useState(null)
  const [fileLoading, setFileLoading] = useState(false)
  const [fileError, setFileError] = useState(null)

  useEffect(() => {
    fetchData()
  }, [user])

  const fetchData = async () => {
    if (!user) return
    setLoading(true)
    try {
      const [invRes, foldRes] = await Promise.all([
        supabase.from('invoices').select('*').order('created_at', { ascending: false }),
        supabase.from('folders').select('*').order('name')
      ])
      
      if (invRes.data) setInvoices(invRes.data)
      
      const foldersWithCounts = (foldRes.data || []).map(f => ({
        ...f,
        count: invRes.data ? invRes.data.filter(i => i.folder === f.name).length : 0
      }))
      setFolders(foldersWithCounts)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch secure signed URL when an invoice is selected
  useEffect(() => {
    const fetchFileUrl = async () => {
      setFileError(null)
      if (!selectedInvoice || !selectedInvoice.file_path) {
        setFileUrl(null)
        if (selectedInvoice && !selectedInvoice.file_path) {
           setFileError("This invoice does not have an attached file path (it may have been added manually).")
        }
        return
      }
      
      setFileLoading(true)
      try {
        const { data, error } = await supabase.storage
          .from('invoices')
          .createSignedUrl(selectedInvoice.file_path, 3600) // 1 hour expiry
        
        if (error) throw error
        setFileUrl(data.signedUrl)
      } catch (err) {
        console.error('Error fetching file URL:', err)
        setFileError(err.message || 'Failed to fetch the file from Supabase Storage.')
        setFileUrl(null)
      } finally {
        setFileLoading(false)
      }
    }

    fetchFileUrl()
  }, [selectedInvoice])

  const filteredInvoices = invoices.filter(inv => {
    return activeFolder === 'all' || inv.folder === folders.find(f => f.id === activeFolder)?.name
  })

  return (
    <div className="animate-fade-in flex h-full" style={{ gap: '24px' }}>
      
      {/* Pane 1: Folders Sidebar (Green Box from screenshot) */}
      <div style={{ width: '240px', flexShrink: 0, height: '100%', overflowY: 'auto' }}>
        <FolderVisualizer 
          folders={folders} 
          activeFolder={activeFolder} 
          setActiveFolder={setActiveFolder} 
        />
      </div>

      {/* Pane 2: File List (Purple Box from screenshot) */}
      <div className="glass-panel flex flex-col" style={{ width: '350px', flexShrink: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
          <h2 className="text-lg font-bold">Files</h2>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '20px' }}>Loading...</div>
          ) : filteredInvoices.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filteredInvoices.map((inv) => (
                <button 
                  key={inv.id} 
                  style={{ 
                    borderBottom: '1px solid var(--border-color)', 
                    cursor: 'pointer', 
                    background: selectedInvoice?.id === inv.id ? 'var(--surface-2-color)' : 'transparent',
                    transition: 'background var(--transition-fast)',
                    padding: '16px',
                    textAlign: 'left',
                    borderLeft: 'none',
                    borderRight: 'none',
                    borderTop: 'none',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                  onMouseEnter={(e) => { if (selectedInvoice?.id !== inv.id) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                  onMouseLeave={(e) => { if (selectedInvoice?.id !== inv.id) e.currentTarget.style.background = 'transparent' }}
                  onClick={() => setSelectedInvoice(inv)}
                >
                  <FileText size={16} color="var(--primary-light)" style={{ flexShrink: 0 }} />
                  <span style={{ fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {inv.file_name || 'Unnamed File'}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
              <FileText size={32} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
              <p>No invoices found</p>
            </div>
          )}
        </div>
      </div>

      {/* Pane 3: Preview & JSON Details (Orange/Yellow/Blue Box from screenshot) */}
      <div className="glass-panel flex-1 flex flex-col" style={{ overflow: 'hidden' }}>
        {selectedInvoice ? (
          <>
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--surface-color)' }}>
              <button 
                onClick={() => setActiveTab('preview')}
                style={{ 
                  flex: 1, 
                  padding: '16px', 
                  background: activeTab === 'preview' ? 'var(--surface-2-color)' : 'transparent',
                  border: 'none',
                  borderRight: '1px solid var(--border-color)',
                  color: activeTab === 'preview' ? 'var(--primary-light)' : 'var(--text-secondary)',
                  fontWeight: activeTab === 'preview' ? '600' : '400',
                  cursor: 'pointer',
                  borderBottom: activeTab === 'preview' ? '2px solid var(--primary-light)' : '2px solid transparent'
                }}
              >
                Preview
              </button>
              <button 
                onClick={() => setActiveTab('data')}
                style={{ 
                  flex: 1, 
                  padding: '16px', 
                  background: activeTab === 'data' ? 'var(--surface-2-color)' : 'transparent',
                  border: 'none',
                  color: activeTab === 'data' ? 'var(--accent-color)' : 'var(--text-secondary)',
                  fontWeight: activeTab === 'data' ? '600' : '400',
                  cursor: 'pointer',
                  borderBottom: activeTab === 'data' ? '2px solid var(--accent-color)' : '2px solid transparent'
                }}
              >
                Data
              </button>
            </div>
            
            {/* Content Area */}
            <div style={{ flex: 1, overflowY: 'auto', background: '#000', padding: activeTab === 'data' ? '24px' : '0' }}>
              {activeTab === 'preview' ? (
                fileLoading ? (
                  <div className="flex h-full items-center justify-center text-muted">Loading secure preview...</div>
                ) : fileUrl ? (
                  <iframe 
                    src={fileUrl} 
                    title="Invoice Preview"
                    style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#fff' }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center flex-col text-muted gap-4 text-center px-8">
                    <FileText size={48} style={{ opacity: 0.2 }} />
                    <p>No preview available for this invoice.</p>
                    {fileError && (
                      <p className="text-danger text-sm bg-danger/10 p-4 rounded-md border border-danger/20 w-full max-w-md">
                        <strong>Error:</strong> {fileError}
                        <br/><br/>
                        <span className="text-xs opacity-80">Make sure you have created the "invoices" storage bucket in your Supabase project and configured its public policies.</span>
                      </p>
                    )}
                  </div>
                )
              ) : (
                <div style={{ background: '#1e1e1e', borderRadius: '8px', padding: '16px', border: '1px solid #333' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #333', paddingBottom: '12px' }}>
                    <span style={{ color: '#9cdcfe' }}>Extracted Data</span>
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '14px', color: '#ce9178', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedInvoice.extracted_data ? (
                      Object.entries(selectedInvoice.extracted_data).map(([label, value]) => (
                        <div key={label}>
                          <span style={{ color: '#4fc1ff' }}>{label}</span> = {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </div>
                      ))
                    ) : (
                      <div>No data extracted.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-muted flex-col gap-4">
            <FileText size={48} style={{ opacity: 0.2 }} />
            <p>Select an invoice from the list to view its details</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Invoices
