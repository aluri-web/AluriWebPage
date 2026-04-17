'use client'

import { useState } from 'react'
import { FileText, Download, Loader2, X } from 'lucide-react'
import { getExtractoCredito, type ExtractoData } from './extracto-actions'

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

export default function ExtractoModal({
  creditoId,
  codigoCredito,
}: {
  creditoId: string
  codigoCredito: string
}) {
  const now = new Date()
  const [open, setOpen] = useState(false)
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [anio, setAnio] = useState(now.getFullYear())
  const [loading, setLoading] = useState(false)
  const [extracto, setExtracto] = useState<ExtractoData | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerar() {
    setLoading(true)
    setError(null)
    setExtracto(null)

    const result = await getExtractoCredito(creditoId, mes, anio)

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
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF()

    // Header
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('ALURI', 14, 20)

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Extracto — ${extracto.credito.codigo_credito}`, 14, 30)
    doc.text(extracto.periodo.label, 14, 37)

    // Investor info
    doc.setFontSize(10)
    doc.text(`Inversionista: ${extracto.inversionista.nombre}`, 14, 50)
    if (extracto.inversionista.documento) {
      doc.text(`Documento: ${extracto.inversionista.documento}`, 14, 56)
    }
    doc.text(`Invertido: ${formatCOP(extracto.credito.monto_invertido)} — Participacion: ${extracto.credito.porcentaje.toFixed(2)}%`, 14, 62)

    let yPos = 75

    if (extracto.pagos.length === 0) {
      doc.setFontSize(11)
      doc.text('No se encontraron movimientos en este periodo.', 14, yPos)
    } else {
      const tableData = extracto.pagos.map(p => [
        formatDate(p.fecha),
        formatCOP(p.capital),
        formatCOP(p.interes),
        formatCOP(p.mora),
        formatCOP(p.total),
      ])

      tableData.push([
        'Total',
        formatCOP(extracto.totales.capital),
        formatCOP(extracto.totales.interes),
        formatCOP(extracto.totales.mora),
        formatCOP(extracto.totales.total),
      ])

      autoTable(doc, {
        startY: yPos,
        head: [['Fecha', 'Capital', 'Intereses', 'Mora', 'Total']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [20, 184, 166] },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: 14, right: 14 },
        didParseCell: (data) => {
          if (data.row.index === tableData.length - 1) {
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
    doc.save(`extracto_${codigoCredito}_${mesNombre}_${extracto.periodo.anio}.pdf`)
  }

  function handleClose() {
    setOpen(false)
    setExtracto(null)
    setError(null)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 bg-zinc-800 text-white font-medium py-3 px-4 rounded-lg hover:bg-zinc-700 transition-colors"
      >
        <FileText size={18} />
        Extracto Mensual
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-700">
              <h2 className="text-lg font-bold text-white">Extracto — {codigoCredito}</h2>
              <button onClick={handleClose} className="text-zinc-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Period selector */}
            <div className="p-6 border-b border-zinc-800">
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
                  {loading ? 'Generando...' : 'Generar'}
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {error && (
                <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-xl p-4 mb-4">
                  {error}
                </div>
              )}

              {extracto && (
                <>
                  {/* Header + PDF button */}
                  <div className="flex flex-wrap justify-between items-start mb-4">
                    <p className="text-zinc-400 text-sm">
                      {extracto.inversionista.nombre} — Participación: {extracto.credito.porcentaje.toFixed(2)}%
                    </p>
                    {extracto.pagos.length > 0 && (
                      <button
                        onClick={handleDescargarPDF}
                        className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white px-3 py-1.5 rounded-lg transition-colors text-sm"
                      >
                        <Download size={14} />
                        PDF
                      </button>
                    )}
                  </div>

                  {extracto.pagos.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText size={40} className="mx-auto text-zinc-600 mb-3" />
                      <p className="text-zinc-400 text-sm">No se encontraron movimientos en este periodo.</p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto mb-4">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-zinc-700">
                              <th className="text-left text-zinc-400 font-medium py-3 px-3">Fecha</th>
                              <th className="text-right text-zinc-400 font-medium py-3 px-3">Capital</th>
                              <th className="text-right text-zinc-400 font-medium py-3 px-3">Intereses</th>
                              <th className="text-right text-zinc-400 font-medium py-3 px-3">Mora</th>
                              <th className="text-right text-zinc-400 font-medium py-3 px-3">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {extracto.pagos.map((pago, i) => (
                              <tr key={i} className="border-b border-zinc-800">
                                <td className="py-3 px-3 text-zinc-300">{formatDate(pago.fecha)}</td>
                                <td className="py-3 px-3 text-right text-zinc-300">{formatCOP(pago.capital)}</td>
                                <td className="py-3 px-3 text-right text-zinc-300">{formatCOP(pago.interes)}</td>
                                <td className="py-3 px-3 text-right text-zinc-300">{formatCOP(pago.mora)}</td>
                                <td className="py-3 px-3 text-right text-white font-medium">{formatCOP(pago.total)}</td>
                              </tr>
                            ))}
                            <tr className="bg-zinc-800/50">
                              <td className="py-3 px-3 font-semibold text-zinc-200">Total</td>
                              <td className="py-3 px-3 text-right font-semibold text-zinc-200">{formatCOP(extracto.totales.capital)}</td>
                              <td className="py-3 px-3 text-right font-semibold text-zinc-200">{formatCOP(extracto.totales.interes)}</td>
                              <td className="py-3 px-3 text-right font-semibold text-zinc-200">{formatCOP(extracto.totales.mora)}</td>
                              <td className="py-3 px-3 text-right font-bold text-teal-400">{formatCOP(extracto.totales.total)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
