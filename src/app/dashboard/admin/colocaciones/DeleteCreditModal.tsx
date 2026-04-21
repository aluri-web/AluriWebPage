'use client'

import { useState, useEffect } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { getCreditDeleteInfo, deleteCredit } from './actions'

interface DeleteCreditModalProps {
  creditId: string
  isOpen: boolean
  onClose: () => void
}

const MOTIVOS = [
  { value: 'falta_fondeo', label: 'Falta de fondeo' },
  { value: 'cliente_desistio', label: 'Cliente desistió' },
  { value: 'documentos_incompletos', label: 'Documentos incompletos' },
  { value: 'no_aprobado_comite', label: 'No aprobado por comité' },
  { value: 'garantia_rechazada', label: 'Garantía rechazada' },
  { value: 'riesgo', label: 'Por perfil de riesgo' },
  { value: 'otro', label: 'Otro' },
]

export default function DeleteCreditModal({ creditId, isOpen, onClose }: DeleteCreditModalProps) {
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [confirmCode, setConfirmCode] = useState('')
  const [motivo, setMotivo] = useState('')
  const [detalle, setDetalle] = useState('')
  const [info, setInfo] = useState<{
    code: string
    debtor_name: string | null
    plan_pagos: number
    transacciones: number
    inversiones: number
  } | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    setError(null)
    setSuccess(false)
    setConfirmCode('')
    setMotivo('')
    setDetalle('')

    getCreditDeleteInfo(creditId).then(({ data, error: fetchError }) => {
      if (fetchError || !data) {
        setError(fetchError || 'No se pudo cargar la informacion.')
        setLoading(false)
        return
      }
      setInfo(data)
      setLoading(false)
    })
  }, [isOpen, creditId])

  const handleDelete = async () => {
    if (!info || confirmCode !== info.code || !motivo) return
    setProcessing(true)
    setError(null)

    const result = await deleteCredit(creditId, { motivo, detalle: detalle.trim() || null })

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      setTimeout(() => onClose(), 1500)
    }
    setProcessing(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Marcar como No Colocado</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-slate-400">Cargando...</div>
        ) : success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-emerald-400 font-medium">Crédito marcado como No Colocado</p>
          </div>
        ) : info ? (
          <div className="space-y-5">
            {/* Warning */}
            <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <AlertTriangle size={24} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-400 font-medium">El crédito pasará a estado No Colocado</p>
                <p className="text-amber-400/70 text-sm mt-1">
                  Las inversiones activas serán canceladas y se notificará al propietario y a los inversionistas. El crédito permanecerá en el historial.
                </p>
              </div>
            </div>

            {/* Credit info */}
            <div className="bg-slate-900/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Crédito</span>
                <span className="text-white font-mono font-medium">{info.code}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Deudor</span>
                <span className="text-white">{info.debtor_name || 'Desconocido'}</span>
              </div>
              {info.inversiones > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Inversiones que se cancelarán</span>
                  <span className="text-amber-400 font-medium">{info.inversiones}</span>
                </div>
              )}
            </div>

            {/* Motivo dropdown */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">Motivo *</label>
              <select
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="">Selecciona un motivo...</option>
                {MOTIVOS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Detalle opcional */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">Comentario (opcional)</label>
              <textarea
                value={detalle}
                onChange={(e) => setDetalle(e.target.value)}
                placeholder="Detalles adicionales sobre el motivo..."
                rows={2}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Confirmation input */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">
                Escribe <span className="font-mono font-bold text-amber-400">{info.code}</span> para confirmar:
              </label>
              <input
                type="text"
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                placeholder={info.code}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={processing || confirmCode !== info.code || !motivo}
                className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-600/30 disabled:text-amber-400/50 text-white font-semibold rounded-lg transition-colors"
              >
                {processing ? 'Procesando...' : 'No Colocar'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
