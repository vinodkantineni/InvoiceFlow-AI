import React, { useState } from 'react'
import { X, Download, Trash2, Edit2, Save, FileText, CheckCircle2, AlertCircle, Copy } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

const InvoiceDetailDrawer = ({ invoice, isOpen, onClose, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState(invoice?.extracted_data || {})
  const [loading, setLoading] = useState(false)

  // Update formData when invoice changes
  React.useEffect(() => {
    if (invoice) {
      setFormData(invoice.extracted_data || {})
      setIsEditing(false)
    }
  }, [invoice])

  if (!isOpen) return null

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('invoices')
        .update({ 
          extracted_data: formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoice.id)
        .select()
        
      if (error) throw error
      setIsEditing(false)
      if (onUpdate) onUpdate(data[0])
    } catch (err) {
      console.error('Error saving invoice:', err)
      // Ideally show a toast here
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return
    try {
      const { error } = await supabase.from('invoices').delete().eq('id', invoice.id)
      if (error) throw error
      if (onUpdate) onUpdate(null, true) // deleted
      onClose()
    } catch (err) {
      console.error('Error deleting invoice:', err)
    }
  }

  const getConfidenceColor = (score) => {
    if (!score) return 'var(--text-secondary)'
    if (score >= 90) return 'var(--success-color)'
    if (score >= 70) return 'var(--warning-color)'
    return 'var(--danger-color)'
  }

  const overallConfidence = invoice?.confidence?.overall || 0

  return (
    <>
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 40,
          animation: 'fadeIn var(--transition-fast)'
        }}
        onClick={onClose}
      />
      <div 
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: '600px',
          background: 'var(--surface-color)',
          borderLeft: '1px solid var(--border-color)',
          zIndex: 50,
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 300ms cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <div className="flex items-center justify-between" style={{ padding: '24px', borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <h2 className="text-xl font-bold" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              Invoice {formData.invoiceNumber || invoice?.id?.substring(0, 8)}
              <span className={`badge badge-${invoice?.status === 'paid' ? 'success' : invoice?.status === 'pending' ? 'warning' : invoice?.status === 'overdue' ? 'danger' : 'primary'}`}>
                {invoice?.status}
              </span>
            </h2>
            <p className="text-sm text-muted mt-1">{invoice?.file_name}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" style={{ padding: '8px' }} onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
            <div className="glass-card" style={{ flex: 1, padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: `4px solid ${getConfidenceColor(overallConfidence)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>{overallConfidence}%</span>
              </div>
              <div>
                <p className="text-sm font-semibold">AI Confidence</p>
                <p className="text-xs text-muted">Overall extraction accuracy</p>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ marginBottom: '24px' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
              <h3 className="font-semibold">Invoice Details</h3>
              {!isEditing ? (
                <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => setIsEditing(true)}>
                  <Edit2 size={14} style={{ marginRight: '4px' }} /> Edit
                </button>
              ) : (
                <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={handleSave} disabled={loading}>
                  <Save size={14} style={{ marginRight: '4px' }} /> {loading ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Field label="Vendor" value={formData.vendor} isEditing={isEditing} onChange={(v) => handleChange('vendor', v)} confidence={invoice?.confidence?.vendor} />
              <Field label="Invoice Number" value={formData.invoiceNumber} isEditing={isEditing} onChange={(v) => handleChange('invoiceNumber', v)} confidence={invoice?.confidence?.invoiceNumber} />
              <Field label="Date" value={formData.date} isEditing={isEditing} onChange={(v) => handleChange('date', v)} type="date" confidence={invoice?.confidence?.date} />
              <Field label="Due Date" value={formData.dueDate} isEditing={isEditing} onChange={(v) => handleChange('dueDate', v)} type="date" confidence={invoice?.confidence?.dueDate} />
              <Field label="Total Amount" value={formData.total} isEditing={isEditing} onChange={(v) => handleChange('total', v)} type="number" confidence={invoice?.confidence?.total} />
              <Field label="Currency" value={formData.currency} isEditing={isEditing} onChange={(v) => handleChange('currency', v)} confidence={invoice?.confidence?.currency} />
            </div>
          </div>
          
          <div className="glass-card">
             <h3 className="font-semibold mb-4">Actions</h3>
             <div className="flex gap-2">
               <button className="btn btn-secondary flex-1">
                 <Download size={16} /> PDF
               </button>
               <button className="btn btn-secondary flex-1">
                 <Download size={16} /> CSV
               </button>
               <button className="btn btn-danger" onClick={handleDelete}>
                 <Trash2 size={16} />
               </button>
             </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  )
}

const Field = ({ label, value, isEditing, onChange, type = 'text', confidence }) => {
  const getDotColor = (score) => {
    if (!score) return 'transparent'
    if (score >= 90) return 'var(--success-color)'
    if (score >= 70) return 'var(--warning-color)'
    return 'var(--danger-color)'
  }

  return (
    <div style={{ marginBottom: '8px' }}>
      <label className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
        {label}
        {confidence && (
          <span 
            style={{ width: '6px', height: '6px', borderRadius: '50%', background: getDotColor(confidence) }} 
            title={`Confidence: ${confidence}%`}
          />
        )}
      </label>
      {isEditing ? (
        <input 
          type={type} 
          className="form-input" 
          style={{ padding: '6px 10px', fontSize: '0.875rem' }} 
          value={value || ''} 
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <p className="text-sm" style={{ padding: '6px 0', borderBottom: '1px solid transparent' }}>
          {value || <span className="text-muted italic">Not found</span>}
        </p>
      )}
    </div>
  )
}

export default InvoiceDetailDrawer
