import React, { useState, useRef, useEffect } from 'react'
import { UploadCloud, File, CheckCircle2, X, AlertCircle, Loader2, Mail } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { extractTextFromPDF, fileToBase64 } from '../utils/pdfExtractor'
import { extractInvoiceDataWithGemini } from '../utils/geminiApi'

const Upload = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState([])
  const [settings, setSettings] = useState(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) return
      const { data } = await supabase.from('settings').select('*').eq('user_id', user.id).single()
      if (data) setSettings(data)
    }
    fetchSettings()
  }, [user])

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFiles(Array.from(e.dataTransfer.files))
    }
  }

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFiles(Array.from(e.target.files))
    }
  }

  const processSelectedFiles = (selectedFiles) => {
    const validFiles = selectedFiles.filter(file => {
      const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
      return validTypes.includes(file.type)
    })
    
    const newFiles = validFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      status: 'pending', // pending, processing, success, error
      progress: 0,
      error: null
    }))
    
    setFiles(prev => [...prev, ...newFiles])
    
    // Auto start processing if settings allow, otherwise start immediately here for demo
    newFiles.forEach(f => processFile(f))
  }

  const processFile = async (fileObj) => {
    updateFileStatus(fileObj.id, { status: 'processing', progress: 10 })
    
    try {
      if (!settings?.gemini_api_key_encrypted) {
        throw new Error('Gemini API key is not configured. Please add it in Settings.')
      }
      
      const file = fileObj.file
      let extractedData = null
      
      // 1. Text Extraction / Base64 conversion
      updateFileStatus(fileObj.id, { progress: 30 })
      // Send both PDFs and Images directly to Gemini as base64 to leverage its native OCR capabilities
      const base64 = await fileToBase64(file)
      updateFileStatus(fileObj.id, { progress: 50 })
      extractedData = await extractInvoiceDataWithGemini(base64, settings.gemini_api_key_encrypted, settings.gemini_model, true, file.type)
      
      updateFileStatus(fileObj.id, { progress: 70 })

      // 2. Upload original file to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${user.id}/${fileName}`
      
      const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(filePath, file)
        
      if (uploadError) {
        console.error('Failed to upload file to storage:', uploadError)
        throw new Error(`Storage upload failed: ${uploadError.message}`)
      }
      
      updateFileStatus(fileObj.id, { progress: 90 })

      // 3. Save to DB
      const { data, error: dbError } = await supabase
        .from('invoices')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          source: 'upload',
          extracted_data: extractedData,
          confidence: extractedData.confidence,
          status: (extractedData.confidence?.overall || 0) < (settings.confidence_threshold || 70) ? 'pending' : 'reviewed'
        })
        .select()
        
      if (dbError) throw dbError
      
      updateFileStatus(fileObj.id, { status: 'success', progress: 100, dbId: data[0].id })
      
    } catch (err) {
      console.error(err)
      updateFileStatus(fileObj.id, { status: 'error', progress: 0, error: err.message })
    }
  }

  const updateFileStatus = (id, updates) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f))
  }

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const handleMailSync = async () => {
    setIsSyncing(true)
    setSyncMessage(null)
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const response = await fetch(`${API_URL}/api/sync-mail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session.access_token}`
        },
        body: JSON.stringify({ userId: user.id })
      })
      
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to sync emails.')
      
      setSyncMessage({ type: 'success', text: result.message })
    } catch (err) {
      setSyncMessage({ type: 'error', text: err.message })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="text-2xl font-bold">Upload Invoices</h1>
          <p className="text-muted">Drag and drop PDFs or images to extract data using AI.</p>
        </div>
      </div>

      {!settings?.gemini_api_key_encrypted && (
        <div className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', marginBottom: '24px' }}>
          <AlertCircle size={16} />
          <span>You need to configure your Gemini API Key in <a href="/settings" style={{ textDecoration: 'underline', color: 'inherit' }}>Settings</a> before uploading.</span>
        </div>
      )}

      {syncMessage && (
        <div className={`badge badge-${syncMessage.type === 'success' ? 'success' : 'danger'}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', marginBottom: '24px' }}>
          {syncMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{syncMessage.text}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <div 
          className={`glass-card ${isDragging ? 'dragging' : ''}`}
          style={{ 
            padding: '60px 40px', 
            textAlign: 'center', 
            borderStyle: 'dashed',
            borderColor: isDragging ? 'var(--primary-color)' : 'var(--border-color)',
            background: isDragging ? 'rgba(124, 58, 237, 0.05)' : 'var(--surface-color)',
            transition: 'all var(--transition-fast)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            multiple 
            accept="application/pdf,image/png,image/jpeg,image/webp" 
            onChange={handleFileSelect} 
          />
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(124, 58, 237, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <UploadCloud size={32} color="var(--primary-light)" />
          </div>
          <h3 className="text-xl font-bold mb-2">Click to upload or drag and drop</h3>
          <p className="text-muted text-sm mb-6">PDF, PNG, JPG or WEBP (max. 10MB per file)</p>
          <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
            Select Files
          </button>
        </div>

        {/* Mail Sync Panel */}
        <div 
          className="glass-card" 
          style={{ 
            padding: '60px 40px', 
            textAlign: 'center', 
            borderStyle: 'dashed',
            borderColor: 'var(--border-color)',
            background: 'var(--surface-color)',
            transition: 'all var(--transition-fast)',
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center' 
          }}
        >
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(6, 182, 212, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <Mail size={32} color="var(--accent-color)" />
          </div>
          <h3 className="text-xl font-bold mb-2">Analyze Mail Invoices</h3>
          <p className="text-muted text-sm mb-6">Click here to automatically fetch and analyze the latest invoices directly from your connected Gmail inbox.</p>
          <button 
            className="btn btn-primary"
            onClick={handleMailSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Scanning Inbox...
              </span>
            ) : 'Analyze Mail'}
          </button>
        </div>
      </div>

      {files.length > 0 && (
        <div className="glass-card">
          <h3 className="font-semibold mb-4">Upload Queue ({files.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {files.map(fileObj => (
              <div key={fileObj.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'var(--surface-2-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <File size={24} color="var(--text-secondary)" />
                <div style={{ flex: 1 }}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-sm">{fileObj.file.name}</span>
                    <span className="text-xs text-muted">{(fileObj.file.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                  
                  {fileObj.status === 'error' ? (
                    <p className="text-xs text-danger">{fileObj.error}</p>
                  ) : fileObj.status === 'success' ? (
                    <p className="text-xs text-success flex items-center gap-1"><CheckCircle2 size={12} /> Extraction complete</p>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '4px', background: 'var(--bg-color)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${fileObj.progress}%`, background: 'var(--primary-color)', transition: 'width 300ms ease' }}></div>
                      </div>
                      <span className="text-xs text-muted">{fileObj.progress}%</span>
                    </div>
                  )}
                </div>
                
                {fileObj.status === 'processing' ? (
                  <Loader2 size={18} className="animate-spin text-muted" style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <button onClick={() => removeFile(fileObj.id)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default Upload
