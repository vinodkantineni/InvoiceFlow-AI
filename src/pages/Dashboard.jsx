import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FileText, DollarSign, Clock, AlertCircle, TrendingUp, Upload } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

const Dashboard = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState({ totalCount: 0, totalAmount: 0, pending: 0, overdue: 0 })
  const [recentInvoices, setRecentInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  // Dummy chart data for UI
  const chartData = [
    { name: 'Jan', amount: 4000 },
    { name: 'Feb', amount: 3000 },
    { name: 'Mar', amount: 2000 },
    { name: 'Apr', amount: 2780 },
    { name: 'May', amount: 1890 },
    { name: 'Jun', amount: 2390 },
    { name: 'Jul', amount: 3490 },
  ]

  const pieData = [
    { name: 'Approved', value: 400 },
    { name: 'Pending', value: 300 },
    { name: 'Paid', value: 300 },
    { name: 'Overdue', value: 200 },
  ]
  const COLORS = ['var(--success-color)', 'var(--warning-color)', 'var(--primary-color)', 'var(--danger-color)']

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true)
      try {
        if (!user) return

        // Wait, for demo we might need to seed if empty.
        // Let's just fetch recent for now
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .order('created_at', { ascending: false })
        if (data) {
          setRecentInvoices(data.slice(0, 5)) // only show 5 in the table
          
          setStats({
            totalCount: data.length,
            totalAmount: data.reduce((acc, inv) => {
              const total = parseFloat(inv.extracted_data?.total || 0)
              return acc + (isNaN(total) ? 0 : total)
            }, 0),
            pending: data.filter(i => i.status === 'pending').length,
            overdue: data.filter(i => i.status === 'overdue').length
          })
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [user])

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted">Welcome back, {user?.user_metadata?.display_name || 'User'}</p>
        </div>
        <Link to="/upload" className="btn btn-primary">
          <Upload size={16} />
          <span>Upload Invoice</span>
        </Link>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <StatCard title="Total Invoices" value={stats.totalCount} icon={FileText} color="var(--primary-light)" bg="rgba(124, 58, 237, 0.1)" />
        <StatCard title="Total Amount" value={`$${stats.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={DollarSign} color="var(--success-color)" bg="rgba(16, 185, 129, 0.1)" />
        <StatCard title="Pending Review" value={stats.pending} icon={Clock} color="var(--warning-color)" bg="rgba(245, 158, 11, 0.1)" />
        <StatCard title="Overdue" value={stats.overdue} icon={AlertCircle} color="var(--danger-color)" bg="rgba(239, 68, 68, 0.1)" />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '32px' }}>
        <div className="glass-card">
          <h3 style={{ marginBottom: '16px', fontWeight: '600' }}>Spending Overview</h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--primary-color)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--surface-color)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
                <Area type="monotone" dataKey="amount" stroke="var(--primary-color)" strokeWidth={2} fillOpacity={1} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card">
          <h3 style={{ marginBottom: '16px', fontWeight: '600' }}>Status Distribution</h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--surface-color)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="glass-card">
        <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontWeight: '600' }}>Recent Invoices</h3>
          <Link to="/invoices" style={{ fontSize: '0.875rem' }}>View All</Link>
        </div>
        
        {loading ? (
          <div className="skeleton" style={{ height: '200px' }}></div>
        ) : recentInvoices.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  <th style={{ padding: '12px 8px', fontWeight: '500' }}>Vendor</th>
                  <th style={{ padding: '12px 8px', fontWeight: '500' }}>Amount</th>
                  <th style={{ padding: '12px 8px', fontWeight: '500' }}>Date</th>
                  <th style={{ padding: '12px 8px', fontWeight: '500' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 8px' }}>{inv.extracted_data?.vendor || 'Unknown Vendor'}</td>
                    <td style={{ padding: '12px 8px' }}>${inv.extracted_data?.total || '0.00'}</td>
                    <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{inv.extracted_data?.date || new Date(inv.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <span className={`badge badge-${inv.status === 'paid' ? 'success' : inv.status === 'pending' ? 'warning' : inv.status === 'overdue' ? 'danger' : 'primary'}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
            <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
            <p>No invoices found. Upload one to get started.</p>
          </div>
        )}
      </div>
    </div>
  )
}

const StatCard = ({ title, value, icon: Icon, trend, color, bg }) => (
  <div className="glass-card flex items-center justify-between">
    <div>
      <p className="text-sm text-muted mb-1">{title}</p>
      <h2 className="text-2xl font-bold">{value}</h2>
      {trend && (
        <p style={{ fontSize: '0.75rem', color: 'var(--success-color)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <TrendingUp size={12} /> {trend} this month
        </p>
      )}
    </div>
    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={24} color={color} />
    </div>
  </div>
)

export default Dashboard
