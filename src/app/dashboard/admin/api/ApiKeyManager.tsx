'use client'

import { useState, useEffect } from 'react'
import { Key, Plus, Trash2, Copy, Check, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface ApiKeyData {
  id: string
  nombre: string
  key_prefix: string
  permisos: string[]
  activa: boolean
  ultimo_uso: string | null
  usos_totales: number
  created_at: string
  expires_at: string | null
}

export default function ApiKeyManager() {
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyPermisos, setNewKeyPermisos] = useState<string[]>(['read'])
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    loadApiKeys()
  }, [])

  async function loadApiKeys() {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setApiKeys(data)
    }
    setLoading(false)
  }

  async function createApiKey() {
    if (!newKeyName.trim()) return

    setCreating(true)
    try {
      // Generar key en el cliente
      const randomBytes = new Uint8Array(32)
      crypto.getRandomValues(randomBytes)
      const randomHex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')
      const key = `aluri_${randomHex}`
      const prefix = key.substring(0, 12)

      // Generar hash SHA-256
      const encoder = new TextEncoder()
      const data = encoder.encode(key)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('api_keys')
        .insert({
          nombre: newKeyName.trim(),
          key_hash: hash,
          key_prefix: prefix,
          permisos: newKeyPermisos,
          creado_por: user?.id
        })

      if (error) {
        console.error('Error creating API key:', error)
        alert('Error al crear la API key: ' + error.message)
      } else {
        setGeneratedKey(key)
        setNewKeyName('')
        setNewKeyPermisos(['read'])
        loadApiKeys()
      }
    } catch (err) {
      console.error('Error:', err)
    }
    setCreating(false)
  }

  async function deleteApiKey(id: string, nombre: string) {
    if (!confirm(`¿Eliminar la API key "${nombre}"? Esta acción no se puede deshacer.`)) {
      return
    }

    const supabase = createClient()
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', id)

    if (!error) {
      loadApiKeys()
    }
  }

  async function toggleApiKey(id: string, activa: boolean) {
    const supabase = createClient()
    const { error } = await supabase
      .from('api_keys')
      .update({ activa: !activa })
      .eq('id', id)

    if (!error) {
      loadApiKeys()
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 2000)
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return 'Nunca'
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <section className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Key size={20} className="text-amber-400" />
          <h2 className="text-lg font-semibold text-white">API Keys</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadApiKeys}
            className="p-2 text-slate-400 hover:text-white transition-colors"
            title="Recargar"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg transition-colors text-sm"
          >
            <Plus size={16} />
            Nueva Key
          </button>
        </div>
      </div>

      {/* Generated Key Alert */}
      {generatedKey && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
          <p className="text-emerald-400 font-medium mb-2">
            API Key creada exitosamente
          </p>
          <p className="text-slate-400 text-sm mb-3">
            Copia esta key ahora. No podras verla de nuevo.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-slate-900 px-3 py-2 rounded-lg text-sm text-white font-mono break-all">
              {generatedKey}
            </code>
            <button
              onClick={() => copyToClipboard(generatedKey)}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              {copiedKey ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} className="text-white" />}
            </button>
          </div>
          <button
            onClick={() => setGeneratedKey(null)}
            className="mt-3 text-sm text-slate-400 hover:text-white"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && !generatedKey && (
        <div className="mb-6 p-4 bg-slate-900/50 rounded-xl border border-slate-700">
          <h3 className="text-white font-medium mb-3">Crear nueva API Key</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-slate-400 text-sm mb-1">Nombre</label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Ej: MCP Claude, Bot Telegram..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-2">Permisos</label>
              <div className="flex flex-wrap gap-2">
                {['read', 'write', 'admin'].map(permiso => (
                  <label key={permiso} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newKeyPermisos.includes(permiso)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewKeyPermisos([...newKeyPermisos, permiso])
                        } else {
                          setNewKeyPermisos(newKeyPermisos.filter(p => p !== permiso))
                        }
                      }}
                      className="rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
                    />
                    <span className="text-slate-300 text-sm capitalize">{permiso}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={createApiKey}
                disabled={creating || !newKeyName.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-600 text-black font-medium rounded-lg transition-colors text-sm"
              >
                {creating ? 'Creando...' : 'Crear Key'}
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Keys List */}
      {loading ? (
        <div className="text-center py-8 text-slate-400">Cargando...</div>
      ) : apiKeys.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          No hay API keys creadas. Crea una para comenzar.
        </div>
      ) : (
        <div className="space-y-3">
          {apiKeys.map(apiKey => (
            <div
              key={apiKey.id}
              className={`p-4 rounded-xl border ${
                apiKey.activa
                  ? 'bg-slate-900/50 border-slate-700'
                  : 'bg-slate-900/30 border-slate-800 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-medium">{apiKey.nombre}</h3>
                    {!apiKey.activa && (
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
                        Inactiva
                      </span>
                    )}
                  </div>
                  <code className="text-slate-500 text-sm font-mono">
                    {apiKey.key_prefix}...
                  </code>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleApiKey(apiKey.id, apiKey.activa)}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                    title={apiKey.activa ? 'Desactivar' : 'Activar'}
                  >
                    {apiKey.activa ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    onClick={() => deleteApiKey(apiKey.id, apiKey.nombre)}
                    className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-slate-500">Permisos:</span>
                  <div className="flex gap-1">
                    {apiKey.permisos.map(p => (
                      <span key={p} className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded capitalize">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-slate-500">
                  Usos: <span className="text-slate-300">{apiKey.usos_totales}</span>
                </div>
                <div className="text-slate-500">
                  Ultimo uso: <span className="text-slate-300">{formatDate(apiKey.ultimo_uso)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
