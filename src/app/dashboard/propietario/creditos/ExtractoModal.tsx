'use client'

import { useState } from 'react'
import { FileText, Download, Loader2, X } from 'lucide-react'
import { getExtractoPropietario, type ExtractoData } from './extracto-actions'

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

    const result = await getExtractoPropietario(creditoId, mes, anio)

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

    // Header
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('ALURI', 14, 20)

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Extracto — ${extracto.credito.codigo_credito}`, 14, 30)
    doc.text(extracto.periodo.label, 14, 37)

    // Propietario info
    doc.setFontSize(10)
    doc.text(`Propietario: ${extracto.propietario.nombre}`, 14, 50)
    if (extracto.propietario.documento) {
      doc.text(`Documento: ${extracto.propietario.documento}`, 14, 56)
    }
    doc.text(`Monto del credito: ${formatCOP(extracto.credito.valor_colocado || extracto.credito.monto_solicitado)}`, 14, 62)
    doc.text(`Saldo capital: ${formatCOP(extracto.credito.saldo_capital)}`, 14, 68)

    let yPos = 81

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

      ;(doc as any).autoTable({
        startY: yPos,
        head: [['Fecha', 'Capital', 'Intereses', 'Mora', 'Total']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [5, 150, 105] },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: 14, right: 14 },
        didParseCell: (data: any) => {
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
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
      >
        <FileText size={16} />
        Extracto
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Extracto — {codigoCredito}</h2>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Period selector */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-2">Mes</label>
                  <select
                    value={mes}
                    onChange={(e) => setMes(Number(e.target.value))}
                    className="bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    {MESES.map((nombre, i) => (
                      <option key={i} value={i + 1}>{nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-2">Anio</label>
                  <select
                    value={anio}
                    onChange={(e) => setAnio(Number(e.target.value))}
                    className="bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    {[2025, 2026, 2027].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleGenerar}
                  disabled={loading}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                  {loading ? 'Generando...' : 'Generar'}
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4">
                  {error}
                </div>
              )}

              {extracto && (
                <>
                  {/* Header + PDF button */}
                  <div className="flex flex-wrap justify-between items-start mb-4">
                    <div>
                      <p className="text-gray-500 text-sm">{extracto.propietario.nombre}</p>
                      <p className="text-gray-400 text-xs mt-0.5">
                        Saldo capital: {formatCOP(extracto.credito.saldo_capital)}
                      </p>
                    </div>
                    {extracto.pagos.length > 0 && (
                      <button
                        onClick={handleDescargarPDF}
                        className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors text-sm"
                      >
                        <Download size={14} />
                        PDF
                      </button>
                    )}
                  </div>

                  {extracto.pagos.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText size={40} className="mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-400 text-sm">No se encontraron movimientos en este periodo.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto mb-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left text-gray-500 font-medium py-3 px-3">Fecha</th>
                            <th className="text-right text-gray-500 font-medium py-3 px-3">Capital</th>
                            <th className="text-right text-gray-500 font-medium py-3 px-3">Intereses</th>
                            <th className="text-right text-gray-500 font-medium py-3 px-3">Mora</th>
                            <th className="text-right text-gray-500 font-medium py-3 px-3">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {extracto.pagos.map((pago, i) => (
                            <tr key={i} className="border-b border-gray-100">
                              <td className="py-3 px-3 text-gray-700">{formatDate(pago.fecha)}</td>
                              <td className="py-3 px-3 text-right text-gray-700">{formatCOP(pago.capital)}</td>
                              <td className="py-3 px-3 text-right text-gray-700">{formatCOP(pago.interes)}</td>
                              <td className="py-3 px-3 text-right text-gray-700">{formatCOP(pago.mora)}</td>
                              <td className="py-3 px-3 text-right text-gray-900 font-medium">{formatCOP(pago.total)}</td>
                            </tr>
                          ))}
                          <tr className="bg-gray-50">
                            <td className="py-3 px-3 font-semibold text-gray-800">Total</td>
                            <td className="py-3 px-3 text-right font-semibold text-gray-800">{formatCOP(extracto.totales.capital)}</td>
                            <td className="py-3 px-3 text-right font-semibold text-gray-800">{formatCOP(extracto.totales.interes)}</td>
                            <td className="py-3 px-3 text-right font-semibold text-gray-800">{formatCOP(extracto.totales.mora)}</td>
                            <td className="py-3 px-3 text-right font-bold text-emerald-600">{formatCOP(extracto.totales.total)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
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
