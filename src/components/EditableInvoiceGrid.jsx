import React, { useState } from 'react'
import { Plus, Trash2, CheckCircle2, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

const EditableInvoiceGrid = ({ invoices, onUpdate, onDelete }) => {
  const { user } = useAuth()
  const [editingCell, setEditingCell] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleCellClick = (invoiceId, field, currentValue) => {
    setEditingCell({ id: invoiceId, field })
    setEditValue(currentValue || '')
  }

  const saveCell = async (invoice, field) => {
    if (!editingCell) return

    // Don't save if value hasn't changed
    const currentValue = invoice.extracted_data?.[field] || ''
    if (currentValue === editValue && field !== 'status') {
      setEditingCell(null)
      return
    }

    let updates = {}
    if (field === 'status') {
      updates = { status: editValue }
    } else {
      updates = { 
        extracted_data: { 
          ...invoice.extracted_data, 
          [field]: editValue 
        } 
      }
    }

    const { error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', invoice.id)

    if (!error) {
      onUpdate({ ...invoice, ...updates })
    }
    setEditingCell(null)
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this invoice?')) return
    
    const { error } = await supabase.from('invoices').delete().eq('id', id)
    if (!error) onDelete(id)
  }

  const handleAddRow = async () => {
    setIsAdding(true)
    const newInvoice = {
      user_id: user.id,
      file_name: 'Manual Entry',
      source: 'manual',
      status: 'pending',
      extracted_data: {
        vendor: 'New Vendor',
        invoiceNumber: '',
        date: new Date().toISOString().split('T')[0],
        total: '0.00'
      }
    }

    const { data, error } = await supabase.from('invoices').insert(newInvoice).select()
    if (!error && data) {
      onUpdate(data[0])
    }
    setIsAdding(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--surface-color)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead style={{ position: 'sticky', top: 0, background: 'var(--surface-2-color)', zIndex: 10 }}>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '12px 16px', fontWeight: '500', width: '25%' }}>Vendor</th>
              <th style={{ padding: '12px 16px', fontWeight: '500', width: '20%' }}>Invoice #</th>
              <th style={{ padding: '12px 16px', fontWeight: '500', width: '20%' }}>Date</th>
              <th style={{ padding: '12px 16px', fontWeight: '500', width: '15%' }}>Amount</th>
              <th style={{ padding: '12px 16px', fontWeight: '500', width: '15%' }}>Status</th>
              <th style={{ padding: '12px 16px', width: '50px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr 
                key={inv.id} 
                style={{ borderBottom: '1px solid var(--border-color)', transition: 'background var(--transition-fast)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2-color)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                {/* Vendor Cell */}
                <td 
                  style={{ padding: '0', borderRight: '1px solid var(--border-color)' }}
                  onClick={() => handleCellClick(inv.id, 'vendor', inv.extracted_data?.vendor)}
                >
                  {editingCell?.id === inv.id && editingCell?.field === 'vendor' ? (
                    <input 
                      autoFocus
                      type="text"
                      className="form-input"
                      style={{ border: 'none', borderRadius: '0', height: '100%', padding: '16px' }}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => saveCell(inv, 'vendor')}
                      onKeyDown={(e) => e.key === 'Enter' && saveCell(inv, 'vendor')}
                    />
                  ) : (
                    <div style={{ padding: '16px', cursor: 'cell' }}>{inv.extracted_data?.vendor || 'Unknown Vendor'}</div>
                  )}
                </td>

                {/* Invoice Number Cell */}
                <td 
                  style={{ padding: '0', borderRight: '1px solid var(--border-color)' }}
                  onClick={() => handleCellClick(inv.id, 'invoiceNumber', inv.extracted_data?.invoiceNumber)}
                >
                  {editingCell?.id === inv.id && editingCell?.field === 'invoiceNumber' ? (
                    <input 
                      autoFocus
                      type="text"
                      className="form-input"
                      style={{ border: 'none', borderRadius: '0', height: '100%', padding: '16px' }}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => saveCell(inv, 'invoiceNumber')}
                      onKeyDown={(e) => e.key === 'Enter' && saveCell(inv, 'invoiceNumber')}
                    />
                  ) : (
                    <div style={{ padding: '16px', cursor: 'cell', color: 'var(--text-secondary)' }}>{inv.extracted_data?.invoiceNumber || '-'}</div>
                  )}
                </td>

                {/* Date Cell */}
                <td 
                  style={{ padding: '0', borderRight: '1px solid var(--border-color)' }}
                  onClick={() => handleCellClick(inv.id, 'date', inv.extracted_data?.date)}
                >
                  {editingCell?.id === inv.id && editingCell?.field === 'date' ? (
                    <input 
                      autoFocus
                      type="date"
                      className="form-input"
                      style={{ border: 'none', borderRadius: '0', height: '100%', padding: '16px' }}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => saveCell(inv, 'date')}
                      onKeyDown={(e) => e.key === 'Enter' && saveCell(inv, 'date')}
                    />
                  ) : (
                    <div style={{ padding: '16px', cursor: 'cell', color: 'var(--text-secondary)' }}>{inv.extracted_data?.date || new Date(inv.created_at).toLocaleDateString()}</div>
                  )}
                </td>

                {/* Amount Cell */}
                <td 
                  style={{ padding: '0', borderRight: '1px solid var(--border-color)' }}
                  onClick={() => handleCellClick(inv.id, 'total', inv.extracted_data?.total)}
                >
                  {editingCell?.id === inv.id && editingCell?.field === 'total' ? (
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-2-color)' }}>
                      <span style={{ paddingLeft: '16px', color: 'var(--text-secondary)' }}>$</span>
                      <input 
                        autoFocus
                        type="number"
                        step="0.01"
                        className="form-input"
                        style={{ border: 'none', borderRadius: '0', height: '100%', padding: '16px 16px 16px 4px' }}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => saveCell(inv, 'total')}
                        onKeyDown={(e) => e.key === 'Enter' && saveCell(inv, 'total')}
                      />
                    </div>
                  ) : (
                    <div style={{ padding: '16px', cursor: 'cell', fontWeight: '500' }}>${inv.extracted_data?.total || '0.00'}</div>
                  )}
                </td>

                {/* Status Cell */}
                <td 
                  style={{ padding: '0', borderRight: '1px solid var(--border-color)' }}
                  onClick={() => handleCellClick(inv.id, 'status', inv.status)}
                >
                  {editingCell?.id === inv.id && editingCell?.field === 'status' ? (
                    <select 
                      autoFocus
                      className="form-select"
                      style={{ border: 'none', borderRadius: '0', height: '100%', padding: '16px' }}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => {
                        saveCell(inv, 'status')
                      }}
                    >
                      <option value="pending">pending</option>
                      <option value="reviewed">reviewed</option>
                      <option value="paid">paid</option>
                      <option value="overdue">overdue</option>
                    </select>
                  ) : (
                    <div style={{ padding: '16px', cursor: 'cell' }}>
                      <span className={`badge badge-${inv.status === 'paid' ? 'success' : inv.status === 'pending' ? 'warning' : inv.status === 'overdue' ? 'danger' : 'primary'}`}>
                        {inv.status}
                      </span>
                    </div>
                  )}
                </td>

                {/* Action Cell */}
                <td style={{ padding: '16px', textAlign: 'center' }}>
                  <button 
                    onClick={(e) => handleDelete(e, inv.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'color var(--transition-fast)' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger-color)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                    title="Delete Row"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {invoices.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            No data. Click "Add Manual Entry" below.
          </div>
        )}
      </div>

      <div style={{ padding: '16px 0', display: 'flex', justifyContent: 'center' }}>
        <button 
          className="btn btn-secondary" 
          onClick={handleAddRow}
          disabled={isAdding}
        >
          <Plus size={16} /> {isAdding ? 'Adding...' : 'Add Manual Entry'}
        </button>
      </div>
    </div>
  )
}

export default EditableInvoiceGrid
