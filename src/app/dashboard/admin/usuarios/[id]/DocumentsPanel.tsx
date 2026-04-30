'use client'

import { useState, useTransition, useRef } from 'react'
import { FileText, Upload, Eye, Trash2, FileWarning, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { uploadUserDocument, getDocumentSignedUrl, deleteUserDocument, UserDocumentRow } from './actions'
import { getDocumentTypesForRole, DocumentTypeDef } from '@/lib/usuarios/document-types'

interface DocumentsPanelProps {
  userId: string
  role: string
  documents: UserDocumentRow[]
}

export default function DocumentsPanel({ userId, role, documents }: DocumentsPanelProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [actingTipo, setActingTipo] = useState<string | null>(null)
  const [openingDocId, setOpeningDocId] = useState<string | null>(null)
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null)

  const docTypes = getDocumentTypesForRole(role)

  const docsByTipo: Record<string, UserDocumentRow[]> = {}
  documents.forEach(d => {
    if (!docsByTipo[d.tipo]) docsByTipo[d.tipo] = []
    docsByTipo[d.tipo].push(d)
  })

  // Documentos sin tipo conocido (legacy o de un rol distinto)
  const knownTipos = new Set(docTypes.map(d => d.key))
  const unknownDocs = documents.filter(d => !knownTipos.has(d.tipo))

  const handleUpload = async (tipo: string, file: File) => {
    setError(null)
    setActingTipo(tipo)
    const fd = new FormData()
    fd.append('user_id', userId)
    fd.append('tipo', tipo)
    fd.append('file', file)

    startTransition(async () => {
      const result = await uploadUserDocument(fd)
      if (!result.ok) setError(result.error || 'Error al subir')
      setActingTipo(null)
      router.refresh()
    })
  }

  const handleView = async (docId: string) => {
    setError(null)
    setOpeningDocId(docId)
    const { url, error: errMsg } = await getDocumentSignedUrl(docId)
    setOpeningDocId(null)
    if (!url) {
      setError(errMsg || 'No se pudo abrir el documento')
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleDelete = async (docId: string) => {
    if (!confirm('Eliminar este documento? Esta accion no se puede deshacer.')) return
    setError(null)
    setDeletingDocId(docId)
    startTransition(async () => {
      const result = await deleteUserDocument(docId)
      if (!result.ok) setError(result.error || 'Error al eliminar')
      setDeletingDocId(null)
      router.refresh()
    })
  }

  if (docTypes.length === 0 && unknownDocs.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
        <FileText size={36} className="mx-auto text-slate-700 mb-3" />
        <p className="text-slate-400">Este rol no requiere documentos.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400 flex items-center gap-2">
          <FileWarning size={16} />
          {error}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-2">
          <FileText size={18} className="text-teal-400" />
          <h3 className="font-semibold text-white">Documentos</h3>
          <span className="ml-auto text-xs text-slate-500">{documents.length} archivo(s)</span>
        </div>
        <div className="divide-y divide-slate-800">
          {docTypes.map(def => (
            <DocumentTypeRow
              key={def.key}
              def={def}
              docs={docsByTipo[def.key] || []}
              isUploading={isPending && actingTipo === def.key}
              openingDocId={openingDocId}
              deletingDocId={deletingDocId}
              onUpload={(file) => handleUpload(def.key, file)}
              onView={handleView}
              onDelete={handleDelete}
            />
          ))}

          {unknownDocs.length > 0 && (
            <div className="p-6 bg-slate-900/50">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Otros documentos</p>
              <div className="space-y-2">
                {unknownDocs.map(doc => (
                  <DocumentFileItem
                    key={doc.id}
                    doc={doc}
                    label={doc.tipo}
                    isOpening={openingDocId === doc.id}
                    isDeleting={deletingDocId === doc.id}
                    onView={() => handleView(doc.id)}
                    onDelete={() => handleDelete(doc.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface DocumentTypeRowProps {
  def: DocumentTypeDef
  docs: UserDocumentRow[]
  isUploading: boolean
  openingDocId: string | null
  deletingDocId: string | null
  onUpload: (file: File) => void
  onView: (docId: string) => void
  onDelete: (docId: string) => void
}

function DocumentTypeRow({ def, docs, isUploading, openingDocId, deletingDocId, onUpload, onView, onDelete }: DocumentTypeRowProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hasFiles = docs.length > 0

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onUpload(file)
    e.target.value = '' // permite re-seleccionar el mismo archivo
  }

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-white">{def.label}</h4>
            {hasFiles ? (
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {docs.length}
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700">
                Sin cargar
              </span>
            )}
          </div>
          {def.description && (
            <p className="text-xs text-slate-500">{def.description}</p>
          )}
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shrink-0"
        >
          {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {isUploading ? 'Subiendo...' : 'Subir'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
          onChange={handleFileChange}
        />
      </div>

      {hasFiles && (
        <div className="space-y-2 mt-3">
          {docs.map(doc => (
            <DocumentFileItem
              key={doc.id}
              doc={doc}
              isOpening={openingDocId === doc.id}
              isDeleting={deletingDocId === doc.id}
              onView={() => onView(doc.id)}
              onDelete={() => onDelete(doc.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface DocumentFileItemProps {
  doc: UserDocumentRow
  label?: string
  isOpening: boolean
  isDeleting: boolean
  onView: () => void
  onDelete: () => void
}

function DocumentFileItem({ doc, label, isOpening, isDeleting, onView, onDelete }: DocumentFileItemProps) {
  const formatSize = (bytes: number | null) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  const formatDate = (s: string) => new Date(s).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <FileText size={18} className="text-slate-400 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm text-white truncate">{label || doc.file_name}</p>
          <p className="text-xs text-slate-500">
            {formatDate(doc.uploaded_at)}
            {doc.file_size ? ` · ${formatSize(doc.file_size)}` : ''}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onView}
          disabled={isOpening}
          title="Ver / Descargar"
          className="p-2 rounded-lg border border-teal-500/30 text-teal-400 hover:bg-teal-500/10 transition-colors disabled:opacity-50"
        >
          {isOpening ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
        </button>
        <button
          onClick={onDelete}
          disabled={isDeleting}
          title="Eliminar"
          className="p-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
        >
          {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      </div>
    </div>
  )
}
