'use client'

import { useState } from 'react'
import { Settings, Eye, CreditCard, User, MapPin, Home, HandCoins, TrendingUp, Wallet, Users, ShieldAlert } from 'lucide-react'
import CreditWorkflow from '../CreditWorkflow'
import InvestorViewTab from './InvestorViewTab'
import PropietarioViewTab from './PropietarioViewTab'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function CreditDetailTabs({ credit }: { credit: any }) {
  const [activeTab, setActiveTab] = useState<'admin' | 'investor' | 'propietario'>('admin')

  return (
    <>
      {/* Tab Bar */}
      <div className="flex border-b border-slate-800 mb-8">
        <button
          onClick={() => setActiveTab('admin')}
          className={`px-6 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'admin' ? 'text-teal-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Settings size={16} />
            Gestion del Credito
          </div>
          {activeTab === 'admin' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-400" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('investor')}
          className={`px-6 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'investor' ? 'text-teal-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Eye size={16} />
            Vista Inversionista
          </div>
          {activeTab === 'investor' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-400" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('propietario')}
          className={`px-6 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'propietario' ? 'text-teal-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Home size={16} />
            Vista Propietario
          </div>
          {activeTab === 'propietario' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-400" />
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'admin' && <AdminViewContent credit={credit} />}
      {activeTab === 'investor' && <InvestorViewTab credit={credit} />}
      {activeTab === 'propietario' && <PropietarioViewTab credit={credit} />}
    </>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AdminViewContent({ credit }: { credit: any }) {
  const formatCOP = (value: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)

  // Compute risk score from LTV (same logic as list)
  const ltv = credit.ltv ?? null
  const risk: { score: string | null; label: string | null } = (() => {
    if (ltv === null || ltv === undefined) return { score: null, label: null }
    if (ltv <= 40) return { score: 'A1', label: 'Bajo Riesgo' }
    if (ltv <= 55) return { score: 'A2', label: 'Riesgo Moderado' }
    if (ltv <= 70) return { score: 'B1', label: 'Riesgo Medio' }
    return { score: 'B2', label: 'Riesgo Alto' }
  })()

  const riskStyles: Record<string, string> = {
    A1: 'bg-teal-400/10 text-teal-400 border-teal-400/30',
    A2: 'bg-teal-400/10 text-teal-400 border-teal-400/30',
    B1: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    B2: 'bg-red-500/10 text-red-400 border-red-500/30',
  }

  // Show saldos for credits that have been disbursed
  const showSaldos = ['activo', 'mora', 'finalizado', 'castigado'].includes(credit.estado)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-8">
        {/* Workflow Component */}
        <CreditWorkflow credit={credit} />

        {/* Details Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-2">
            <CreditCard size={18} className="text-teal-400" />
            <h3 className="font-semibold text-white">Detalles del Credito</h3>
          </div>
          <div className="p-6 grid grid-cols-2 gap-6">
            {credit.monto_solicitado != null && (
              <div>
                <span className="block text-sm text-slate-500 mb-1">Monto Solicitado</span>
                <span className="text-lg font-medium text-white">
                  {formatCOP(credit.monto_solicitado)}
                </span>
              </div>
            )}
            <div>
              <span className="block text-sm text-slate-500 mb-1">Monto Aprobado</span>
              <span className="text-lg font-medium text-white">
                {formatCOP(credit.valor_colocado)}
              </span>
            </div>
            <div>
              <span className="block text-sm text-slate-500 mb-1">Tasa de Interes</span>
              <span className="text-lg font-medium text-white">{credit.tasa_nominal}% N.M.</span>
            </div>
            <div>
              <span className="block text-sm text-slate-500 mb-1">Plazo</span>
              <span className="text-lg font-medium text-white">{credit.plazo} Meses</span>
            </div>
            {credit.fecha_desembolso && (
              <div>
                <span className="block text-sm text-slate-500 mb-1">Fecha de Desembolso</span>
                <span className="text-lg font-medium text-white">
                  {new Date(credit.fecha_desembolso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
            )}
            <div>
              <span className="block text-sm text-slate-500 mb-1">Tipo de Contrato</span>
              <span className="text-lg font-medium text-white capitalize">{credit.tipo_contrato?.replace('_', ' ') || 'N/A'}</span>
            </div>
            <div>
              <span className="block text-sm text-slate-500 mb-1">Tipo de Amortizacion</span>
              <span className="text-lg font-medium text-white capitalize">{credit.tipo_amortizacion?.replace('_', ' ') || 'N/A'}</span>
            </div>
            <div>
              <span className="block text-sm text-slate-500 mb-1">Tipo de Liquidacion</span>
              <span className="text-lg font-medium text-white capitalize">{credit.tipo_liquidacion || 'N/A'}</span>
            </div>
            {credit.tasa_interes_ea && (
              <div>
                <span className="block text-sm text-slate-500 mb-1">Tasa E.A.</span>
                <span className="text-lg font-medium text-white">{credit.tasa_interes_ea}%</span>
              </div>
            )}
            {credit.comision_deudor > 0 && (
              <div>
                <span className="block text-sm text-slate-500 mb-1">Comision Deudor</span>
                <span className="text-lg font-medium text-white">
                  {formatCOP(credit.comision_deudor)}
                </span>
              </div>
            )}
            {risk.score && (
              <div>
                <span className="block text-sm text-slate-500 mb-1">Riesgo</span>
                <span className={`inline-block text-sm font-medium px-2.5 py-1 rounded border ${riskStyles[risk.score] || 'bg-slate-500/10 text-slate-400 border-slate-500/30'}`}>
                  {risk.score} - {risk.label}
                </span>
              </div>
            )}
            {credit.notaria && (
              <div>
                <span className="block text-sm text-slate-500 mb-1">Notaria</span>
                <span className="text-lg font-medium text-white">{credit.notaria}</span>
              </div>
            )}
            {credit.costos_notaria > 0 && (
              <div>
                <span className="block text-sm text-slate-500 mb-1">Costos de Notaria</span>
                <span className="text-lg font-medium text-white">
                  {formatCOP(credit.costos_notaria)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Saldos Card - solo para creditos desembolsados */}
        {showSaldos && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-2">
              <Wallet size={18} className="text-emerald-400" />
              <h3 className="font-semibold text-white">Saldos Actuales</h3>
              {credit.en_mora && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 flex items-center gap-1">
                  <ShieldAlert size={12} />
                  En Mora
                </span>
              )}
            </div>
            <div className="p-6 grid grid-cols-3 gap-6">
              <div>
                <span className="block text-sm text-slate-500 mb-1">Saldo Capital</span>
                <span className="text-lg font-medium text-white">
                  {formatCOP(credit.saldo_capital || 0)}
                </span>
              </div>
              <div>
                <span className="block text-sm text-slate-500 mb-1">Saldo Intereses</span>
                <span className="text-lg font-medium text-white">
                  {formatCOP(credit.saldo_intereses || 0)}
                </span>
              </div>
              <div>
                <span className="block text-sm text-slate-500 mb-1">Saldo Mora</span>
                <span className={`text-lg font-medium ${credit.saldo_mora > 0 ? 'text-red-400' : 'text-white'}`}>
                  {formatCOP(credit.saldo_mora || 0)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Property Info Card */}
        {(credit.direccion_inmueble || credit.ciudad_inmueble || credit.valor_comercial) && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-2">
              <MapPin size={18} className="text-amber-400" />
              <h3 className="font-semibold text-white">Informacion del Inmueble</h3>
            </div>
            <div className="p-6 grid grid-cols-2 gap-6">
              {credit.direccion_inmueble && (
                <div className="col-span-2">
                  <span className="block text-sm text-slate-500 mb-1">Direccion</span>
                  <span className="text-lg font-medium text-white">{credit.direccion_inmueble}</span>
                </div>
              )}
              {credit.ciudad_inmueble && (
                <div>
                  <span className="block text-sm text-slate-500 mb-1">Ciudad</span>
                  <span className="text-lg font-medium text-white">{credit.ciudad_inmueble}</span>
                </div>
              )}
              {credit.tipo_inmueble && (
                <div>
                  <span className="block text-sm text-slate-500 mb-1">Tipo de Inmueble</span>
                  <span className="text-lg font-medium text-white capitalize">{credit.tipo_inmueble}</span>
                </div>
              )}
              {credit.valor_comercial && (
                <div>
                  <span className="block text-sm text-slate-500 mb-1">Avaluo Comercial</span>
                  <span className="text-lg font-medium text-teal-400">
                    {formatCOP(credit.valor_comercial)}
                  </span>
                </div>
              )}
              {credit.ltv != null && (
                <div>
                  <span className="block text-sm text-slate-500 mb-1">LTV</span>
                  <span className={`text-lg font-medium ${
                    credit.ltv > 70 ? 'text-red-400' :
                    credit.ltv > 50 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {credit.ltv.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Client Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-2">
            <User size={18} className="text-purple-400" />
            <h3 className="font-semibold text-white">Informacion del Deudor</h3>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-xl font-bold text-slate-400">
                {credit.profiles?.full_name?.charAt(0) || '?'}
              </div>
              <div className="min-w-0">
                <h4 className="font-medium text-white truncate">{credit.profiles?.full_name}</h4>
                <p className="text-sm text-slate-500 truncate">{credit.profiles?.email}</p>
              </div>
            </div>
            <div className="space-y-2.5">
              {credit.profiles?.document_id && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Cedula</span>
                  <span className="text-slate-300 font-mono">{credit.profiles.document_id}</span>
                </div>
              )}
              {credit.profiles?.phone && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Telefono</span>
                  <span className="text-slate-300">{credit.profiles.phone}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">ID Cliente</span>
                <span className="text-slate-300 font-mono text-xs">{credit.cliente_id?.substring(0, 8)}...</span>
              </div>
            </div>
          </div>
        </div>

        {/* Co-Debtor Info */}
        {credit.co_deudor_profile && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-2">
              <Users size={18} className="text-blue-400" />
              <h3 className="font-semibold text-white">Co-Deudor</h3>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-xl font-bold text-slate-400">
                  {credit.co_deudor_profile.full_name?.charAt(0) || '?'}
                </div>
                <div className="min-w-0">
                  <h4 className="font-medium text-white truncate">{credit.co_deudor_profile.full_name}</h4>
                  {credit.co_deudor_profile.email && (
                    <p className="text-sm text-slate-500 truncate">{credit.co_deudor_profile.email}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2.5">
                {credit.co_deudor_profile.document_id && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Cedula</span>
                    <span className="text-slate-300 font-mono">{credit.co_deudor_profile.document_id}</span>
                  </div>
                )}
                {credit.co_deudor_profile.phone && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Telefono</span>
                    <span className="text-slate-300">{credit.co_deudor_profile.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Fondeo & Inversionistas */}
        <FondeoCard credit={credit} />
      </div>
    </div>
  )
}

// ==================================================================
// Card: Fondeo progress + lista de inversionistas
// ==================================================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FondeoCard({ credit }: { credit: any }) {
  const formatCOP = (v: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inversiones = (credit.inversiones || []) as Array<any>
  const activas = inversiones.filter(i => i.estado === 'activo')
  const totalFondeado = activas.reduce((s, i) => s + (Number(i.monto_invertido) || 0), 0)
  const objetivo = Number(credit.monto_solicitado) || 0
  const progreso = objetivo > 0 ? Math.min((totalFondeado / objetivo) * 100, 100) : 0
  const completo = totalFondeado >= objetivo && objetivo > 0

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-2">
        <HandCoins size={18} className="text-emerald-400" />
        <h3 className="font-semibold text-white">Fondeo</h3>
        {completo && (
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Completo
          </span>
        )}
      </div>
      <div className="p-6 space-y-5">
        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Progreso</span>
            <span className="text-sm font-semibold text-white">{progreso.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${completo ? 'bg-emerald-500' : 'bg-teal-500'}`}
              style={{ width: `${progreso}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-500">
            <span>{formatCOP(totalFondeado)}</span>
            <span>Objetivo: {formatCOP(objetivo)}</span>
          </div>
          {!completo && objetivo > totalFondeado && (
            <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
              <TrendingUp size={12} />
              Falta por fondear: {formatCOP(objetivo - totalFondeado)}
            </p>
          )}
        </div>

        {/* Lista de inversionistas */}
        <div>
          <h4 className="text-sm font-semibold text-slate-300 mb-3">
            Inversionistas ({activas.length})
          </h4>
          {activas.length === 0 ? (
            <p className="text-sm text-slate-500 italic">Sin inversionistas aun</p>
          ) : (
            <div className="space-y-2">
              {activas.map((inv, idx) => {
                const inversionista = inv.inversionista || inv.profiles || {}
                const nombre = inversionista.full_name || 'Inversionista'
                const monto = Number(inv.monto_invertido) || 0
                const pct = objetivo > 0 ? (monto / objetivo) * 100 : 0
                return (
                  <div
                    key={inv.id ?? `inv-${idx}`}
                    className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0">
                        {nombre.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">{nombre}</p>
                        <p className="text-xs text-slate-500">{pct.toFixed(1)}% del total</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-emerald-400 whitespace-nowrap">
                      {formatCOP(monto)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
