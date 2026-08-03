import React, { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

const Analytics = () => {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [timeframe, setTimeframe] = useState('ytd') // 'ytd' | 'all'

  useEffect(() => {
    if (user) {
      fetchInvoices()
    }
  }, [user])

  const fetchInvoices = async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: true })

    if (data && !error) {
      setInvoices(data)
    }
    setLoading(false)
  }

  const handleSeedData = async () => {
    if (!user) return
    setSeeding(true)
    try {
      const demoInvoices = [
        { vendor: 'AWS', amount: '450.00', date: '2026-01-15', num: 'INV-1001' },
        { vendor: 'Google Workspace', amount: '120.00', date: '2026-01-20', num: 'INV-1002' },
        { vendor: 'Figma', amount: '45.00', date: '2026-02-05', num: 'INV-1003' },
        { vendor: 'AWS', amount: '480.00', date: '2026-02-15', num: 'INV-1004' },
        { vendor: 'Vercel', amount: '100.00', date: '2026-03-01', num: 'INV-1005' },
        { vendor: 'GitHub', amount: '40.00', date: '2026-03-10', num: 'INV-1006' },
        { vendor: 'AWS', amount: '520.00', date: '2026-03-15', num: 'INV-1007' },
        { vendor: 'Slack', amount: '85.00', date: '2026-04-05', num: 'INV-1008' },
        { vendor: 'Adobe', amount: '55.00', date: '2026-04-12', num: 'INV-1009' },
        { vendor: 'AWS', amount: '490.00', date: '2026-04-15', num: 'INV-1010' },
        { vendor: 'Google Workspace', amount: '120.00', date: '2026-05-20', num: 'INV-1011' },
        { vendor: 'Figma', amount: '45.00', date: '2026-05-25', num: 'INV-1012' },
        { vendor: 'AWS', amount: '550.00', date: '2026-06-15', num: 'INV-1013' },
        { vendor: 'Vercel', amount: '120.00', date: '2026-07-01', num: 'INV-1014' },
      ].map(item => ({
        user_id: user.id,
        file_name: `Demo_Invoice_${item.vendor}.pdf`,
        source: 'manual',
        status: 'paid',
        extracted_data: {
          vendor: item.vendor,
          invoiceNumber: item.num,
          date: item.date,
          total: item.amount
        }
      }))

      const { error } = await supabase.from('invoices').insert(demoInvoices)
      if (!error) {
        await fetchInvoices()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSeeding(false)
    }
  }

  // Helper to parse amount
  const parseAmount = (val) => {
    if (!val) return 0
    if (typeof val === 'number') return val
    return parseFloat(val.toString().replace(/[^0-9.-]+/g, '')) || 0
  }

  // --- Calculations ---
  const currentYear = new Date().getFullYear()
  
  // Filter invoices based on selected timeframe
  const activeInvoices = timeframe === 'ytd' 
    ? invoices.filter(inv => {
        const dateStr = inv.extracted_data?.date || inv.created_at
        return new Date(dateStr).getFullYear() === currentYear
      })
    : invoices

  // 1. Total Spending
  const totalSpend = activeInvoices.reduce((sum, inv) => sum + parseAmount(inv.extracted_data?.total), 0)

  // 2. Average Invoice Value
  const avgInvoiceValue = activeInvoices.length > 0 ? (totalSpend / activeInvoices.length) : 0

  // 3. Vendor Aggregation
  const vendorTotals = {}
  activeInvoices.forEach(inv => {
    const vendor = inv.extracted_data?.vendor || 'Unknown Vendor'
    const amount = parseAmount(inv.extracted_data?.total)
    vendorTotals[vendor] = (vendorTotals[vendor] || 0) + amount
  })

  // Sort vendors by spend
  const sortedVendors = Object.entries(vendorTotals)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)

  const topVendor = sortedVendors.length > 0 ? sortedVendors[0] : { name: 'None', amount: 0 }
  const topVendorPercentage = totalSpend > 0 ? Math.round((topVendor.amount / totalSpend) * 100) : 0
  const top5Vendors = sortedVendors.slice(0, 5)

  // 4. Monthly Trend
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthlyData = monthNames.map(name => ({ name, amount: 0 }))
  
  activeInvoices.forEach(inv => {
    const dateStr = inv.extracted_data?.date || inv.created_at
    const monthIndex = new Date(dateStr).getMonth()
    monthlyData[monthIndex].amount += parseAmount(inv.extracted_data?.total)
  })

  // Determine trend indicators (comparing this month to last month)
  const currentMonth = new Date().getMonth()
  const thisMonthSpend = monthlyData[currentMonth].amount
  const lastMonthSpend = currentMonth > 0 ? monthlyData[currentMonth - 1].amount : 0
  
  let spendChange = 0
  if (lastMonthSpend > 0) {
    spendChange = ((thisMonthSpend - lastMonthSpend) / lastMonthSpend) * 100
  }

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px' }}>
        <div className="skeleton" style={{ height: '200px', marginBottom: '24px' }}></div>
        <div className="skeleton" style={{ height: '400px' }}></div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted">Detailed breakdown of your spending and invoice trends.</p>
        </div>
        <div className="flex gap-4 items-center">
          {invoices.length === 0 && (
            <button 
              className="btn btn-primary" 
              onClick={handleSeedData}
              disabled={seeding}
            >
              {seeding ? 'Generating...' : 'Seed Demo Data'}
            </button>
          )}
          <select className="form-select" style={{ width: 'auto' }} value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
            <option value="ytd">This Year (YTD)</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <div className="glass-card">
          <p className="text-sm text-muted mb-1">Total Spending {timeframe === 'ytd' ? '(YTD)' : '(All Time)'}</p>
          <h2 className="text-3xl font-bold mb-2">${totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
          <div className={`flex items-center gap-2 text-sm ${spendChange <= 0 ? 'text-success' : 'text-danger'}`}>
            {spendChange <= 0 ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
            <span>{Math.abs(spendChange).toFixed(1)}% {spendChange <= 0 ? 'less' : 'more'} than last month</span>
          </div>
        </div>
        
        <div className="glass-card">
          <p className="text-sm text-muted mb-1">Average Invoice Value</p>
          <h2 className="text-3xl font-bold mb-2">${avgInvoiceValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
          <div className="flex items-center gap-2 text-muted text-sm">
            <span>Based on {activeInvoices.length} invoices</span>
          </div>
        </div>
        
        <div className="glass-card">
          <p className="text-sm text-muted mb-1">Top Vendor</p>
          <h2 className="text-3xl font-bold mb-2" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {topVendor.name}
          </h2>
          <div className="flex items-center gap-2 text-muted text-sm">
            <DollarSign size={16} />
            <span>{topVendorPercentage}% of total spend</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        <div className="glass-card">
          <h3 className="font-semibold mb-4">Monthly Spending Trend {timeframe === 'ytd' ? `(${currentYear})` : ''}</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-color)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--accent-color)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--surface-color)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                  formatter={(value) => [`$${value.toFixed(2)}`, 'Spend']}
                />
                <Area type="monotone" dataKey="amount" stroke="var(--accent-color)" strokeWidth={2} fillOpacity={1} fill="url(#colorTrend)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card">
          <h3 className="font-semibold mb-4">Spend by Vendor (Top 5)</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              {top5Vendors.length > 0 ? (
                <BarChart data={top5Vendors} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} width={100} />
                  <Tooltip 
                    cursor={{ fill: 'var(--surface-2-color)' }}
                    contentStyle={{ backgroundColor: 'var(--surface-color)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                    formatter={(value) => [`$${value.toFixed(2)}`, 'Spend']}
                  />
                  <Bar dataKey="amount" fill="var(--primary-light)" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              ) : (
                <div className="flex items-center justify-center h-full text-muted">
                  No vendor data available
                </div>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics
