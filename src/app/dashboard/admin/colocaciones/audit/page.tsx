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
  const [fixResult, setFixResult] = useState<string[] | null>(null)

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
      setFixResult(result.details)
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
      setFixResult(result.details)
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
            <h1 className="text-3xl font-bold text-white">Auditoria de Saldos</h1>
            <p className="text-slate-400 mt-1">
              Verifica saldo_capital, saldo_capital_esperado, intereses y mora
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
          {loading ? 'Verificando...' : 'Ejecutar Auditoria'}
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

      {fixResult && fixResult.length > 0 && (
        <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 font-medium mb-2">
            <CheckCircle size={18} />
            Correcciones aplicadas:
          </div>
          {fixResult.map((detail, i) => (
            <p key={i} className="text-emerald-400/80 text-sm font-mono">{detail}</p>
          ))}
        </div>
      )}

      {/* Info box */}
      <div className="mb-6 p-4 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-slate-400 space-y-1">
        <p><strong className="text-slate-300">Capital Esperado</strong>: base para calculo de intereses en la causacion diaria. Debe iniciar igual al monto financiado.</p>
        <p><strong className="text-amber-400">Si capital_esperado esta mal</strong>: al corregir se eliminan las causaciones incorrectas y el cron las recalcula.</p>
      </div>

      {/* Results */}
      {discrepancies !== null && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <p className="text-slate-400 text-sm mb-1">Creditos Verificados</p>
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
            <div className="space-y-4">
              {discrepancies.map((d) => (
                <div key={d.credito_id} className="bg-slate-900 rounded-xl border border-slate-800 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 bg-slate-800 text-teal-400 text-sm font-mono rounded">{d.codigo}</span>
                      <span className="text-white font-medium">{d.propietario}</span>
                      <span className="text-slate-500 text-sm">Financiado: {formatCOP(d.monto_financiado)}</span>
                    </div>
                    <button
                      onClick={() => handleFixOne(d.credito_id)}
                      disabled={fixing}
                      className="px-4 py-2 bg-amber-500/20 text-amber-400 text-sm font-medium rounded-lg hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                    >
                      {fixing ? 'Corrigiendo...' : 'Corregir'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Capital */}
                    <div className={`p-3 rounded-lg ${d.diff_capital !== 0 ? 'bg-red-500/5 border border-red-500/20' : 'bg-slate-800/50'}`}>
                      <p className="text-xs text-slate-400 mb-1">Capital</p>
                      <p className="text-sm text-slate-300">BD: {formatCOP(d.db_saldo_capital)}</p>
                      <p className="text-sm text-teal-400">Calc: {formatCOP(d.calc_saldo_capital)}</p>
                      {d.diff_capital !== 0 && (
                        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                          <AlertTriangle size={10} /> {formatCOP(d.diff_capital)}
                        </p>
                      )}
                    </div>

                    {/* Capital Esperado */}
                    <div className={`p-3 rounded-lg ${d.diff_capital_esperado !== 0 ? 'bg-red-500/5 border border-red-500/20' : 'bg-slate-800/50'}`}>
                      <p className="text-xs text-slate-400 mb-1">Capital Esperado</p>
                      <p className="text-sm text-slate-300">BD: {formatCOP(d.db_saldo_capital_esperado)}</p>
                      <p className="text-sm text-teal-400">Calc: {formatCOP(d.calc_saldo_capital_esperado)}</p>
                      {d.diff_capital_esperado !== 0 && (
                        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                          <AlertTriangle size={10} /> {formatCOP(d.diff_capital_esperado)} — causaciones seran recalculadas
                        </p>
                      )}
                    </div>

                    {/* Intereses */}
                    <div className={`p-3 rounded-lg ${d.diff_intereses !== 0 ? 'bg-red-500/5 border border-red-500/20' : 'bg-slate-800/50'}`}>
                      <p className="text-xs text-slate-400 mb-1">Intereses</p>
                      <p className="text-sm text-slate-300">BD: {formatCOP(d.db_saldo_intereses)}</p>
                      <p className="text-sm text-teal-400">Calc: {formatCOP(d.calc_saldo_intereses)}</p>
                      {d.diff_intereses !== 0 && (
                        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                          <AlertTriangle size={10} /> {formatCOP(d.diff_intereses)}
                        </p>
                      )}
                    </div>

                    {/* Mora */}
                    <div className={`p-3 rounded-lg ${d.diff_mora !== 0 ? 'bg-red-500/5 border border-red-500/20' : 'bg-slate-800/50'}`}>
                      <p className="text-xs text-slate-400 mb-1">Mora</p>
                      <p className="text-sm text-slate-300">BD: {formatCOP(d.db_saldo_mora)}</p>
                      <p className="text-sm text-teal-400">Calc: {formatCOP(d.calc_saldo_mora)}</p>
                      {d.diff_mora !== 0 && (
                        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                          <AlertTriangle size={10} /> {formatCOP(d.diff_mora)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
