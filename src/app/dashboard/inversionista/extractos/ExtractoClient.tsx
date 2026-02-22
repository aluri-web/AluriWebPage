'use client'

import { useState } from 'react'
import { FileText, Download, Loader2 } from 'lucide-react'
import { getExtractoMensual, type ExtractoData } from './actions'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ExtractoClient() {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [anio, setAnio] = useState(now.getFullYear())
  const [loading, setLoading] = useState(false)
  const [extracto, setExtracto] = useState<ExtractoData | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerar() {
    setLoading(true)
    setError(null)
    setExtracto(null)

    const result = await getExtractoMensual(mes, anio)

    if (result.error) {
      setError(result.error)
    } else {
      setExtracto(result.data)
    }
    setLoading(false)
  }

  async function handleDescargarPDF() {
    if (!extracto) return

    const { default: jsPDF } = await import('jspdf')
    await import('jspdf-autotable')

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()

    // Header
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('ALURI', 14, 20)

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Extracto de Portafolio`, 14, 30)
    doc.text(extracto.periodo.label, 14, 37)

    // Investor info
    doc.setFontSize(10)
    doc.text(`Inversionista: ${extracto.inversionista.nombre}`, 14, 50)
    if (extracto.inversionista.documento) {
      doc.text(`Documento: ${extracto.inversionista.documento}`, 14, 56)
    }
    doc.text(`Email: ${extracto.inversionista.email}`, 14, 62)

    let yPos = 75

    if (extracto.inversiones.length === 0) {
      doc.setFontSize(11)
      doc.text('No se encontraron movimientos en este periodo.', 14, yPos)
    } else {
      for (const inv of extracto.inversiones) {
        // Check if we need a new page
        if (yPos > 250) {
          doc.addPage()
          yPos = 20
        }

        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text(
          `${inv.codigo_credito} — Participacion: ${inv.porcentaje.toFixed(2)}% — Invertido: ${formatCOP(inv.monto_invertido)}`,
          14,
          yPos
        )
        yPos += 8

        const tableData = inv.pagos.map(p => [
          formatDate(p.fecha),
          formatCOP(p.capital),
          formatCOP(p.interes),
          formatCOP(p.mora),
          formatCOP(p.total),
        ])

        // Add subtotal row
        tableData.push([
          'Subtotal',
          formatCOP(inv.subtotal.capital),
          formatCOP(inv.subtotal.interes),
          formatCOP(inv.subtotal.mora),
          formatCOP(inv.subtotal.total),
        ])

        ;(doc as any).autoTable({
          startY: yPos,
          head: [['Fecha', 'Capital', 'Intereses', 'Mora', 'Total']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [20, 184, 166] }, // teal-500
          styles: { fontSize: 9, cellPadding: 3 },
          margin: { left: 14, right: 14 },
          didParseCell: (data: any) => {
            // Bold subtotal row
            if (data.row.index === tableData.length - 1) {
              data.cell.styles.fontStyle = 'bold'
            }
          },
        })

        yPos = (doc as any).lastAutoTable.finalY + 12
      }

      // Grand totals
      if (yPos > 250) {
        doc.addPage()
        yPos = 20
      }

      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('Totales del Periodo', 14, yPos)
      yPos += 8

      ;(doc as any).autoTable({
        startY: yPos,
        head: [['Concepto', 'Monto']],
        body: [
          ['Capital Recuperado', formatCOP(extracto.totales.capital)],
          ['Intereses Recibidos', formatCOP(extracto.totales.interes)],
          ['Mora Recibida', formatCOP(extracto.totales.mora)],
          ['Total Recibido', formatCOP(extracto.totales.total)],
        ],
        theme: 'striped',
        headStyles: { fillColor: [20, 184, 166] },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: 14, right: pageWidth / 2 },
        didParseCell: (data: any) => {
          if (data.row.index === 3) {
            data.cell.styles.fontStyle = 'bold'
          }
        },
      })
    }

    // Footer
    const finalY = (doc as any).lastAutoTable?.finalY || yPos
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(150)
    doc.text(
      `Generado el ${new Date().toLocaleDateString('es-CO')} — Aluri S.A.S.`,
      14,
      Math.min(finalY + 20, 285)
    )

    const mesNombre = MESES[extracto.periodo.mes - 1].toLowerCase()
    doc.save(`extracto_${mesNombre}_${extracto.periodo.anio}.pdf`)
  }

  return (
    <div>
      {/* Period Selector */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-700 p-6 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Mes</label>
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="bg-zinc-800 border border-zinc-600 text-white rounded-lg px-4 py-2.5 text-sm focus:ring-teal-500 focus:border-teal-500"
            >
              {MESES.map((nombre, i) => (
                <option key={i} value={i + 1}>{nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Año</label>
            <select
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              className="bg-zinc-800 border border-zinc-600 text-white rounded-lg px-4 py-2.5 text-sm focus:ring-teal-500 focus:border-teal-500"
            >
              {[2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleGenerar}
            disabled={loading}
            className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-black font-semibold px-6 py-2.5 rounded-lg transition-colors"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
            {loading ? 'Generando...' : 'Generar Extracto'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-xl p-4 mb-6">
          {error}
        </div>
      )}

      {/* Extracto Result */}
      {extracto && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-700 p-6">
          {/* Header */}
          <div className="flex flex-wrap justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">
                Extracto de Portafolio — {extracto.periodo.label}
              </h2>
              <p className="text-zinc-400 text-sm mt-1">
                {extracto.inversionista.nombre}
                {extracto.inversionista.documento && ` — ${extracto.inversionista.documento}`}
              </p>
            </div>
            {extracto.inversiones.length > 0 && (
              <button
                onClick={handleDescargarPDF}
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white px-4 py-2 rounded-lg transition-colors text-sm mt-2 sm:mt-0"
              >
                <Download size={16} />
                Descargar PDF
              </button>
            )}
          </div>

          {extracto.inversiones.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto text-zinc-600 mb-4" />
              <p className="text-zinc-400">No se encontraron movimientos en este periodo.</p>
            </div>
          ) : (
            <>
              {/* Investment tables */}
              {extracto.inversiones.map((inv) => (
                <div key={inv.codigo_credito} className="mb-8">
                  <div className="flex flex-wrap items-baseline gap-3 mb-3">
                    <h3 className="text-lg font-semibold text-teal-400">{inv.codigo_credito}</h3>
                    <span className="text-sm text-zinc-400">
                      Participación: {inv.porcentaje.toFixed(2)}%
                    </span>
                    <span className="text-sm text-zinc-500">
                      Invertido: {formatCOP(inv.monto_invertido)}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-700">
                          <th className="text-left text-zinc-400 font-medium py-3 px-4">Fecha</th>
                          <th className="text-right text-zinc-400 font-medium py-3 px-4">Capital</th>
                          <th className="text-right text-zinc-400 font-medium py-3 px-4">Intereses</th>
                          <th className="text-right text-zinc-400 font-medium py-3 px-4">Mora</th>
                          <th className="text-right text-zinc-400 font-medium py-3 px-4">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inv.pagos.map((pago, i) => (
                          <tr key={i} className="border-b border-zinc-800">
                            <td className="py-3 px-4 text-zinc-300">{formatDate(pago.fecha)}</td>
                            <td className="py-3 px-4 text-right text-zinc-300">{formatCOP(pago.capital)}</td>
                            <td className="py-3 px-4 text-right text-zinc-300">{formatCOP(pago.interes)}</td>
                            <td className="py-3 px-4 text-right text-zinc-300">{formatCOP(pago.mora)}</td>
                            <td className="py-3 px-4 text-right text-white font-medium">{formatCOP(pago.total)}</td>
                          </tr>
                        ))}
                        <tr className="bg-zinc-800/50">
                          <td className="py-3 px-4 font-semibold text-zinc-200">Subtotal</td>
                          <td className="py-3 px-4 text-right font-semibold text-zinc-200">{formatCOP(inv.subtotal.capital)}</td>
                          <td className="py-3 px-4 text-right font-semibold text-zinc-200">{formatCOP(inv.subtotal.interes)}</td>
                          <td className="py-3 px-4 text-right font-semibold text-zinc-200">{formatCOP(inv.subtotal.mora)}</td>
                          <td className="py-3 px-4 text-right font-bold text-teal-400">{formatCOP(inv.subtotal.total)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {/* Grand totals */}
              <div className="border-t border-zinc-600 pt-6 mt-4">
                <h3 className="text-lg font-bold text-white mb-4">Totales del Periodo</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-zinc-800 rounded-lg p-4">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Capital</p>
                    <p className="text-lg font-semibold text-white mt-1">{formatCOP(extracto.totales.capital)}</p>
                  </div>
                  <div className="bg-zinc-800 rounded-lg p-4">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Intereses</p>
                    <p className="text-lg font-semibold text-teal-400 mt-1">{formatCOP(extracto.totales.interes)}</p>
                  </div>
                  <div className="bg-zinc-800 rounded-lg p-4">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Mora</p>
                    <p className="text-lg font-semibold text-white mt-1">{formatCOP(extracto.totales.mora)}</p>
                  </div>
                  <div className="bg-zinc-800 rounded-lg p-4 border border-teal-500/30">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Total Recibido</p>
                    <p className="text-xl font-bold text-teal-400 mt-1">{formatCOP(extracto.totales.total)}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
