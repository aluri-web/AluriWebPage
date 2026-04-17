'use client'

import { useState } from 'react'
import { FileText, Download, Loader2, X } from 'lucide-react'
import { getExtractoPropietario, type ExtractoData } from './extracto-actions'

const CURRENT_YEAR = new Date().getFullYear()
const ANIOS_DISPONIBLES = [2025, 2026, 2027].filter(y => y <= CURRENT_YEAR + 1)
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
  const [open, setOpen] = useState(false)
  // 'global' = all years; otherwise a specific year number
  const [seleccion, setSeleccion] = useState<'global' | number>(CURRENT_YEAR)
  // 0 = todo el año; 1-12 = mes específico
  const [mes, setMes] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [extracto, setExtracto] = useState<ExtractoData | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerar() {
    setLoading(true)
    setError(null)
    setExtracto(null)

    const anio = seleccion === 'global' ? null : seleccion
    const mesParam = seleccion === 'global' || mes === 0 ? null : mes
    const result = await getExtractoPropietario(creditoId, anio, mesParam)

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

    // Colores de marca
    const emerald: [number, number, number] = [5, 150, 105]
    const gray700: [number, number, number] = [55, 65, 81]
    const gray500: [number, number, number] = [107, 114, 128]
    const gray200: [number, number, number] = [229, 231, 235]

    // Logo arriba a la izquierda
    try {
      const logoUrl = '/images/aluri_logo_1.png'
      const response = await fetch(logoUrl)
      const blob = await response.blob()
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
      doc.addImage(dataUrl, 'PNG', 14, 14, 34, 10)
    } catch {
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...gray700)
      doc.text('ALURI', 14, 22)
    }

    // Titulo a la derecha
    doc.setTextColor(...gray700)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Estado de cuenta', 196, 20, { align: 'right' })
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...gray500)
    doc.text(extracto.periodo.label, 196, 27, { align: 'right' })

    // Linea divisoria
    doc.setDrawColor(...gray200)
    doc.setLineWidth(0.3)
    doc.line(14, 34, 196, 34)

    // Lista de detalles (formato fila por fila)
    const listStart = 44
    const rowGap = 8
    const labelX = 20
    const valueX = 75 // Valores alineados a la izquierda en columna consistente

    const listRows: Array<{ label: string; value: string; bold?: boolean; highlight?: boolean }> = [
      { label: 'Propietario', value: extracto.propietario.nombre, bold: true },
    ]
    if (extracto.propietario.documento) {
      listRows.push({ label: 'Documento', value: `CC ${extracto.propietario.documento}` })
    }
    listRows.push(
      { label: 'Credito', value: extracto.credito.codigo_credito, bold: true },
      { label: 'Monto del credito', value: formatCOP(extracto.credito.valor_colocado || extracto.credito.monto_solicitado) },
      { label: 'Saldo capital', value: formatCOP(extracto.credito.saldo_capital), highlight: true },
    )

    // Inversionistas: una fila por inversionista
    if (extracto.inversionistas.length > 0) {
      extracto.inversionistas.forEach((inv, idx) => {
        listRows.push({
          label: idx === 0 ? (extracto.inversionistas.length === 1 ? 'Inversionista' : 'Inversionistas') : '',
          value: `${inv.nombre} — ${formatCOP(inv.monto_invertido)}`,
        })
      })
    }

    // Caja contenedora
    const listH = listRows.length * rowGap + 6
    doc.setDrawColor(...gray200)
    doc.setFillColor(249, 250, 251)
    doc.roundedRect(14, listStart - 6, 182, listH, 3, 3, 'FD')

    listRows.forEach((row, i) => {
      const y = listStart + i * rowGap

      // Label
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...gray500)
      doc.text(row.label, labelX, y)

      // Value
      doc.setFontSize(10)
      if (row.highlight) {
        doc.setTextColor(...emerald)
        doc.setFont('helvetica', 'bold')
      } else if (row.bold) {
        doc.setTextColor(...gray700)
        doc.setFont('helvetica', 'bold')
      } else {
        doc.setTextColor(...gray700)
        doc.setFont('helvetica', 'normal')
      }
      doc.text(row.value, valueX, y)

      // Linea divisoria entre filas (excepto la ultima)
      if (i < listRows.length - 1) {
        doc.setDrawColor(...gray200)
        doc.line(labelX, y + 2.5, 190, y + 2.5)
      }
    })

    // Reset para la tabla
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')

    const yPos = listStart + listH

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
        formatCOP(p.saldo),
      ])

      tableData.push([
        'Total',
        formatCOP(extracto.totales.capital),
        formatCOP(extracto.totales.interes),
        formatCOP(extracto.totales.mora),
        formatCOP(extracto.totales.total),
        '',
      ])

      autoTable(doc, {
        startY: yPos,
        head: [['Fecha', 'Capital', 'Intereses', 'Mora', 'Total', 'Saldo']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [5, 150, 105] },
        styles: { fontSize: 8, cellPadding: 2.5 },
        margin: { left: 14, right: 14 },
        didParseCell: (data) => {
          if (data.row.index === tableData.length - 1) {
            data.cell.styles.fontStyle = 'bold'
          }
        },
      })
    }

    // Footer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalY = (doc as any).lastAutoTable?.finalY || yPos
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(150)
    doc.text(
      `Generado el ${new Date().toLocaleDateString('es-CO')} — Aluri S.A.S.`,
      14,
      Math.min(finalY + 20, 285)
    )

    const sufijo = extracto.periodo.anio === null
      ? 'historico'
      : extracto.periodo.mes !== null
        ? `${extracto.periodo.anio}-${String(extracto.periodo.mes).padStart(2, '0')}`
        : String(extracto.periodo.anio)
    doc.save(`extracto_${codigoCredito}_${sufijo}.pdf`)
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
                  <label className="block text-sm text-gray-500 mb-2">Periodo</label>
                  <select
                    value={seleccion === 'global' ? 'global' : String(seleccion)}
                    onChange={(e) => {
                      const val = e.target.value
                      setSeleccion(val === 'global' ? 'global' : Number(val))
                      setMes(0) // Reset mes al cambiar año
                    }}
                    className="bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="global">Todos los años (histórico)</option>
                    {ANIOS_DISPONIBLES.map(y => (
                      <option key={y} value={y}>Año {y}</option>
                    ))}
                  </select>
                </div>
                {seleccion !== 'global' && (
                  <div>
                    <label className="block text-sm text-gray-500 mb-2">Mes</label>
                    <select
                      value={mes}
                      onChange={(e) => setMes(Number(e.target.value))}
                      className="bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value={0}>Todo el año</option>
                      {MESES.map((nombre, i) => (
                        <option key={i + 1} value={i + 1}>{nombre}</option>
                      ))}
                    </select>
                  </div>
                )}
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
                  <div className="flex flex-wrap justify-between items-start mb-4 gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{extracto.periodo.label}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{extracto.propietario.nombre}</p>
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
                            <th className="text-right text-gray-500 font-medium py-3 px-3">Saldo</th>
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
                              <td className="py-3 px-3 text-right text-gray-900 font-medium">{formatCOP(pago.saldo)}</td>
                            </tr>
                          ))}
                          <tr className="bg-gray-50">
                            <td className="py-3 px-3 font-semibold text-gray-800">Total</td>
                            <td className="py-3 px-3 text-right font-semibold text-gray-800">{formatCOP(extracto.totales.capital)}</td>
                            <td className="py-3 px-3 text-right font-semibold text-gray-800">{formatCOP(extracto.totales.interes)}</td>
                            <td className="py-3 px-3 text-right font-semibold text-gray-800">{formatCOP(extracto.totales.mora)}</td>
                            <td className="py-3 px-3 text-right font-bold text-emerald-600">{formatCOP(extracto.totales.total)}</td>
                            <td></td>
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
