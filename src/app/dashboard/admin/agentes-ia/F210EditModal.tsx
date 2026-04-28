'use client'

import { useState } from 'react'
import { X, RefreshCw, AlertTriangle } from 'lucide-react'

export interface F210Casillas {
  total_assets_cop?: number
  total_liabilities_cop?: number
  net_patrimony?: number
}

interface Props {
  open: boolean
  evaluationId: string
  initial: F210Casillas
  /** Identifica de quién es el F210 que estamos validando */
  which?: 'solicitante' | 'codeudor'
  /** Nombre legible para mostrar en el header */
  personName?: string
  onClose: () => void
  onSuccess: () => void
}

function fmtCOP(n: number | undefined): string {
  if (n == null || isNaN(n)) return ''
  return n.toLocaleString('es-CO')
}

function parseCOP(s: string): number {
  const cleaned = s.replace(/[^\d-]/g, '')
  return cleaned ? Number(cleaned) : 0
}

export default function F210EditModal({ open, evaluationId, initial, which = 'solicitante', personName, onClose, onSuccess }: Props) {
  const [activos, setActivos] = useState<string>(fmtCOP(initial.total_assets_cop))
  const [deudas, setDeudas] = useState<string>(fmtCOP(initial.total_liabilities_cop))
  const [liquido, setLiquido] = useState<string>(fmtCOP(initial.net_patrimony))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const aNum = parseCOP(activos)
  const dNum = parseCOP(deudas)
  const lNum = parseCOP(liquido)
  const expectedLiquido = aNum - dNum
  const mathOk = Math.abs(expectedLiquido - lNum) < 1000

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/orchestrator/recompute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluationId,
          which,
          credito_overrides: {
            tax_return: {
              total_assets_cop: aNum,
              total_liabilities_cop: dNum,
              net_patrimony: lNum,
              declared_debts: dNum, // mantenemos la referencia consistente
            },
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'Error al recalcular')
        return
      }
      onSuccess()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  function autoCompute() {
    setLiquido(fmtCOP(aNum - dNum))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-white">Validar declaración de renta (F210)</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {which === 'codeudor' ? 'Codeudor' : 'Solicitante'}
              {personName ? ` — ${personName}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white" disabled={submitting}>
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-400">
            El sistema extrajo estos valores del F210 del <strong>{which === 'codeudor' ? 'codeudor' : 'solicitante'}</strong> automáticamente.
            Si alguno está mal, corrígelo y haz click en <strong>Recalcular</strong>. La ficha y los anexos se regenerarán con los valores corregidos.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Casilla 29 — Patrimonio bruto (activos)</label>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">$</span>
                <input
                  type="text"
                  value={activos}
                  onChange={e => setActivos(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
                  placeholder="1,866,650,000"
                  disabled={submitting}
                />
                <span className="text-slate-400 text-xs">COP</span>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Casilla 30 — Deudas</label>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">$</span>
                <input
                  type="text"
                  value={deudas}
                  onChange={e => setDeudas(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
                  placeholder="1,662,692,000"
                  disabled={submitting}
                />
                <span className="text-slate-400 text-xs">COP</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-400">Casilla 31 — Patrimonio líquido</label>
                <button
                  type="button"
                  onClick={autoCompute}
                  className="text-xs text-emerald-400 hover:text-emerald-300"
                  disabled={submitting}
                >
                  = Activos − Deudas
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">$</span>
                <input
                  type="text"
                  value={liquido}
                  onChange={e => setLiquido(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
                  placeholder="203,958,000"
                  disabled={submitting}
                />
                <span className="text-slate-400 text-xs">COP</span>
              </div>
            </div>
          </div>

          {!mathOk && aNum > 0 && (
            <div className="flex items-start gap-2 text-amber-400 text-xs bg-amber-950/30 border border-amber-800/50 rounded p-3">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              <span>
                La suma no cuadra: activos − deudas = ${fmtCOP(expectedLiquido)} COP, pero
                el patrimonio líquido capturado es ${fmtCOP(lNum)} COP. Verifica los valores.
              </span>
            </div>
          )}

          {error && (
            <div className="text-red-400 text-xs bg-red-950/30 border border-red-800/50 rounded p-3">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-700">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-slate-300 hover:text-white text-sm disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || aNum <= 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {submitting ? 'Recalculando…' : 'Recalcular ficha y anexos'}
          </button>
        </div>
      </div>
    </div>
  )
}
