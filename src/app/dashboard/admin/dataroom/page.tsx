'use client'

import { useState, useEffect, useRef } from 'react'
import { Upload, Trash2, FileText, Loader2, FolderOpen, Maximize2, X, Download, Globe, Lock } from 'lucide-react'

interface DataroomDocument {
  name: string
  displayName: string
  url: string
  createdAt: string
  size: number
  visibility: 'publico' | 'privado'
  folder: string
}

export default function DataroomPage() {
  const [documents, setDocuments] = useState<DataroomDocument[]>([])
  const [selectedName, setSelectedName] = useState<string>('')
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null)
  const [htmlContent, setHtmlContent] = useState<string | null>(null)
  const [loadingDoc, setLoadingDoc] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [uploadVisibility, setUploadVisibility] = useState<'privado' | 'publico'>('privado')
  const [filterVisibility, setFilterVisibility] = useState<'todos' | 'publico' | 'privado'>('todos')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/dataroom')
      const data = await res.json()
      if (data.success) {
        setDocuments(data.documents)
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [])

  const filteredDocs = filterVisibility === 'todos'
    ? documents
    : documents.filter((d) => d.visibility === filterVisibility)

  const selectDocument = async (doc: DataroomDocument) => {
    setSelectedDoc(doc.name + doc.folder)
    setSelectedName(doc.displayName)
    setLoadingDoc(true)
    try {
      const filePath = `${doc.folder}/${doc.name}`
      const res = await fetch(`/api/dataroom?file=${encodeURIComponent(filePath)}`)
      const text = await res.text()
      setHtmlContent(text)
    } catch (error) {
      console.error('Error fetching document:', error)
      setHtmlContent('<p>Error al cargar el documento</p>')
    } finally {
      setLoadingDoc(false)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('visibility', uploadVisibility)

      const res = await fetch('/api/dataroom', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (data.success) {
        await fetchDocuments()
      } else {
        alert(data.error || 'Error al subir archivo')
      }
    } catch (error) {
      console.error('Error uploading:', error)
      alert('Error al subir archivo')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDownload = () => {
    if (!htmlContent || !selectedName) return

    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedName}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDelete = async (doc: DataroomDocument) => {
    if (!confirm('Eliminar este documento?')) return

    const key = doc.name + doc.folder
    setDeleting(key)
    try {
      const res = await fetch('/api/dataroom', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: doc.name, folder: doc.folder }),
      })

      const data = await res.json()
      if (data.success) {
        if (selectedDoc === key) {
          setSelectedDoc(null)
          setSelectedName('')
          setHtmlContent(null)
        }
        setDocuments((prev) => prev.filter((d) => !(d.name === doc.name && d.folder === doc.folder)))
      }
    } catch (error) {
      console.error('Error deleting:', error)
    } finally {
      setDeleting(null)
    }
  }

  const publicCount = documents.filter((d) => d.visibility === 'publico').length
  const privateCount = documents.filter((d) => d.visibility === 'privado').length

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Dataroom</h1>
          <p className="text-sm text-slate-400 mt-1">
            Documentos internos de la empresa
            <span className="ml-3 text-slate-500">
              {publicCount} publico{publicCount !== 1 ? 's' : ''} · {privateCount} privado{privateCount !== 1 ? 's' : ''}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Upload visibility toggle */}
          <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <button
              onClick={() => setUploadVisibility('privado')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                uploadVisibility === 'privado'
                  ? 'bg-slate-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Lock size={13} />
              Privado
            </button>
            <button
              onClick={() => setUploadVisibility('publico')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                uploadVisibility === 'publico'
                  ? 'bg-teal-500/20 text-teal-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe size={13} />
              Publico
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".html"
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-500/50 text-black font-medium rounded-lg transition-colors"
          >
            {uploading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload size={18} />
                Subir HTML
              </>
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 size={24} className="animate-spin mr-2" />
          Cargando documentos...
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <FolderOpen size={48} className="mb-4 opacity-50" />
          <p className="text-lg font-medium">Sin documentos</p>
          <p className="text-sm mt-1">Sube archivos HTML para comenzar</p>
        </div>
      ) : (
        <div className="flex gap-6 h-[calc(100vh-180px)]">
          {/* Document list */}
          <div className="w-80 flex-shrink-0 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
            {/* Filter tabs */}
            <div className="px-2 py-2 border-b border-slate-800 bg-slate-800/30 flex gap-1">
              {(['todos', 'publico', 'privado'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterVisibility(tab)}
                  className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    filterVisibility === tab
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab === 'todos' ? 'Todos' : tab === 'publico' ? 'Publicos' : 'Privados'}
                </button>
              ))}
            </div>
            <div className="px-4 py-2 border-b border-slate-800">
              <span className="text-xs text-slate-500">
                {filteredDocs.length} documento{filteredDocs.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800">
              {filteredDocs.map((doc) => {
                const key = doc.name + doc.folder
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors group ${
                      selectedDoc === key
                        ? 'bg-teal-500/10 border-l-2 border-teal-400'
                        : 'hover:bg-slate-800/50 border-l-2 border-transparent'
                    }`}
                    onClick={() => selectDocument(doc)}
                  >
                    <FileText
                      size={18}
                      className={selectedDoc === key ? 'text-teal-400' : 'text-slate-500'}
                    />
                    <div className="flex-1 min-w-0">
                      <span
                        className={`text-sm truncate block ${
                          selectedDoc === key ? 'text-teal-400 font-medium' : 'text-slate-300'
                        }`}
                      >
                        {doc.displayName}
                      </span>
                      <span className="flex items-center gap-1 mt-0.5">
                        {doc.visibility === 'publico' ? (
                          <Globe size={10} className="text-teal-400" />
                        ) : (
                          <Lock size={10} className="text-slate-500" />
                        )}
                        <span
                          className={`text-[10px] uppercase tracking-wider ${
                            doc.visibility === 'publico' ? 'text-teal-400' : 'text-slate-500'
                          }`}
                        >
                          {doc.visibility}
                        </span>
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(doc)
                      }}
                      disabled={deleting === key}
                      className="p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      title="Eliminar"
                    >
                      {deleting === key ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Document viewer */}
          <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
            {selectedDoc ? (
              <>
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-800/30">
                  <span className="text-sm text-white font-medium">{selectedName}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleDownload}
                      className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-slate-700 rounded-lg transition-colors"
                      title="Descargar HTML"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={() => setFullscreen(true)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                      title="Pantalla completa"
                    >
                      <Maximize2 size={16} />
                    </button>
                  </div>
                </div>
                {loadingDoc ? (
                  <div className="flex-1 flex items-center justify-center text-slate-400">
                    <Loader2 size={24} className="animate-spin mr-2" />
                    Cargando...
                  </div>
                ) : (
                  <iframe
                    srcDoc={htmlContent || ''}
                    className="flex-1 w-full bg-white"
                    title={selectedName}
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  />
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <FileText size={48} className="mx-auto mb-4 opacity-30" />
                  <p className="text-sm">Selecciona un documento para visualizarlo</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen overlay */}
      {fullscreen && htmlContent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col">
          <div className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-700">
            <span className="text-sm text-white font-medium">{selectedName}</span>
            <button
              onClick={() => setFullscreen(false)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <iframe
            srcDoc={htmlContent}
            className="flex-1 w-full bg-white"
            title={selectedName}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        </div>
      )}
    </div>
  )
}
