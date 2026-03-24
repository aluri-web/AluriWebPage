'use client'

import { useState } from 'react'
import { ShieldCheck, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react'
import { auditSaldos, fixSaldos, SaldoDiscrepancy } from '../actions'

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export default function AuditSaldosPage() {
  const [loading, setLoading] = useState(false)
  const [fixing, setFixing] = useState(false)
  const [discrepancies, setDiscrepancies] = useState<SaldoDiscrepancy[] | null>(null)
  const [totalChecked, setTotalChecked] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [fixResult, setFixResult] = useState<string | null>(null)

  const runAudit = async () => {
    setLoading(true)
    setError(null)
    setFixResult(null)
    const result = await auditSaldos()
    if (result.error) {
      setError(result.error)
    } else {
      setDiscrepancies(result.discrepancies)
      setTotalChecked(result.total_checked)
    }
    setLoading(false)
  }

  const handleFixAll = async () => {
    if (!discrepancies || discrepancies.length === 0) return
    setFixing(true)
    setFixResult(null)
    const result = await fixSaldos()
    if (result.error) {
      setError(result.error)
    } else {
      setFixResult(`${result.fixed} créditos corregidos exitosamente`)
      // Re-run audit
      await runAudit()
    }
    setFixing(false)
  }

  const handleFixOne = async (creditoId: string) => {
    setFixing(true)
    const result = await fixSaldos([creditoId])
    if (result.error) {
      setError(result.error)
    } else {
      setFixResult(`Crédito corregido exitosamente`)
      await runAudit()
    }
    setFixing(false)
  }

  return (
    <div className="text-white p-8">
      <header className="mb-8 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 rounded-xl">
            <ShieldCheck className="text-amber-400" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Auditoría de Saldos</h1>
            <p className="text-slate-400 mt-1">
              Verifica que los saldos de capital, intereses y mora sean correctos
            </p>
          </div>
        </div>
      </header>

      {/* Run Audit Button */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={runAudit}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-teal-500 hover:bg-teal-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Verificando...' : 'Ejecutar Auditoría'}
        </button>

        {discrepancies && discrepancies.length > 0 && (
          <button
            onClick={handleFixAll}
            disabled={fixing}
            className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-black font-medium rounded-lg transition-colors"
          >
            {fixing ? 'Corrigiendo...' : `Corregir Todos (${discrepancies.length})`}
          </button>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {fixResult && (
        <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 flex items-center gap-2">
          <CheckCircle size={18} />
          {fixResult}
        </div>
      )}

      {/* Results */}
      {discrepancies !== null && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <p className="text-slate-400 text-sm mb-1">Créditos Verificados</p>
              <p className="text-2xl font-bold text-white">{totalChecked}</p>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <p className="text-slate-400 text-sm mb-1">Con Discrepancia</p>
              <p className={`text-2xl font-bold ${discrepancies.length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {discrepancies.length}
              </p>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <p className="text-slate-400 text-sm mb-1">Correctos</p>
              <p className="text-2xl font-bold text-emerald-400">{totalChecked - discrepancies.length}</p>
            </div>
          </div>

          {discrepancies.length === 0 ? (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-8 text-center">
              <CheckCircle size={48} className="text-emerald-400 mx-auto mb-3" />
              <p className="text-emerald-400 text-lg font-medium">Todos los saldos son correctos</p>
            </div>
          ) : (
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-800/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Crédito</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Propietario</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Financiado</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Capital BD</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Capital Calc</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Δ Capital</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Intereses BD</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Intereses Calc</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Δ Intereses</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Mora BD</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Mora Calc</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Δ Mora</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {discrepancies.map((d) => (
                      <tr key={d.credito_id} className="hover:bg-slate-800/30">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-1 bg-slate-800 text-teal-400 text-xs font-mono rounded">{d.codigo}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-white">{d.propietario}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-slate-300">{formatCOP(d.monto_financiado)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-slate-300">{formatCOP(d.db_saldo_capital)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-teal-400 font-medium">{formatCOP(d.calc_saldo_capital)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                          {d.diff_capital !== 0 && (
                            <span className={d.diff_capital > 0 ? 'text-red-400' : 'text-amber-400'}>
                              <AlertTriangle size={12} className="inline mr-1" />
                              {formatCOP(d.diff_capital)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-slate-300">{formatCOP(d.db_saldo_intereses)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-teal-400 font-medium">{formatCOP(d.calc_saldo_intereses)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                          {d.diff_intereses !== 0 && (
                            <span className={d.diff_intereses > 0 ? 'text-red-400' : 'text-amber-400'}>
                              <AlertTriangle size={12} className="inline mr-1" />
                              {formatCOP(d.diff_intereses)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-slate-300">{formatCOP(d.db_saldo_mora)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-teal-400 font-medium">{formatCOP(d.calc_saldo_mora)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                          {d.diff_mora !== 0 && (
                            <span className={d.diff_mora > 0 ? 'text-red-400' : 'text-amber-400'}>
                              <AlertTriangle size={12} className="inline mr-1" />
                              {formatCOP(d.diff_mora)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleFixOne(d.credito_id)}
                            disabled={fixing}
                            className="px-3 py-1.5 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-lg hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                          >
                            Corregir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
