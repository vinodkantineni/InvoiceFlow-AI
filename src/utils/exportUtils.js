import { jsPDF } from 'jspdf'
import * as XLSX from 'xlsx'

export const exportToCSV = (data, filename) => {
  const replacer = (key, value) => (value === null ? '' : value)
  const header = Object.keys(data[0])
  
  const csv = data.map(row => 
    header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(',')
  )
  csv.unshift(header.join(','))
  
  const csvArray = csv.join('\r\n')
  const blob = new Blob([csvArray], { type: 'text/csv' })
  
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}.csv`
  link.click()
}

export const exportToExcel = (data, filename) => {
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoices')
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

export const exportInvoiceToPDF = (invoice) => {
  const doc = new jsPDF()
  
  doc.setFontSize(20)
  doc.text('Invoice Details', 20, 20)
  
  doc.setFontSize(12)
  doc.text(`Vendor: ${invoice.vendor || 'N/A'}`, 20, 40)
  doc.text(`Invoice Number: ${invoice.invoiceNumber || 'N/A'}`, 20, 50)
  doc.text(`Date: ${invoice.date || 'N/A'}`, 20, 60)
  doc.text(`Due Date: ${invoice.dueDate || 'N/A'}`, 20, 70)
  doc.text(`Total Amount: $${invoice.total || '0.00'}`, 20, 80)
  doc.text(`Currency: ${invoice.currency || 'N/A'}`, 20, 90)
  
  doc.save(`Invoice_${invoice.invoiceNumber || 'details'}.pdf`)
}
