import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './routes/ProtectedRoute'

// Auth Pages
import Login from './pages/Login'
import Signup from './pages/Signup'
import ResetPassword from './pages/ResetPassword'

import Layout from './components/Layout'

// Protected Pages
import Dashboard from './pages/Dashboard'
import Invoices from './pages/Invoices'
import ExcelSheet from './pages/ExcelSheet'
import Upload from './pages/Upload'
import Settings from './pages/Settings'
import MailConnect from './pages/MailConnect'
import MailCallback from './pages/MailCallback'
import Analytics from './pages/Analytics'
const InvoiceDetail = () => <div>Invoice Detail</div>

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected Routes */}
      <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/upload" element={<ProtectedRoute><Layout><Upload /></Layout></ProtectedRoute>} />
      <Route path="/mail" element={<ProtectedRoute><Layout><MailConnect /></Layout></ProtectedRoute>} />
      <Route path="/mail/callback" element={<ProtectedRoute><MailCallback /></ProtectedRoute>} />
      <Route path="/invoices" element={<ProtectedRoute><Layout><Invoices /></Layout></ProtectedRoute>} />
      <Route path="/excel" element={<ProtectedRoute><Layout><ExcelSheet /></Layout></ProtectedRoute>} />
      <Route path="/invoices/:id" element={<ProtectedRoute><Layout><InvoiceDetail /></Layout></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><Layout><Analytics /></Layout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
