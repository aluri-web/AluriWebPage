'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  KeyRound,
  Copy,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  UserCheck,
  Search,
} from 'lucide-react'

interface UserOption {
  id: string
  email: string
  full_name: string | null
  role: string
}

interface Credential {
  email: string
  password: string
  generated_at: string
  label: string
}

export default function DemoAccessPage() {
  // Demo section state
  const [demoCred, setDemoCred] = useState<Credential | null>(null)
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoError, setDemoError] = useState<string | null>(null)
  const [demoCopied, setDemoCopied] = useState(false)
  const [demoShow, setDemoShow] = useState(true)

  // User section state
  const [users, setUsers] = useState<UserOption[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null)
  const [userCred, setUserCred] = useState<Credential | null>(null)
  const [userLoading, setUserLoading] = useState(false)
  const [userError, setUserError] = useState<string | null>(null)
  const [userCopied, setUserCopied] = useState(false)
  const [userShow, setUserShow] = useState(true)

  useEffect(() => {
    async function loadUsers() {
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .order('full_name', { ascending: true })
      setUsers((data as UserOption[]) || [])
      setLoadingUsers(false)
    }
    loadUsers()
  }, [])

  const filteredUsers = users.filter(u => {
    if (!search) return false
    const q = search.toLowerCase()
    return (
      u.email?.toLowerCase().includes(q) ||
      u.full_name?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    )
  })

  async function generateDemoPassword() {
    setDemoLoading(true)
    setDemoError(null)
    setDemoCopied(false)
    try {
      const res = await fetch('/api/demo-access', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setDemoError(data.error || 'Error generando contraseña')
        return
      }
      setDemoCred({
        email: data.email,
        password: data.password,
        generated_at: data.generated_at,
        label: 'Acceso Demo Aluri',
      })
      setDemoShow(true)
    } catch {
      setDemoError('Error de conexion')
    } finally {
      setDemoLoading(false)
    }
  }

  async function generateUserPassword() {
    if (!selectedUser) return
    setUserLoading(true)
    setUserError(null)
    setUserCopied(false)
    try {
      const res = await fetch('/api/admin/generate-temp-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setUserError(data.error || 'Error generando contraseña')
        return
      }
      setUserCred({
        email: data.email,
        password: data.password,
        generated_at: data.generated_at,
        label: `Acceso Aluri — ${selectedUser.full_name || selectedUser.email}`,
      })
      setUserShow(true)
    } catch {
      setUserError('Error de conexion')
    } finally {
      setUserLoading(false)
    }
  }

  function copyCredsFactory(cred: Credential, setCopied: (v: boolean) => void, passwordOnly = false) {
    return () => {
      const text = passwordOnly
        ? cred.password
        : `${cred.label}\nCorreo: ${cred.email}\nContraseña: ${cred.password}`
      navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <header className="flex items-center gap-3">
        <div className="p-2 bg-amber-500/10 rounded-xl">
          <KeyRound size={24} className="text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Credenciales de Acceso</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Genera contraseñas temporales para la cuenta demo o para cualquier usuario
          </p>
        </div>
      </header>

      <div className="grid lg:grid-cols-2 gap-8 max-w-6xl">
        {/* =========================
            Seccion Demo
            ========================= */}
        <section className="space-y-5">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">Cuenta Demo</h2>
            <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded-lg">
              demo@aluri.co
            </span>
          </div>

          <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Como funciona</h3>
            <ol className="space-y-1.5 text-sm text-slate-400">
              <li className="flex gap-2"><span className="text-amber-400 font-semibold">1.</span> Genera una contraseña temporal</li>
              <li className="flex gap-2"><span className="text-amber-400 font-semibold">2.</span> Comparte las credenciales con el prospecto</li>
              <li className="flex gap-2"><span className="text-amber-400 font-semibold">3.</span> Al hacer login se invalida automaticamente</li>
            </ol>
          </div>

          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 space-y-5">
            {demoCred && (
              <CredentialCard
                cred={demoCred}
                show={demoShow}
                onToggle={() => setDemoShow(!demoShow)}
                onCopyAll={copyCredsFactory(demoCred, setDemoCopied)}
                onCopyPwd={copyCredsFactory(demoCred, setDemoCopied, true)}
                copied={demoCopied}
                passwordLabel="Contraseña (un solo uso)"
              />
            )}
            <button
              onClick={generateDemoPassword}
              disabled={demoLoading}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-black font-semibold rounded-xl transition-colors text-sm disabled:cursor-not-allowed"
            >
              {demoLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
              {demoCred ? 'Generar nueva contraseña' : 'Generar contraseña demo'}
            </button>
            {demoCred && (
              <p className="text-xs text-amber-500/70 text-center">
                Esta contraseña se invalidara despues del primer login
              </p>
            )}
            {demoError && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle size={14} />
                {demoError}
              </div>
            )}
          </div>
        </section>

        {/* =========================
            Seccion usuarios
            ========================= */}
        <section className="space-y-5">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">Usuario especifico</h2>
            <UserCheck size={16} className="text-emerald-400" />
          </div>

          <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Como funciona</h3>
            <ol className="space-y-1.5 text-sm text-slate-400">
              <li className="flex gap-2"><span className="text-emerald-400 font-semibold">1.</span> Busca y selecciona al usuario</li>
              <li className="flex gap-2"><span className="text-emerald-400 font-semibold">2.</span> Genera la contraseña temporal</li>
              <li className="flex gap-2"><span className="text-emerald-400 font-semibold">3.</span> Comparte las credenciales al usuario</li>
              <li className="flex gap-2"><span className="text-emerald-400 font-semibold">4.</span> Al hacer login, se le forzara a cambiar la contraseña</li>
            </ol>
          </div>

          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 space-y-5">
            {/* Search */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">Buscar usuario</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Nombre, correo o rol..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setSelectedUser(null)
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              {loadingUsers && (
                <p className="text-xs text-slate-500 mt-2">Cargando usuarios...</p>
              )}
              {search && !selectedUser && (
                <div className="mt-2 bg-slate-900 border border-slate-700 rounded-lg max-h-64 overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <p className="p-3 text-sm text-slate-500">Sin resultados</p>
                  ) : (
                    filteredUsers.slice(0, 20).map(u => (
                      <button
                        key={u.id}
                        onClick={() => {
                          setSelectedUser(u)
                          setSearch('')
                          setUserCred(null)
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-800 border-b border-slate-800 last:border-0"
                      >
                        <p className="text-sm text-white">{u.full_name || 'Sin nombre'}</p>
                        <p className="text-xs text-slate-500">{u.email} · {u.role}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Selected user */}
            {selectedUser && (
              <div className="bg-slate-900 border border-slate-600 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-white font-medium">{selectedUser.full_name || 'Sin nombre'}</p>
                  <p className="text-xs text-slate-500">{selectedUser.email} · {selectedUser.role}</p>
                </div>
                <button
                  onClick={() => { setSelectedUser(null); setUserCred(null) }}
                  className="text-xs text-slate-500 hover:text-slate-300"
                >
                  Cambiar
                </button>
              </div>
            )}

            {/* Credential display */}
            {userCred && (
              <CredentialCard
                cred={userCred}
                show={userShow}
                onToggle={() => setUserShow(!userShow)}
                onCopyAll={copyCredsFactory(userCred, setUserCopied)}
                onCopyPwd={copyCredsFactory(userCred, setUserCopied, true)}
                copied={userCopied}
                passwordLabel="Contraseña temporal"
              />
            )}

            <button
              onClick={generateUserPassword}
              disabled={userLoading || !selectedUser}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl transition-colors text-sm disabled:cursor-not-allowed"
            >
              {userLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
              {userCred ? 'Generar nueva contraseña' : 'Generar contraseña temporal'}
            </button>

            {userCred && (
              <p className="text-xs text-emerald-500/70 text-center">
                En el primer login el usuario debera establecer su contraseña definitiva
              </p>
            )}

            {userError && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle size={14} />
                {userError}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

// ============================================================
// Shared credential card
// ============================================================
function CredentialCard({
  cred,
  show,
  onToggle,
  onCopyAll,
  onCopyPwd,
  copied,
  passwordLabel,
}: {
  cred: Credential
  show: boolean
  onToggle: () => void
  onCopyAll: () => void
  onCopyPwd: () => void
  copied: boolean
  passwordLabel: string
}) {
  return (
    <div className="space-y-3">
      <div className="bg-slate-900 rounded-xl border border-slate-600 p-4">
        <span className="text-xs text-slate-500">Correo</span>
        <p className="text-slate-300 font-mono text-sm">{cred.email}</p>

        <div className="flex items-center justify-between mt-4 mb-2">
          <span className="text-xs text-slate-500">{passwordLabel}</span>
          <button onClick={onToggle} className="text-slate-500 hover:text-slate-300">
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <p className="text-amber-400 font-mono text-lg tracking-wider">
          {show ? cred.password : '••••••••'}
        </p>

        {cred.generated_at && (
          <p className="text-xs text-slate-600 mt-3">
            Generada: {new Date(cred.generated_at).toLocaleString('es-CO')}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onCopyAll}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors text-sm"
        >
          {copied ? <CheckCircle size={16} className="text-emerald-400" /> : <Copy size={16} />}
          {copied ? 'Copiado' : 'Copiar credenciales'}
        </button>
        <button
          onClick={onCopyPwd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors text-sm"
          title="Copiar solo contraseña"
        >
          <Copy size={16} />
        </button>
      </div>
    </div>
  )
}
