'use client'

import { useMemo } from 'react'
import { Building2, DollarSign, Hash, Calendar, TrendingUp, Home } from 'lucide-react'
import { calcularDiasMoraLive } from '@/utils/mora-helper'

interface Transaccion {
  id: string
  tipo_transaccion: string
  monto: number
  fecha_aplicacion: string | null
  referencia_pago: string | null
}

interface Inversion {
  monto_invertido: number
}

interface PropietarioViewCredit {
  id: string
  codigo_credito: string
  estado: string
  monto_solicitado: number
  valor_colocado: number | null
  tasa_nominal: number | null
  tasa_interes_ea: number | null
  ciudad_inmueble: string | null
  direccion_inmueble: string | null
  tipo_inmueble: string | null
  valor_comercial: number | null
  created_at: string
  fecha_desembolso: string | null
  en_mora?: boolean | null
  dias_mora_actual?: number | null
  saldo_mora?: number | null
  fecha_ultimo_pago?: string | null
  inversiones?: Inversion[]
  transacciones?: Transaccion[]
}

interface PagoAgrupado {
  fecha: string
  capital: number
  interes: number
  mora: number
  abono: number
}

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  const parts = dateString.split('-').map(Number)
  if (parts.length < 3 || parts.some(isNaN)) return '-'
  const [year, month, day] = parts
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const getStatusLabel = (estado: string) => {
  switch (estado) {
    case 'solicitado': return 'Solicitado'
    case 'aprobado': return 'Aprobado'
    case 'publicado': return 'Colocando'
    case 'en_firma': return 'En Firma'
    case 'firmado': return 'Firmado'
    case 'activo': return 'Desembolsado'
    case 'finalizado': return 'Completado'
    case 'castigado': return 'Castigado'
    case 'mora': return 'En Mora'
    case 'no_colocado': return 'No Colocado'
    default: return estado
  }
}

const getStatusClass = (estado: string) => {
  switch (estado) {
    case 'publicado': return 'bg-teal-500/10 border-teal-500/20 text-teal-400'
    case 'en_firma': return 'bg-purple-500/10 border-purple-500/20 text-purple-400'
    case 'firmado': return 'bg-blue-500/10 border-blue-500/20 text-blue-400'
    case 'activo': return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
    case 'finalizado': return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
    case 'castigado':
    case 'mora': return 'bg-red-500/10 border-red-500/20 text-red-400'
    case 'no_colocado': return 'bg-orange-500/10 border-orange-500/20 text-orange-400'
    default: return 'bg-slate-800 border-slate-700 text-slate-400'
  }
}

const getPropertyTypeLabel = (type: string | null | undefined) => {
  if (!type) return 'No registrado'
  const labels: Record<string, string> = {
    casa: 'Casa',
    apartamento: 'Apartamento',
    lote: 'Lote',
    local: 'Local',
    bodega: 'Bodega',
    oficina: 'Oficina',
    finca: 'Finca',
  }
  return labels[type.toLowerCase()] || type
}

function buildPagos(transacciones: Transaccion[], valorColocado: number) {
  const pagos = transacciones.filter(t =>
    t.tipo_transaccion === 'pago_capital' ||
    t.tipo_transaccion === 'pago_interes' ||
    t.tipo_transaccion === 'pago_mora'
  )

  const grupos = new Map<string, PagoAgrupado>()
  for (const tx of pagos) {
    if (!tx.fecha_aplicacion) continue
    const key = tx.referencia_pago || tx.id
    const existing = grupos.get(key) || { fecha: tx.fecha_aplicacion, capital: 0, interes: 0, mora: 0, abono: 0 }

    if (tx.tipo_transaccion === 'pago_capital') existing.capital += Number(tx.monto)
    else if (tx.tipo_transaccion === 'pago_interes') existing.interes += Number(tx.monto)
    else if (tx.tipo_transaccion === 'pago_mora') existing.mora += Number(tx.monto)

    if (tx.fecha_aplicacion < existing.fecha) existing.fecha = tx.fecha_aplicacion
    existing.abono = existing.capital + existing.interes + existing.mora
    grupos.set(key, existing)
  }

  const rows = Array.from(grupos.values()).sort((a, b) => a.fecha.localeCompare(b.fecha))
  let saldo = valorColocado
  return rows.map(row => {
    saldo -= row.capital
    return { ...row, saldo }
  })
}

export default function PropietarioViewTab({ credit }: { credit: PropietarioViewCredit }) {
  const amountFunded = useMemo(
    () => (credit.inversiones || []).reduce((sum, inv) => sum + (inv.monto_invertido || 0), 0),
    [credit.inversiones]
  )

  const fundingProgress = credit.monto_solicitado > 0
    ? Math.round((amountFunded / credit.monto_solicitado) * 100)
    : 0

  const showFundingProgress = credit.estado === 'publicado' || credit.estado === 'activo'
  const pagos = useMemo(
    () => buildPagos(credit.transacciones || [], credit.valor_colocado || credit.monto_solicitado),
    [credit.transacciones, credit.valor_colocado, credit.monto_solicitado]
  )

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Card Header */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <Home size={24} className="text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-lg font-semibold text-white">{credit.codigo_credito}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusClass(credit.estado)}`}>
                  {getStatusLabel(credit.estado)}
                </span>
                {(() => {
                  const live = calcularDiasMoraLive(credit.fecha_desembolso, credit.fecha_ultimo_pago)
                  const enMora = live.enMora || (credit.saldo_mora ?? 0) > 0
                  const dias = live.diasMora
                  if (!enMora) return null
                  return (
                    <span className="px-2 py-1 rounded-full text-xs font-medium border bg-red-500/10 text-red-400 border-red-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                      En Mora{dias > 0 ? ` (${dias} ${dias === 1 ? 'día' : 'días'})` : ''}
                    </span>
                  )
                })()}
              </div>
              <p className="text-slate-400 text-sm mt-1">
                {credit.ciudad_inmueble || 'Sin ubicacion'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">{credit.fecha_desembolso ? 'Desembolso' : 'Creado'}</p>
            <p className="text-sm text-slate-300">{formatDate(credit.fecha_desembolso || credit.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <Hash size={14} />
              <span>Codigo</span>
            </div>
            <p className="text-white font-semibold">{credit.codigo_credito}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <Calendar size={14} />
              <span>Estado</span>
            </div>
            <p className="text-white font-semibold">{getStatusLabel(credit.estado)}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <Building2 size={14} />
              <span>Valor Inmueble</span>
            </div>
            <p className="text-white font-semibold">
              {credit.valor_comercial ? formatCOP(credit.valor_comercial) : 'No registrado'}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <DollarSign size={14} />
              <span>Monto Solicitado</span>
            </div>
            <p className="text-emerald-400 font-semibold">{formatCOP(credit.monto_solicitado)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6 pt-6 border-t border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <Building2 size={14} />
              <span>Tipo de Predio</span>
            </div>
            <p className="text-slate-200">{getPropertyTypeLabel(credit.tipo_inmueble)}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <TrendingUp size={14} />
              <span>Tasa EA</span>
            </div>
            <p className="text-slate-200">{credit.tasa_interes_ea ? `${credit.tasa_interes_ea}%` : '-'}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <Hash size={14} />
              <span>Direccion</span>
            </div>
            <p className="text-slate-200">{credit.direccion_inmueble || 'No registrada'}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <DollarSign size={14} />
              <span>Monto Fondeado</span>
            </div>
            <p className="text-slate-200">{formatCOP(amountFunded)}</p>
          </div>
        </div>

        {showFundingProgress && (
          <div className="mt-6 pt-6 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Progreso de Fondeo</span>
              <span className="text-sm font-medium text-white">{fundingProgress}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(fundingProgress, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-500">
              <span>{formatCOP(amountFunded)} fondeado</span>
              <span>{formatCOP(credit.monto_solicitado)} objetivo</span>
            </div>
          </div>
        )}

        {/* Abonos Table */}
        <div className="mt-6 pt-6 border-t border-slate-800">
          <h4 className="text-sm font-semibold text-white mb-4">Abonos</h4>
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800 text-slate-300">
                    <th className="px-4 py-2.5 text-left font-medium">Fecha de Pago</th>
                    <th className="px-4 py-2.5 text-right font-medium">Abono</th>
                    <th className="px-4 py-2.5 text-right font-medium">Capital</th>
                    <th className="px-4 py-2.5 text-right font-medium">Interes Corriente</th>
                    <th className="px-4 py-2.5 text-right font-medium">Interes Moratorio</th>
                    <th className="px-4 py-2.5 text-right font-medium">Saldo Luego del Pago</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                        Sin pagos registrados
                      </td>
                    </tr>
                  ) : (
                    pagos.map((row, i) => (
                      <tr
                        key={i}
                        className={i % 2 === 0 ? 'bg-slate-900' : 'bg-slate-900/50'}
                      >
                        <td className="px-4 py-2.5 text-slate-300">{formatDate(row.fecha)}</td>
                        <td className="px-4 py-2.5 text-right text-white font-medium">{formatCOP(row.abono)}</td>
                        <td className="px-4 py-2.5 text-right text-slate-300">{formatCOP(row.capital)}</td>
                        <td className="px-4 py-2.5 text-right text-slate-300">{formatCOP(row.interes)}</td>
                        <td className="px-4 py-2.5 text-right text-slate-300">{row.mora > 0 ? formatCOP(row.mora) : '-'}</td>
                        <td className="px-4 py-2.5 text-right text-white font-medium">{formatCOP(row.saldo)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
