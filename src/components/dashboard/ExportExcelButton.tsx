'use client'

import { Download } from 'lucide-react'
import * as XLSX from 'xlsx'

interface ExportExcelButtonProps {
  data: Record<string, unknown>[]
  filename: string
  sheetName?: string
  headers?: Record<string, string> // Map original keys to display names
}

export default function ExportExcelButton({
  data,
  filename,
  sheetName = 'Datos',
  headers,
}: ExportExcelButtonProps) {
  const handleExport = () => {
    if (!data || data.length === 0) {
      alert('No hay datos para exportar')
      return
    }

    // Transform data to use display headers if provided
    const exportData = data.map(row => {
      if (!headers) return row

      const newRow: Record<string, unknown> = {}
      for (const [key, displayName] of Object.entries(headers)) {
        newRow[displayName] = row[key]
      }
      return newRow
    })

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)

    // Auto-size columns
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.max(
        key.length,
        ...exportData.map(row => String(row[key] || '').length)
      ) + 2
    }))
    ws['!cols'] = colWidths

    // Generate filename with date
    const date = new Date().toISOString().split('T')[0]
    const fullFilename = `${filename}_${date}.xlsx`

    // Download
    XLSX.writeFile(wb, fullFilename)
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors"
    >
      <Download size={18} />
      <span className="text-sm font-medium">Exportar Excel</span>
    </button>
  )
}
