'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { ShieldCheck, Loader2, AlertCircle } from 'lucide-react'

const CODE_LENGTH = 6

export default function MfaVerifyPage() {
  const router = useRouter()
  const supabase = createClient()
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [factorId, setFactorId] = useState<string | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // On mount, check if user has MFA factors and is at AAL1
  useEffect(() => {
    async function checkMfa() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }

      const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

      // Already AAL2, go to dashboard
      if (assurance?.currentLevel === 'aal2') {
        router.replace('/dashboard/admin/colocaciones')
        return
      }

      // Find TOTP factor
      const totpFactor = assurance?.currentAuthenticationMethods?.length
        ? null
        : null

      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totp = factors?.totp?.find(f => f.status === 'verified')

      if (!totp) {
        // No MFA enrolled, shouldn't be here
        router.replace('/dashboard/admin/colocaciones')
        return
      }

      setFactorId(totp.id)
    }

    checkMfa()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return

    const newCode = [...code]
    newCode[index] = value.slice(-1)
    setCode(newCode)
    setError(null)

    // Auto-focus next input
    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all digits filled
    if (newCode.every(d => d !== '') && newCode.join('').length === CODE_LENGTH) {
      verifyCode(newCode.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH)
    if (pasted.length === CODE_LENGTH) {
      const newCode = pasted.split('')
      setCode(newCode)
      verifyCode(pasted)
    }
  }

  const verifyCode = async (fullCode: string) => {
    if (!factorId || loading) return
    setLoading(true)
    setError(null)

    try {
      // Create a challenge
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      })

      if (challengeError || !challenge) {
        setError('Error al crear desafío de verificación')
        setLoading(false)
        return
      }

      // Verify the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: fullCode,
      })

      if (verifyError) {
        setError('Código incorrecto. Intenta de nuevo.')
        setCode(Array(CODE_LENGTH).fill(''))
        inputRefs.current[0]?.focus()
        setLoading(false)
        return
      }

      // Success — redirect to admin dashboard
      router.replace('/dashboard/admin/colocaciones')
    } catch {
      setError('Error de verificación')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 shadow-xl">
          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="p-3 bg-amber-500/10 rounded-xl mb-4">
              <ShieldCheck size={32} className="text-amber-400" />
            </div>
            <h1 className="text-xl font-bold text-white">Verificación 2FA</h1>
            <p className="text-sm text-slate-400 mt-2 text-center">
              Ingresa el código de 6 dígitos de tu app autenticadora
            </p>
          </div>

          {/* Code Input */}
          <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInput(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={loading}
                autoFocus={i === 0}
                className={`w-12 h-14 text-center text-xl font-mono font-bold rounded-lg border-2 bg-slate-900 text-white
                  focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500
                  disabled:opacity-50 transition-colors
                  ${error ? 'border-red-500/50' : 'border-slate-600'}
                `}
              />
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm mb-4 justify-center">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center gap-2 text-amber-400 text-sm justify-center mb-4">
              <Loader2 size={14} className="animate-spin" />
              Verificando...
            </div>
          )}

          {/* Help text */}
          <p className="text-xs text-slate-500 text-center mt-6">
            Abre Google Authenticator, Authy o tu app de autenticación y copia el código de 6 dígitos.
          </p>
        </div>
      </div>
    </div>
  )
}
