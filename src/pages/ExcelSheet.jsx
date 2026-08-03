import React, { useState, useEffect } from 'react'
import { FileText, Search, Filter } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import EditableInvoiceGrid from '../components/EditableInvoiceGrid'

const ExcelSheet = () => {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchData()
  }, [user])

  const fetchData = async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (data) setInvoices(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleInvoiceUpdate = (updatedInvoice, isDeleted = false) => {
    if (isDeleted) {
      setInvoices(prev => prev.filter(i => i.id !== updatedInvoice.id))
    } else if (updatedInvoice) {
      setInvoices(prev => prev.map(i => i.id === updatedInvoice.id ? updatedInvoice : i))
    }
  }

  const filteredInvoices = invoices.filter(inv => {
    const searchString = `${inv.extracted_data?.vendor || ''} ${inv.extracted_data?.invoiceNumber || ''}`.toLowerCase()
    return searchString.includes(search.toLowerCase())
  })

  return (
    <div className="animate-fade-in flex h-full flex-col">
      <div className="glass-card flex-1 flex flex-col" style={{ overflow: 'hidden' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
          <div>
            <h1 className="text-xl font-bold">Excel Data Sheet</h1>
            <p className="text-muted text-sm">Directly manage all your invoice data in a spreadsheet view.</p>
          </div>
          
          <div className="flex gap-4">
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                className="form-input" 
                style={{ paddingLeft: '36px', width: '250px' }} 
                placeholder="Search vendor or invoice #..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="btn btn-secondary">
              <Filter size={16} /> Filters
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <div className="skeleton" style={{ height: '300px' }}></div>
          ) : (
            <EditableInvoiceGrid 
              invoices={filteredInvoices} 
              onUpdate={(updated) => handleInvoiceUpdate(updated)}
              onDelete={(id) => handleInvoiceUpdate({ id }, true)}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default ExcelSheet
