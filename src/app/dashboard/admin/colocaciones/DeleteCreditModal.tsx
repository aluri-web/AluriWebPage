'use client'

import { useState, useEffect } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { getCreditDeleteInfo, deleteCredit } from './actions'

interface DeleteCreditModalProps {
  creditId: string
  isOpen: boolean
  onClose: () => void
}

export default function DeleteCreditModal({ creditId, isOpen, onClose }: DeleteCreditModalProps) {
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [confirmCode, setConfirmCode] = useState('')
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
    if (!info || confirmCode !== info.code) return
    setDeleting(true)
    setError(null)

    const result = await deleteCredit(creditId)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      setTimeout(() => onClose(), 1500)
    }
    setDeleting(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Eliminar Credito</h2>
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
            <p className="text-emerald-400 font-medium">Credito eliminado exitosamente</p>
          </div>
        ) : info ? (
          <div className="space-y-5">
            {/* Warning */}
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertTriangle size={24} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-medium">Esta accion es irreversible</p>
                <p className="text-red-400/70 text-sm mt-1">
                  Se eliminara permanentemente el credito y todos sus registros asociados. El codigo {info.code} quedara libre para reutilizar.
                </p>
              </div>
            </div>

            {/* Credit info */}
            <div className="bg-slate-900/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Credito</span>
                <span className="text-white font-mono font-medium">{info.code}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Deudor</span>
                <span className="text-white">{info.debtor_name || 'Desconocido'}</span>
              </div>
            </div>

            {/* What will be deleted */}
            <div className="bg-slate-900/50 rounded-lg p-4 space-y-2">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Se eliminaran:</p>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Cuotas del plan de pagos</span>
                <span className="text-amber-400 font-medium">{info.plan_pagos}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Transacciones</span>
                <span className="text-amber-400 font-medium">{info.transacciones}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Inversiones</span>
                <span className="text-amber-400 font-medium">{info.inversiones}</span>
              </div>
            </div>

            {/* Confirmation input */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">
                Escribe <span className="font-mono font-bold text-red-400">{info.code}</span> para confirmar:
              </label>
              <input
                type="text"
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                placeholder={info.code}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                disabled={deleting || confirmCode !== info.code}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/30 disabled:text-red-400/50 text-white font-semibold rounded-lg transition-colors"
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
