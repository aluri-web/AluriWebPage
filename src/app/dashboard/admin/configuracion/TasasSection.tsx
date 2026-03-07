'use client'

import { useState } from 'react'
import { TrendingUp, Plus, Trash2, Check, X, Loader2 } from 'lucide-react'
import { createTasa, deleteTasa } from './actions'

interface Tasa {
  id: string
  tipo: string
  tasa_ea: number
  vigencia_desde: string
  vigencia_hasta: string
}

interface TasasSectionProps {
  initialTasas: Tasa[]
}

const TIPO_LABELS: Record<string, string> = {
  usura_consumo: 'Usura Consumo',
  ibc_consumo: 'IBC Consumo',
  usura_microcredito: 'Usura Microcrédito',
  ibc_microcredito: 'IBC Microcrédito',
}

const TIPO_COLORS: Record<string, string> = {
  usura_consumo: 'bg-red-500/10 text-red-400',
  ibc_consumo: 'bg-blue-500/10 text-blue-400',
  usura_microcredito: 'bg-orange-500/10 text-orange-400',
  ibc_microcredito: 'bg-sky-500/10 text-sky-400',
}

export default function TasasSection({ initialTasas }: TasasSectionProps) {
  const [tasas, setTasas] = useState<Tasa[]>(initialTasas)
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form state
  const [tipo, setTipo] = useState('usura_consumo')
  const [tasaEa, setTasaEa] = useState('')
  const [vigenciaDesde, setVigenciaDesde] = useState('')
  const [vigenciaHasta, setVigenciaHasta] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const formData = new FormData()
    formData.append('tipo', tipo)
    formData.append('tasa_ea', tasaEa)
    formData.append('vigencia_desde', vigenciaDesde)
    formData.append('vigencia_hasta', vigenciaHasta)

    const result = await createTasa(formData)

    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: result.message || 'Tasa agregada' })
      // Add to local state
      setTasas(prev => [{
        id: crypto.randomUUID(),
        tipo,
        tasa_ea: parseFloat(tasaEa),
        vigencia_desde: vigenciaDesde,
        vigencia_hasta: vigenciaHasta,
      }, ...prev])
      setTasaEa('')
      setVigenciaDesde('')
      setVigenciaHasta('')
    }

    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta tasa?')) return

    setDeleteLoading(id)
    const result = await deleteTasa(id)

    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setTasas(prev => prev.filter(t => t.id !== id))
      setMessage({ type: 'success', text: 'Tasa eliminada' })
    }

    setDeleteLoading(null)
  }

  const formatDate = (d: string) => {
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-cyan-500/10 rounded-xl">
          <TrendingUp size={20} className="text-cyan-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Tasas Oficiales SFC</h2>
          <p className="text-xs text-slate-400">Tasas de la Superintendencia Financiera para cálculo de mora</p>
        </div>
      </div>

      {/* Tabla de tasas */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 border-b border-slate-700">
              <th className="text-left py-2 px-3 font-medium">Tipo</th>
              <th className="text-right py-2 px-3 font-medium">Tasa EA%</th>
              <th className="text-left py-2 px-3 font-medium">Desde</th>
              <th className="text-left py-2 px-3 font-medium">Hasta</th>
              <th className="text-right py-2 px-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {tasas.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-slate-500">
                  No hay tasas registradas
                </td>
              </tr>
            ) : (
              tasas.map(t => (
                <tr key={t.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="py-2.5 px-3">
                    <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-medium ${TIPO_COLORS[t.tipo] || 'bg-slate-600 text-slate-300'}`}>
                      {TIPO_LABELS[t.tipo] || t.tipo}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-white font-mono">
                    {t.tasa_ea}%
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">
                    {formatDate(t.vigencia_desde)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">
                    {formatDate(t.vigencia_hasta)}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => handleDelete(t.id)}
                      disabled={deleteLoading === t.id}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deleteLoading === t.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Formulario agregar tasa */}
      <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-slate-700">
        <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
          <Plus size={14} />
          Agregar nueva tasa
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="usura_consumo">Usura Consumo</option>
              <option value="ibc_consumo">IBC Consumo</option>
              <option value="usura_microcredito">Usura Microcrédito</option>
              <option value="ibc_microcredito">IBC Microcrédito</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Tasa EA (%)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={tasaEa}
              onChange={(e) => setTasaEa(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              placeholder="Ej: 25.52"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Vigencia desde</label>
            <input
              type="date"
              value={vigenciaDesde}
              onChange={(e) => setVigenciaDesde(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Vigencia hasta</label>
            <input
              type="date"
              value={vigenciaHasta}
              onChange={(e) => setVigenciaHasta(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              required
            />
          </div>
        </div>

        {message && (
          <div className={`flex items-center gap-2 text-sm ${message.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
            {message.type === 'success' ? <Check size={14} /> : <X size={14} />}
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-black font-semibold text-sm rounded-xl transition-colors"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Plus size={14} />
              Agregar Tasa
            </>
          )}
        </button>
      </form>
    </div>
  )
}
