'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  ShieldCheck,
  ShieldOff,
  Loader2,
  CheckCircle,
  AlertCircle,
  Copy,
  QrCode,
} from 'lucide-react'

type MfaStatus = 'loading' | 'not_enrolled' | 'enrolling' | 'enrolled'

export default function SeguridadPage() {
  const supabase = createClient()
  const [status, setStatus] = useState<MfaStatus>('loading')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [unenrolling, setUnenrolling] = useState(false)

  useEffect(() => {
    checkMfaStatus()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function checkMfaStatus() {
    setStatus('loading')
    const { data: factors } = await supabase.auth.mfa.listFactors()
    const verifiedTotp = factors?.totp?.find(f => f.status === 'verified')

    if (verifiedTotp) {
      setFactorId(verifiedTotp.id)
      setStatus('enrolled')
    } else {
      setStatus('not_enrolled')
    }
  }

  async function startEnrollment() {
    setError(null)
    setStatus('enrolling')

    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Aluri Admin TOTP',
    })

    if (enrollError || !data) {
      setError('Error al iniciar la configuración de 2FA')
      setStatus('not_enrolled')
      return
    }

    setFactorId(data.id)
    setQrCode(data.totp.qr_code)
    setSecret(data.totp.secret)
  }

  async function confirmEnrollment() {
    if (!factorId || verifyCode.length !== 6) return
    setLoading(true)
    setError(null)

    try {
      // Challenge + verify to complete enrollment
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      })

      if (challengeError || !challenge) {
        setError('Error al crear desafío de verificación')
        setLoading(false)
        return
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: verifyCode,
      })

      if (verifyError) {
        setError('Código incorrecto. Intenta de nuevo.')
        setVerifyCode('')
        setLoading(false)
        return
      }

      setSuccess('2FA activado correctamente')
      setQrCode(null)
      setSecret(null)
      setVerifyCode('')
      setStatus('enrolled')
    } catch {
      setError('Error de verificación')
    }

    setLoading(false)
  }

  async function unenrollMfa() {
    if (!factorId) return
    setUnenrolling(true)
    setError(null)

    const { error: unenrollError } = await supabase.auth.mfa.unenroll({
      factorId,
    })

    if (unenrollError) {
      setError('Error al desactivar 2FA. Puede requerir re-autenticación.')
      setUnenrolling(false)
      return
    }

    setSuccess('2FA desactivado correctamente')
    setFactorId(null)
    setStatus('not_enrolled')
    setUnenrolling(false)
  }

  function copySecret() {
    if (secret) {
      navigator.clipboard.writeText(secret)
      setSuccess('Clave secreta copiada al portapapeles')
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <header className="flex items-center gap-3">
        <div className="p-2 bg-amber-500/10 rounded-xl">
          <ShieldCheck size={24} className="text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Seguridad</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Autenticación de dos factores (2FA) para tu cuenta
          </p>
        </div>
      </header>

      <div className="max-w-xl">
        {/* Status Card */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
          {status === 'loading' && (
            <div className="flex items-center gap-3 text-slate-400">
              <Loader2 size={20} className="animate-spin" />
              Verificando estado de 2FA...
            </div>
          )}

          {/* Not Enrolled */}
          {status === 'not_enrolled' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <ShieldOff size={20} className="text-slate-400" />
                <div>
                  <h2 className="text-white font-semibold">2FA no activado</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Protege tu cuenta con un segundo factor de autenticación usando una app como Google Authenticator o Authy.
                  </p>
                </div>
              </div>

              <button
                onClick={startEnrollment}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl transition-colors text-sm"
              >
                <ShieldCheck size={16} />
                Activar 2FA
              </button>
            </div>
          )}

          {/* Enrolling */}
          {status === 'enrolling' && qrCode && (
            <div className="space-y-6">
              <div>
                <h2 className="text-white font-semibold mb-2">Configurar 2FA</h2>
                <p className="text-sm text-slate-400">
                  Escanea el código QR con tu app autenticadora, luego ingresa el código de 6 dígitos para confirmar.
                </p>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center gap-4">
                <div className="bg-white p-4 rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCode} alt="QR Code para 2FA" width={200} height={200} />
                </div>

                {/* Manual secret */}
                {secret && (
                  <div className="flex items-center gap-2">
                    <QrCode size={14} className="text-slate-400" />
                    <span className="text-xs text-slate-400">No puedes escanear?</span>
                    <button
                      onClick={copySecret}
                      className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300"
                    >
                      <Copy size={12} />
                      Copiar clave
                    </button>
                  </div>
                )}
              </div>

              {/* Verify Input */}
              <div className="space-y-3">
                <label className="text-sm text-slate-300">Código de verificación</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={verifyCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                      setVerifyCode(val)
                      setError(null)
                    }}
                    placeholder="000000"
                    className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white text-center font-mono text-lg tracking-widest focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={confirmEnrollment}
                    disabled={verifyCode.length !== 6 || loading}
                    className="px-5 py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-black font-semibold rounded-lg transition-colors text-sm disabled:cursor-not-allowed"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : 'Confirmar'}
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  setStatus('not_enrolled')
                  setQrCode(null)
                  setSecret(null)
                  setVerifyCode('')
                }}
                className="text-xs text-slate-500 hover:text-slate-400"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Enrolled */}
          {status === 'enrolled' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle size={20} className="text-emerald-400" />
                <div>
                  <h2 className="text-white font-semibold">2FA activado</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Tu cuenta está protegida con autenticación de dos factores. Se te pedirá un código cada vez que inicies sesión.
                  </p>
                </div>
              </div>

              <button
                onClick={unenrollMfa}
                disabled={unenrolling}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors text-sm disabled:opacity-50"
              >
                {unenrolling ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ShieldOff size={14} />
                )}
                Desactivar 2FA
              </button>
            </div>
          )}

          {/* Error / Success Messages */}
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm mt-4">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 text-emerald-400 text-sm mt-4">
              <CheckCircle size={14} />
              {success}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
