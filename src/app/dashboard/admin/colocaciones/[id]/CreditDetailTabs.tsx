'use client'

import { useState } from 'react'
import { Settings, Eye, CreditCard, User, MapPin } from 'lucide-react'
import CreditWorkflow from '../CreditWorkflow'
import InvestorViewTab from './InvestorViewTab'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function CreditDetailTabs({ credit }: { credit: any }) {
  const [activeTab, setActiveTab] = useState<'admin' | 'investor'>('admin')

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
      </div>

      {/* Tab Content */}
      {activeTab === 'admin' ? (
        <AdminViewContent credit={credit} />
      ) : (
        <InvestorViewTab credit={credit} />
      )}
    </>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AdminViewContent({ credit }: { credit: any }) {
  const formatCOP = (value: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)

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
            <h3 className="font-semibold text-white">Informacion del Cliente</h3>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-xl font-bold text-slate-400">
                {credit.profiles?.full_name?.charAt(0) || '?'}
              </div>
              <div>
                <h4 className="font-medium text-white">{credit.profiles?.full_name}</h4>
                <p className="text-sm text-slate-500">{credit.profiles?.email}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">ID Cliente</span>
                <span className="text-slate-300 font-mono text-xs">{credit.cliente_id?.substring(0, 8)}...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
