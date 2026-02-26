'use client'

interface Transaccion {
  id: string
  tipo_transaccion: string
  monto: number
  fecha_aplicacion: string
  referencia_pago: string | null
}

interface AbonosTableProps {
  transacciones: Transaccion[]
  valorColocado: number
}

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

interface PagoAgrupado {
  fecha: string
  capital: number
  interes: number
  mora: number
  abono: number
}

export default function AbonosTable({ transacciones, valorColocado }: AbonosTableProps) {
  // Filter to payment types only
  const pagos = transacciones.filter(t =>
    t.tipo_transaccion === 'pago_capital' ||
    t.tipo_transaccion === 'pago_interes' ||
    t.tipo_transaccion === 'pago_mora'
  )

  if (pagos.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-4">Sin pagos registrados</p>
    )
  }

  // Group by referencia_pago
  const grupos = new Map<string, PagoAgrupado>()

  for (const tx of pagos) {
    const key = tx.referencia_pago || tx.id
    const existing = grupos.get(key) || { fecha: tx.fecha_aplicacion, capital: 0, interes: 0, mora: 0, abono: 0 }

    if (tx.tipo_transaccion === 'pago_capital') existing.capital += Number(tx.monto)
    else if (tx.tipo_transaccion === 'pago_interes') existing.interes += Number(tx.monto)
    else if (tx.tipo_transaccion === 'pago_mora') existing.mora += Number(tx.monto)

    // Use the earliest date in the group
    if (tx.fecha_aplicacion < existing.fecha) existing.fecha = tx.fecha_aplicacion

    existing.abono = existing.capital + existing.interes + existing.mora
    grupos.set(key, existing)
  }

  // Sort by date ascending
  const rows = Array.from(grupos.values()).sort(
    (a, b) => a.fecha.localeCompare(b.fecha)
  )

  // Calculate running saldo
  let saldo = valorColocado
  const rowsWithSaldo = rows.map(row => {
    saldo -= row.capital
    return { ...row, saldo }
  })

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-emerald-600 text-white">
            <th className="px-4 py-2.5 text-left font-medium">Fecha de Pago</th>
            <th className="px-4 py-2.5 text-right font-medium">Abono</th>
            <th className="px-4 py-2.5 text-right font-medium">Capital</th>
            <th className="px-4 py-2.5 text-right font-medium">Interes Corriente</th>
            <th className="px-4 py-2.5 text-right font-medium">Interes Moratorio</th>
            <th className="px-4 py-2.5 text-right font-medium">Saldo Luego del Pago</th>
          </tr>
        </thead>
        <tbody>
          {rowsWithSaldo.map((row, i) => (
            <tr
              key={i}
              className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
            >
              <td className="px-4 py-2.5 text-gray-700">{formatDate(row.fecha)}</td>
              <td className="px-4 py-2.5 text-right text-gray-900 font-medium">{formatCOP(row.abono)}</td>
              <td className="px-4 py-2.5 text-right text-gray-700">{formatCOP(row.capital)}</td>
              <td className="px-4 py-2.5 text-right text-gray-700">{formatCOP(row.interes)}</td>
              <td className="px-4 py-2.5 text-right text-gray-700">{row.mora > 0 ? formatCOP(row.mora) : '-'}</td>
              <td className="px-4 py-2.5 text-right text-gray-900 font-medium">{formatCOP(row.saldo)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
